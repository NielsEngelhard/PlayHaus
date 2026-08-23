package api

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func listQuizzes(t *testing.T, h http.Handler, token, query string) quizListResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, quizListPath(query), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("list %q: status = %d, want %d (body: %s)", query, rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[quizListResponse](t, rec)
}

func TestListQuizzesFiltersByLocale(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	// A quiz is written for one language, so a list that mixed them would be
	// offering most people questions they cannot play.
	for _, locale := range []string{"en", "nl"} {
		list := listQuizzes(t, h, session.Token, "locale="+locale)
		if len(list.Items) == 0 {
			t.Fatalf("locale %q returned nothing", locale)
		}
		for _, item := range list.Items {
			if item.Locale != locale {
				t.Errorf("locale %q returned a %q quiz (%s)", locale, item.Locale, item.Slug)
			}
		}
	}
}

func TestListQuizzesFiltersByCategory(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	weekly := listQuizzes(t, h, session.Token, "locale=nl&category=weekly")
	if len(weekly.Items) == 0 {
		t.Fatal("no weekly quizzes came back")
	}
	for _, item := range weekly.Items {
		if item.Category != string(pubquizr.CategoryWeekly) {
			t.Errorf("category = %q, want %q", item.Category, pubquizr.CategoryWeekly)
		}
		if item.WeekOf == "" {
			t.Errorf("weekly quiz %q came back without the week it belongs to", item.Slug)
		}
	}

	official := listQuizzes(t, h, session.Token, "locale=nl&category=official")
	for _, item := range official.Items {
		if item.Category != string(pubquizr.CategoryOfficial) {
			t.Errorf("category = %q, want %q", item.Category, pubquizr.CategoryOfficial)
		}
	}

	// No category is every shelf, so it cannot be smaller than one of them.
	all := listQuizzes(t, h, session.Token, "locale=nl")
	if all.Total < weekly.Total+official.Total {
		t.Errorf("total without a category = %d, want at least %d", all.Total, weekly.Total+official.Total)
	}
}

func TestListQuizzesSendsSummariesWithoutContent(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	list := listQuizzes(t, h, session.Token, "locale=en")
	for _, item := range list.Items {
		if item.Title == "" {
			t.Errorf("quiz %q came back without a title", item.Slug)
		}
		// The count is the one thing a card still needs to know about the content.
		if item.QuestionCount == 0 {
			t.Errorf("quiz %q reports no questions", item.Slug)
		}
	}
}

// insertQuizzes writes n bare quizzes, enough to page over. They carry no questions:
// paging is about rows on a shelf, not about what is inside them.
func insertQuizzes(t *testing.T, db *gorm.DB, n int) {
	t.Helper()

	now := time.Now().UTC()
	for i := range n {
		// Spaced apart so the ordering is deterministic rather than however SQLite
		// felt about a tie.
		published := now.Add(time.Duration(-i) * time.Hour)
		quiz := &pubquizr.Quiz{
			ID:          uuid.New(),
			Slug:        fmt.Sprintf("paging-%02d", i),
			Locale:      i18n.EN,
			Category:    pubquizr.CategoryOfficial,
			Title:       fmt.Sprintf("Paging quiz %d", i),
			Description: "",
			Status:      pubquizr.QuizPublished,
			PublishedAt: &published,
			Seeded:      false,
			CreatedAt:   published,
			UpdatedAt:   published,
		}
		if err := db.Create(quiz).Error; err != nil {
			t.Fatalf("insert quiz %d: %v", i, err)
		}
	}
}

func TestListQuizzesPages(t *testing.T) {
	h, db := newQuizServer(t)
	session := newGuestSession(t, h)

	insertQuizzes(t, db, 25)

	first := listQuizzes(t, h, session.Token, "locale=en&pageSize=10&page=1")
	if got, want := len(first.Items), 10; got != want {
		t.Fatalf("page 1 items = %d, want %d", got, want)
	}
	if first.Page != 1 || first.PageSize != 10 {
		t.Errorf("page/pageSize = %d/%d, want 1/10", first.Page, first.PageSize)
	}
	if !first.HasMore {
		t.Errorf("hasMore = false with %d of %d shown", len(first.Items), first.Total)
	}

	second := listQuizzes(t, h, session.Token, "locale=en&pageSize=10&page=2")
	if got, want := len(second.Items), 10; got != want {
		t.Fatalf("page 2 items = %d, want %d", got, want)
	}

	// Page 2 must not repeat page 1 -- that is what the stable tiebreak in the
	// ordering is for.
	seen := map[string]bool{}
	for _, item := range first.Items {
		seen[item.ID] = true
	}
	for _, item := range second.Items {
		if seen[item.ID] {
			t.Errorf("quiz %q appeared on both pages", item.Slug)
		}
	}

	// The last page runs out, and says so.
	last := listQuizzes(t, h, session.Token, fmt.Sprintf("locale=en&pageSize=10&page=%d", (first.Total+9)/10))
	if last.HasMore {
		t.Errorf("hasMore = true on the last page (total %d)", last.Total)
	}
}

// TestListQuizzesClampsThePageSize -- asking for a thousand quizzes is a client
// being optimistic, not a client being wrong, so it is pulled into range rather
// than refused.
func TestListQuizzesClampsThePageSize(t *testing.T) {
	h, db := newQuizServer(t)
	session := newGuestSession(t, h)

	insertQuizzes(t, db, 60)

	list := listQuizzes(t, h, session.Token, "locale=en&pageSize=1000")
	if got, want := list.PageSize, pubquizr.MaxPageSize; got != want {
		t.Errorf("pageSize = %d, want %d", got, want)
	}
	if len(list.Items) > pubquizr.MaxPageSize {
		t.Errorf("items = %d, want at most %d", len(list.Items), pubquizr.MaxPageSize)
	}

	// And a page nobody could mean falls back rather than failing.
	fallback := listQuizzes(t, h, session.Token, "locale=en&page=nonsense&pageSize=nonsense")
	if fallback.Page != 1 || fallback.PageSize != pubquizr.DefaultPageSize {
		t.Errorf("page/pageSize = %d/%d, want 1/%d", fallback.Page, fallback.PageSize, pubquizr.DefaultPageSize)
	}
}

func TestListQuizzesRequiresAuth(t *testing.T) {
	h, _ := newQuizServer(t)

	rec := do(t, h, http.MethodGet, quizListPath(""), "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

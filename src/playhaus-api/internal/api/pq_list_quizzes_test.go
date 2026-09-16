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

// allQuizzes walks a shelf page by page until it says there is no more.
func allQuizzes(t *testing.T, h http.Handler, token, query string) []quizSummaryResponse {
	t.Helper()

	var items []quizSummaryResponse
	for page := 1; ; page++ {
		list := listQuizzes(t, h, token, fmt.Sprintf("%s&pageSize=%d&page=%d", query, pubquizr.MaxPageSize, page))
		items = append(items, list.Items...)
		if !list.HasMore {
			return items
		}
		if page > 100 {
			t.Fatalf("%q still has more after %d pages", query, page)
		}
	}
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
	}

	official := listQuizzes(t, h, session.Token, "locale=nl&category=official")
	for _, item := range official.Items {
		if item.Category != string(pubquizr.CategoryOfficial) {
			t.Errorf("category = %q, want %q", item.Category, pubquizr.CategoryOfficial)
		}
	}

	// No category is every shelf, so everything on either one turns up in it.
	all := map[string]bool{}
	for _, item := range allQuizzes(t, h, session.Token, "locale=nl") {
		all[item.ID] = true
	}
	for _, shelf := range []string{"weekly", "official"} {
		for _, item := range allQuizzes(t, h, session.Token, "locale=nl&category="+shelf) {
			if !all[item.ID] {
				t.Errorf("%s quiz %q is missing without a category", shelf, item.Slug)
			}
		}
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
	}
}

func TestListQuizzesTeasesEachQuizWithItsFirstQuestion(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	list := listQuizzes(t, h, session.Token, "locale=nl&category=official")
	if len(list.Items) == 0 {
		t.Fatal("no official quizzes came back")
	}
	for _, item := range list.Items {
		if item.Teaser == "" {
			t.Errorf("quiz %q came back without a teaser", item.Slug)
		}
	}

	first := list.Items[0]
	rec := do(t, h, http.MethodGet, quizPath(first.ID), "", session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get quiz: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	quiz := decodeBody[quizResponse](t, rec)
	if len(quiz.Rounds) == 0 || len(quiz.Rounds[0].Questions) == 0 {
		t.Fatalf("quiz %q has no questions", first.Slug)
	}
	if want := quiz.Rounds[0].Questions[0].Prompt; first.Teaser != want {
		t.Errorf("teaser = %q, want the first question %q", first.Teaser, want)
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
			PublishedAt: &published,
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
		t.Error("hasMore = false on page 1 of at least 25")
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

	// Walked to the end, the shelf runs out, says so, and has nothing past it.
	page, seenAll := 1, 0
	for {
		list := listQuizzes(t, h, session.Token, fmt.Sprintf("locale=en&pageSize=10&page=%d", page))
		seenAll += len(list.Items)
		if !list.HasMore {
			break
		}
		page++
		if page > 100 {
			t.Fatal("hasMore never turned false")
		}
	}
	if seenAll < 25 {
		t.Errorf("walked %d quizzes, want at least 25", seenAll)
	}
	past := listQuizzes(t, h, session.Token, fmt.Sprintf("locale=en&pageSize=10&page=%d", page+1))
	if len(past.Items) != 0 || past.HasMore {
		t.Errorf("page past the end = %d items, hasMore %v; want none", len(past.Items), past.HasMore)
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

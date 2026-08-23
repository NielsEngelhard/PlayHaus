package api

import (
	"context"
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"

	"gorm.io/gorm"
)

func quizPath(quizID string) string { return "/api/v1/pubquizr/quizzes/" + quizID }
func quizListPath(query string) string {
	if query == "" {
		return "/api/v1/pubquizr/quizzes"
	}
	return "/api/v1/pubquizr/quizzes?" + query
}

// newQuizServer is newTestServerWithDB plus the quizzes that ship with the app.
// The seeded content is the same content the game is played on, so the tests are
// asserting against real quizzes rather than fixtures that could drift from them.
func newQuizServer(t *testing.T) (http.Handler, *gorm.DB) {
	t.Helper()

	h, db := newTestServerWithDB(t)
	if err := pubquizr.Seed(context.Background(), pubquizr.NewGormStore(db)); err != nil {
		t.Fatalf("seed quizzes: %v", err)
	}
	return h, db
}

// aQuiz is one seeded quiz to test against, found the way the app finds one.
func aQuiz(t *testing.T, h http.Handler, token, query string) quizSummaryResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, quizListPath(query), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("list quizzes: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	list := decodeBody[quizListResponse](t, rec)
	if len(list.Items) == 0 {
		t.Fatalf("no seeded quizzes matched %q", query)
	}
	return list.Items[0]
}

func TestGetQuizAnswersTheWholeQuiz(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	summary := aQuiz(t, h, session.Token, "locale=en")

	rec := do(t, h, http.MethodGet, quizPath(summary.ID), "", session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	quiz := decodeBody[quizResponse](t, rec)
	if quiz.ID != summary.ID {
		t.Errorf("id = %q, want %q", quiz.ID, summary.ID)
	}
	if got, want := len(quiz.Rounds), pubquizr.Rounds; got != want {
		t.Fatalf("rounds = %d, want %d", got, want)
	}

	for i, round := range quiz.Rounds {
		if got, want := round.Round, i+1; got != want {
			t.Errorf("rounds[%d].round = %d, want %d", i, got, want)
		}
		if got, want := round.Kind, string(pubquizr.KindOf(round.Round)); got != want {
			t.Errorf("round %d kind = %q, want %q", round.Round, got, want)
		}
		if len(round.Questions) < pubquizr.MinQuestionsIn(round.Round) {
			t.Errorf("round %d has %d questions, want at least %d",
				round.Round, len(round.Questions), pubquizr.MinQuestionsIn(round.Round))
		}
	}
}

// TestGetQuizSendsTheAnswers is the whole point of the endpoint: this is the quiz
// master's own phone, and they are about to read the answers out loud.
func TestGetQuizSendsTheAnswers(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	summary := aQuiz(t, h, session.Token, "locale=en")
	quiz := decodeBody[quizResponse](t, do(t, h, http.MethodGet, quizPath(summary.ID), "", session.Token))

	byRound := map[int]quizRoundResponse{}
	for _, round := range quiz.Rounds {
		byRound[round.Round] = round
	}

	// Round 1 is asked out loud, so every question carries the answer.
	for _, question := range byRound[pubquizr.RoundOpen].Questions {
		if len(question.Answers) == 0 {
			t.Fatalf("round 1 question %q came back with no answer", question.Prompt)
		}
	}

	// Round 2 carries four options with exactly one of them marked.
	for _, question := range byRound[pubquizr.RoundChoice].Questions {
		if got, want := len(question.Answers), pubquizr.ChoiceOptions; got != want {
			t.Fatalf("round 2 question %q has %d options, want %d", question.Prompt, got, want)
		}
		correct := 0
		for _, answer := range question.Answers {
			if answer.Correct {
				correct++
			}
		}
		if correct != 1 {
			t.Errorf("round 2 question %q has %d correct options, want 1", question.Prompt, correct)
		}
	}

	// Round 3 is a number, not an answer row.
	for _, question := range byRound[pubquizr.RoundClosest].Questions {
		if question.NumericAnswer == nil {
			t.Errorf("round 3 question %q came back without a number", question.Prompt)
		}
	}

	// Round 4 is a word to act out. There is nothing to answer.
	for _, question := range byRound[pubquizr.RoundDescribe].Questions {
		if len(question.Answers) != 0 {
			t.Errorf("round 4 word %q came back with answers", question.Prompt)
		}
	}

	// Round 5 is four answers to find between you.
	for _, question := range byRound[pubquizr.RoundList].Questions {
		found := 0
		for _, answer := range question.Answers {
			if answer.Correct && !answer.Alias {
				found++
			}
		}
		if got, want := found, pubquizr.ListAnswersPerQuestion; got != want {
			t.Errorf("round 5 question %q has %d answers, want %d", question.Prompt, got, want)
		}
	}
}

func TestGetQuizAnswersNotFoundForAnUnknownID(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	for _, id := range []string{
		"11111111-1111-1111-1111-111111111111", // well-formed, nothing behind it
		"not-a-uuid",                           // not an id at all
	} {
		rec := do(t, h, http.MethodGet, quizPath(id), "", session.Token)
		if rec.Code != http.StatusNotFound {
			t.Errorf("get %q: status = %d, want %d (body: %s)", id, rec.Code, http.StatusNotFound, rec.Body)
		}
	}
}

// TestGetQuizHidesADraft matters for the weekly quiz: what goes up on Wednesday
// should not be readable on Tuesday.
func TestGetQuizHidesADraft(t *testing.T) {
	h, db := newQuizServer(t)
	session := newGuestSession(t, h)

	summary := aQuiz(t, h, session.Token, "locale=en")
	err := db.Model(&pubquizr.Quiz{}).
		Where("id = ?", summary.ID).
		Update("status", pubquizr.QuizDraft).Error
	if err != nil {
		t.Fatalf("unpublish quiz: %v", err)
	}

	rec := do(t, h, http.MethodGet, quizPath(summary.ID), "", session.Token)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

func TestGetQuizRequiresAuth(t *testing.T) {
	h, _ := newQuizServer(t)

	rec := do(t, h, http.MethodGet, quizPath("11111111-1111-1111-1111-111111111111"), "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

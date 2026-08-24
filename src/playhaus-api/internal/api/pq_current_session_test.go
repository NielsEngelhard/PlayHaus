package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"

	"gorm.io/gorm"
)

// A table plays one evening at a time. Starting a quiz throws away whatever was still
// open, and the setup screen asks about a running game before it does -- which is what
// /current is for. The two rules are one rule seen from either side, so they are
// tested together.

const currentSingleDevicePath = singleDevicePath + "/current"

func verdictBody(t *testing.T, sessionQuestionID string, correct bool) string {
	t.Helper()

	body, err := json.Marshal(openVerdictRequest{
		SessionQuestionID: sessionQuestionID,
		Correct:           correct,
	})
	if err != nil {
		t.Fatalf("marshal verdict: %v", err)
	}
	return string(body)
}

// sessionRows is what the database actually holds, which is the half of "the old game
// is gone" that a 404 cannot show: a session deleted with its table and its deal left
// behind would answer 404 just as convincingly.
func sessionRows(t *testing.T, db *gorm.DB) (sessions, players, questions, answers int64) {
	t.Helper()

	for _, row := range []struct {
		model any
		into  *int64
	}{
		{&pubquizr.Session{}, &sessions},
		{&pubquizr.SessionPlayer{}, &players},
		{&pubquizr.SessionQuestion{}, &questions},
		{&pubquizr.SessionAnswer{}, &answers},
	} {
		if err := db.Model(row.model).Count(row.into).Error; err != nil {
			t.Fatalf("count rows: %v", err)
		}
	}

	return sessions, players, questions, answers
}

// currentQuizSession is the running game as the setup screen asks for it, or nil where
// the server said there is none.
func currentQuizSession(t *testing.T, h http.Handler, token string) *quizSessionResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, currentSingleDevicePath, "", token)
	switch rec.Code {
	case http.StatusNoContent:
		return nil
	case http.StatusOK:
		session := decodeBody[quizSessionResponse](t, rec)
		return &session
	default:
		t.Fatalf("current session: status = %d (body: %s)", rec.Code, rec.Body)
		return nil
	}
}

func TestStartSingleDeviceQuizThrowsAwayTheRunningOne(t *testing.T) {
	h, db := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	first := startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	// Played a little, so the evening that gets thrown away has attempt rows to
	// leave behind as well as a table and a deal.
	opening := questionsIn(first, pubquizr.RoundOpen)[0]
	rec := do(t, h, http.MethodPost, singleDeviceSessionPath(first.ID)+"/verdict",
		verdictBody(t, opening.ID, true), session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("verdict: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	second := startedQuiz(t, h, session.Token, quiz.ID, "Eva", "Joris", "Puck")
	if second.ID == first.ID {
		t.Fatal("the second start handed back the first session")
	}

	// Gone rather than abandoned: there is nothing left to read back.
	rec = do(t, h, http.MethodGet, singleDeviceSessionPath(first.ID), "", session.Token)
	if rec.Code != http.StatusNotFound {
		t.Errorf("get replaced session: status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}

	sessions, players, questions, answers := sessionRows(t, db)
	if sessions != 1 {
		t.Errorf("sessions in the database = %d, want 1", sessions)
	}
	if got, want := players, int64(len(second.Players)); got != want {
		t.Errorf("player rows = %d, want %d -- the replaced table outlived its game", got, want)
	}
	if got, want := questions, int64(len(second.Questions)); got != want {
		t.Errorf("dealt question rows = %d, want %d -- the replaced deal outlived its game", got, want)
	}
	if answers != 0 {
		t.Errorf("attempt rows = %d, want 0 -- the replaced game's answers outlived it", answers)
	}

	// And the one that survived is the one the table is sitting at.
	if got := currentQuizSession(t, h, session.Token); got == nil || got.ID != second.ID {
		t.Errorf("current session = %v, want %q", got, second.ID)
	}
}

// Somebody else's evening is not "another game": two players may each hold one.
func TestStartSingleDeviceQuizLeavesOtherPlayersGamesAlone(t *testing.T) {
	h, _ := newQuizServer(t)
	mine := newGuestSession(t, h)
	theirs := newGuestSession(t, h)
	quiz := aQuiz(t, h, mine.Token, "locale=nl")

	other := startedQuiz(t, h, theirs.Token, quiz.ID, tableOf(3)...)
	startedQuiz(t, h, mine.Token, quiz.ID, tableOf(4)...)

	rec := do(t, h, http.MethodGet, singleDeviceSessionPath(other.ID), "", theirs.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("their session: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
}

func TestCurrentSingleDeviceSessionIsWhatYouLeftRunning(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	started := startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	current := currentQuizSession(t, h, session.Token)
	if current == nil {
		t.Fatal("no current session, want the one that was just started")
	}
	if current.ID != started.ID {
		t.Errorf("current session = %q, want %q", current.ID, started.ID)
	}
	// The whole session, not a stub: the screen that asks this has to be able to say
	// what it is offering to throw away.
	if got, want := len(current.Players), len(started.Players); got != want {
		t.Errorf("players = %d, want %d", got, want)
	}
	if got, want := len(current.Questions), len(started.Questions); got != want {
		t.Errorf("dealt questions = %d, want %d", got, want)
	}
}

func TestCurrentSingleDeviceSessionIsEmptyWithNoGame(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	rec := do(t, h, http.MethodGet, currentSingleDevicePath, "", session.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
	if rec.Body.Len() != 0 {
		t.Errorf("body = %s, want empty", rec.Body)
	}
}

// Somebody else's game is not one this player can be asked about.
func TestCurrentSingleDeviceSessionIsOnlyYourOwn(t *testing.T) {
	h, _ := newQuizServer(t)
	mine := newGuestSession(t, h)
	theirs := newGuestSession(t, h)
	quiz := aQuiz(t, h, theirs.Token, "locale=nl")

	startedQuiz(t, h, theirs.Token, quiz.ID, tableOf(3)...)

	rec := do(t, h, http.MethodGet, currentSingleDevicePath, "", mine.Token)
	if rec.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

func TestCurrentSingleDeviceSessionRequiresAuth(t *testing.T) {
	h, _ := newQuizServer(t)

	rec := do(t, h, http.MethodGet, currentSingleDevicePath, "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestDeleteSingleDeviceSessionThrowsItAway(t *testing.T) {
	h, db := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	started := startedQuiz(t, h, session.Token, quiz.ID, tableOf(3)...)

	rec := do(t, h, http.MethodDelete, singleDeviceSessionPath(started.ID), "", session.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	rec = do(t, h, http.MethodGet, singleDeviceSessionPath(started.ID), "", session.Token)
	if rec.Code != http.StatusNotFound {
		t.Errorf("get discarded session: status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}

	if current := currentQuizSession(t, h, session.Token); current != nil {
		t.Errorf("current session = %q, want none", current.ID)
	}

	sessions, players, questions, answers := sessionRows(t, db)
	if sessions+players+questions+answers != 0 {
		t.Errorf("rows left behind: %d sessions, %d players, %d questions, %d answers",
			sessions, players, questions, answers)
	}
}

// Discarding somebody else's session is a no-op rather than a refusal -- owning it is
// the whole of the permission model -- but it must not touch their game.
func TestDeleteSingleDeviceSessionLeavesSomebodyElsesAlone(t *testing.T) {
	h, _ := newQuizServer(t)
	mine := newGuestSession(t, h)
	theirs := newGuestSession(t, h)
	quiz := aQuiz(t, h, theirs.Token, "locale=nl")

	other := startedQuiz(t, h, theirs.Token, quiz.ID, tableOf(3)...)

	rec := do(t, h, http.MethodDelete, singleDeviceSessionPath(other.ID), "", mine.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	rec = do(t, h, http.MethodGet, singleDeviceSessionPath(other.ID), "", theirs.Token)
	if rec.Code != http.StatusOK {
		t.Errorf("their session: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
}

func TestDeleteSingleDeviceSessionRequiresAuth(t *testing.T) {
	h, _ := newQuizServer(t)

	rec := do(t, h, http.MethodDelete, singleDeviceSessionPath("11111111-1111-1111-1111-111111111111"), "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

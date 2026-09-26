package api

import (
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"
)

func TestAStreakCapReachesTheWireAndMovesTheSeat(t *testing.T) {
	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedQuiz(t, h, guest.Token, quiz.ID, tableOf(4)...)
	capped := *session.AnsweringSeat

	for turn := 1; turn <= pubquizr.MaxHotSeatRun; turn++ {
		rec := do(t, h, http.MethodPost, verdictPath(session.ID), verdictBody(t, session), guest.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("turn %d: status = %d (body: %s)", turn, rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)

		if turn < pubquizr.MaxHotSeatRun && session.StreakEndedSeat != nil {
			t.Fatalf("turn %d: streakEndedSeat = %d, want null", turn, *session.StreakEndedSeat)
		}
	}

	if got := session.StreakEndedSeat; got == nil || *got != capped {
		t.Fatalf("streakEndedSeat = %v, want %d", got, capped)
	}
	if got, want := *session.AnsweringSeat, (capped+1)%4; got != want {
		t.Errorf("answeringSeat = %d, want %d -- the next player is asked", got, want)
	}
	if got, want := session.QuizMasterSeat, capped; got != want {
		t.Errorf("quizMasterSeat = %d, want %d", got, want)
	}

	// Read back rather than trusted from the verdict's own response.
	rec := do(t, h, http.MethodGet, singleDeviceSessionPath(session.ID), "", guest.Token)
	if got := decodeBody[quizSessionResponse](t, rec).StreakEndedSeat; got == nil || *got != capped {
		t.Errorf("stored streakEndedSeat = %v, want %d", got, capped)
	}
}

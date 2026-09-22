package api

import (
	"fmt"
	"net/http"
	"slices"
	"testing"

	"gorm.io/gorm"

	"playhaus-api/internal/pubquizr"
)

func finalistsPath(sessionID string) string {
	return singleDeviceSessionPath(sessionID) + "/finalists"
}

// intoATiedFinale rewinds a session to where round 6 would have left it on this scoreboard: in the finale, nobody seated yet.
func intoATiedFinale(t *testing.T, db *gorm.DB, sessionID string, master int, scores ...int) {
	t.Helper()

	err := db.Exec(`UPDATE pq_sessions SET current_round = ?, current_position = 0, hot_seat = 0,
		quiz_master_seat = ?, finalist_seat_a = -1, finalist_seat_b = -1 WHERE id = ?`,
		pubquizr.RoundFinale, master, sessionID).Error
	if err != nil {
		t.Fatalf("rewind session: %v", err)
	}

	for seat, score := range scores {
		err := db.Exec(`UPDATE pq_session_players SET score = ? WHERE session_id = ? AND seat = ?`,
			score, sessionID, seat).Error
		if err != nil {
			t.Fatalf("set score: %v", err)
		}
	}
}

// aTiedFinale is a single device evening sat on a finale whose places are still to be played for.
func aTiedFinale(t *testing.T, scores ...int) (http.Handler, string, quizSessionResponse) {
	t.Helper()

	h, db := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedQuiz(t, h, guest.Token, quiz.ID, tableOf(len(scores))...)
	intoATiedFinale(t, db, session.ID, len(scores)-1, scores...)

	rec := do(t, h, http.MethodGet, singleDeviceSessionPath(session.ID), "", guest.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("read session: status = %d (body: %s)", rec.Code, rec.Body)
	}

	return h, guest.Token, decodeBody[quizSessionResponse](t, rec)
}

func TestFinaleWaitsForATieToBeBroken(t *testing.T) {
	h, token, session := aTiedFinale(t, 10, 5, 5, 0)

	if session.FinaleTie == nil {
		t.Fatal("finaleTie = null, want the tie on 5")
	}
	if !slices.Equal(session.FinaleTie.Seats, []int{1, 2}) || !slices.Equal(session.FinaleTie.Through, []int{0}) || session.FinaleTie.Places != 1 {
		t.Errorf("finaleTie = %+v, want seats [1 2], through [0], places 1", *session.FinaleTie)
	}
	if session.FinalistSeats != nil {
		t.Errorf("finalistSeats = %v, want null", session.FinalistSeats)
	}
	if session.AnsweringSeat != nil {
		t.Errorf("answeringSeat = %d, want null -- nobody is being asked yet", *session.AnsweringSeat)
	}

	seat := 0
	rec := do(t, h, http.MethodPost, finalePath(session.ID), settledBody(t, session.TurnQuestionIDs[0], nil, &seat), token)
	if rec.Code != http.StatusConflict {
		t.Errorf("finale verdict before the tie: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
}

func TestTieBreakWinnerPlaysTheLeader(t *testing.T) {
	h, token, session := aTiedFinale(t, 10, 5, 5, 0)

	rec := do(t, h, http.MethodPost, finalistsPath(session.ID), `{"seats":[2]}`, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("choose finalists: status = %d (body: %s)", rec.Code, rec.Body)
	}
	session = decodeBody[quizSessionResponse](t, rec)

	if session.FinaleTie != nil {
		t.Errorf("finaleTie = %+v, want null once it is broken", *session.FinaleTie)
	}
	if !slices.Equal(session.FinalistSeats, []int{0, 2}) {
		t.Errorf("finalistSeats = %v, want [0 2]", session.FinalistSeats)
	}
	if got, want := session.QuizMasterSeat, 1; got != want {
		t.Errorf("quizMasterSeat = %d, want %d -- the loser of the draw reads", got, want)
	}
	if session.AnsweringSeat == nil || *session.AnsweringSeat != 2 {
		t.Errorf("answeringSeat = %v, want 2 -- the finalist behind opens", session.AnsweringSeat)
	}

	rec = do(t, h, http.MethodPost, finalistsPath(session.ID), `{"seats":[1]}`, token)
	if rec.Code != http.StatusConflict {
		t.Errorf("choose finalists twice: status = %d, want %d", rec.Code, http.StatusConflict)
	}
}

func TestEveryoneTiedPicksTwo(t *testing.T) {
	h, token, session := aTiedFinale(t, 0, 0, 0)

	if session.FinaleTie == nil || session.FinaleTie.Places != 2 || len(session.FinaleTie.Through) != 0 {
		t.Fatalf("finaleTie = %+v, want everybody tied for two places", session.FinaleTie)
	}

	rec := do(t, h, http.MethodPost, finalistsPath(session.ID), `{"seats":[1,2]}`, token)
	if rec.Code != http.StatusOK {
		t.Fatalf("choose finalists: status = %d (body: %s)", rec.Code, rec.Body)
	}
	session = decodeBody[quizSessionResponse](t, rec)

	if !slices.Equal(session.FinalistSeats, []int{1, 2}) {
		t.Errorf("finalistSeats = %v, want [1 2]", session.FinalistSeats)
	}
	if got, want := session.QuizMasterSeat, 0; got != want {
		t.Errorf("quizMasterSeat = %d, want %d", got, want)
	}
}

func TestTieBreakRejectsSeatsNotInTheTie(t *testing.T) {
	h, token, session := aTiedFinale(t, 10, 5, 5, 0)

	for _, body := range []string{`{"seats":[0]}`, `{"seats":[3]}`, `{"seats":[1,2]}`, `{"seats":[7]}`} {
		rec := do(t, h, http.MethodPost, finalistsPath(session.ID), body, token)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: status = %d, want %d (body: %s)", body, rec.Code, http.StatusUnprocessableEntity, rec.Body)
		}
	}

	rec := do(t, h, http.MethodPost, finalistsPath(session.ID), `{"seats":[]}`, token)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("no seats: status = %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}
}

func TestTieBreakIsTheQuizmastersPhoneAtAMultiDeviceTable(t *testing.T) {
	h, db := newQuizServer(t)
	host := newGuestSession(t, h)
	quiz := aQuiz(t, h, host.Token, "locale=nl")

	rec := do(t, h, http.MethodPost, pqLobbiesPath, `{"locale":"nl"}`, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d (body: %s)", rec.Code, rec.Body)
	}
	lobby := decodeBody[pqLobbyResponse](t, rec)
	room := pqLobbiesPath + "/" + lobby.Code

	rec = do(t, h, http.MethodPatch, room, fmt.Sprintf(`{"quizId":%q}`, quiz.ID), host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("update setup: status = %d (body: %s)", rec.Code, rec.Body)
	}

	guests := []sessionResponse{newGuestSession(t, h), newGuestSession(t, h)}
	for _, guest := range guests {
		if rec := do(t, h, http.MethodPost, room+"/players", `{}`, guest.Token); rec.Code != http.StatusOK {
			t.Fatalf("join lobby: status = %d (body: %s)", rec.Code, rec.Body)
		}
	}
	if rec := do(t, h, http.MethodPost, room+"/start", "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("start lobby: status = %d (body: %s)", rec.Code, rec.Body)
	}

	evening := "/api/v1/pubquizr/multi-device/" + lobby.Code
	rec = do(t, h, http.MethodGet, evening, "", host.Token)
	session := decodeBody[quizSessionResponse](t, rec)

	master := -1
	for _, player := range session.Players {
		if player.UserID == host.User.ID {
			master = player.Seat
		}
	}
	if master < 0 {
		t.Fatal("the host is not sat at the table")
	}
	intoATiedFinale(t, db, session.ID, master, 0, 0, 0)

	for _, guest := range guests {
		rec := do(t, h, http.MethodPost, evening+"/finalists", `{"seats":[0,1]}`, guest.Token)
		if rec.Code != http.StatusForbidden {
			t.Errorf("a guest naming the finalists: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
		}
	}

	rec = do(t, h, http.MethodPost, evening+"/finalists", `{"seats":[0,1]}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("the quizmaster naming the finalists: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if got := decodeBody[quizSessionResponse](t, rec).FinalistSeats; !slices.Equal(got, []int{0, 1}) {
		t.Errorf("finalistSeats = %v, want [0 1]", got)
	}
}

package api

import (
	"fmt"
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"

	"gorm.io/gorm"
)

// startedPQWalk deals a room of two and hands back the evening, its code, and the token of whoever reads.
func startedPQWalk(t *testing.T) (http.Handler, string, string, quizSessionResponse) {
	t.Helper()

	h, _, code, host, guest, session := startedPQPair(t)

	reader := guest.Token
	if session.Players[session.QuizMasterSeat].UserID == host.User.ID {
		reader = host.Token
	}

	return h, code, reader, session
}

// startedPQPair deals a room of two and hands back the database and both players as well.
func startedPQPair(t *testing.T) (http.Handler, *gorm.DB, string, sessionResponse, sessionResponse, quizSessionResponse) {
	t.Helper()

	h, db := newQuizServer(t)
	host := newGuestSession(t, h)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, host.Token, "locale=nl")

	rec := do(t, h, http.MethodPost, pqLobbiesPath, `{"locale":"nl"}`, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	code := decodeBody[pqLobbyResponse](t, rec).Code
	room := pqLobbiesPath + "/" + code

	rec = do(t, h, http.MethodPatch, room, fmt.Sprintf(`{"quizId":%q}`, quiz.ID), host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("update setup: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	if rec = do(t, h, http.MethodPost, room+"/players", `{}`, guest.Token); rec.Code != http.StatusOK {
		t.Fatalf("join lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	if rec = do(t, h, http.MethodPost, room+"/start", "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("start lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	session := readPQSession(t, h, code, guest.Token)
	if session.CurrentRound != pubquizr.RoundOpen {
		t.Fatalf("current round = %d, want round %d to open the evening", session.CurrentRound, pubquizr.RoundOpen)
	}

	return h, db, code, host, guest, session
}

func readPQSession(t *testing.T, h http.Handler, code, token string) quizSessionResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, "/api/v1/pubquizr/multi-device/"+code, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("read session: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	return decodeBody[quizSessionResponse](t, rec)
}

func settlePQOpen(t *testing.T, h http.Handler, code, token string, session quizSessionResponse, body string) quizSessionResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, "/api/v1/pubquizr/multi-device/"+code+"/verdict",
		fmt.Sprintf(`{"sessionQuestionId":%q,%s}`, session.TurnQuestionIDs[0], body), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("verdict: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	return decodeBody[quizSessionResponse](t, rec)
}

func TestPQSessionHasNoPreviousQuestionBeforeTheFirstIsSettled(t *testing.T) {
	_, _, _, session := startedPQWalk(t)

	if session.Previous != nil {
		t.Errorf("previous = %+v, want none on the round's first question", session.Previous)
	}
}

func TestPQSessionNamesWhoTookThePreviousQuestion(t *testing.T) {
	h, code, reader, session := startedPQWalk(t)

	asked := *session.AnsweringSeat
	settled := settlePQOpen(t, h, code, reader, session, fmt.Sprintf(`"missedSeats":[],"correctSeat":%d`, asked))

	// Read back as well as answered, because a phone that reloads learns it from the read.
	for name, got := range map[string]quizSessionResponse{"settle": settled, "read": readPQSession(t, h, code, reader)} {
		if got.Previous == nil {
			t.Fatalf("%s: previous = nil, want the question just settled", name)
		}
		if got.Previous.SessionQuestionID != session.TurnQuestionIDs[0] {
			t.Errorf("%s: previous question = %s, want %s", name, got.Previous.SessionQuestionID, session.TurnQuestionIDs[0])
		}
		if got.Previous.CorrectSeat == nil || *got.Previous.CorrectSeat != asked {
			t.Errorf("%s: previous correctSeat = %v, want %d", name, got.Previous.CorrectSeat, asked)
		}
	}
}

func TestPQSessionSaysNobodyTookAQuestionThatBeatTheTable(t *testing.T) {
	h, code, reader, session := startedPQWalk(t)

	settled := settlePQOpen(t, h, code, reader, session, fmt.Sprintf(`"missedSeats":[%d]`, *session.AnsweringSeat))

	if settled.Previous == nil {
		t.Fatal("previous = nil, want the question just settled")
	}
	if settled.Previous.CorrectSeat != nil {
		t.Errorf("previous correctSeat = %d, want nobody", *settled.Previous.CorrectSeat)
	}
}

func TestPQSessionNamesWhoTookThePreviousQuestionInRoundTwo(t *testing.T) {
	h, db, code, host, guest, session := startedPQPair(t)

	err := db.Model(&pubquizr.Session{}).Where("id = ?", session.ID).
		Updates(map[string]any{"current_round": pubquizr.RoundChoice, "current_position": 0}).Error
	if err != nil {
		t.Fatalf("move to round 2: %v", err)
	}

	session = readPQSession(t, h, code, host.Token)
	if session.Previous != nil {
		t.Errorf("previous = %+v, want none on the round's first question", session.Previous)
	}

	// Round 2 is settled on the answerer's own phone.
	asked := *session.AnsweringSeat
	answerer := guest.Token
	if session.Players[asked].UserID == host.User.ID {
		answerer = host.Token
	}

	settled := settlePQOpen(t, h, code, answerer, session, fmt.Sprintf(`"missedSeats":[],"correctSeat":%d`, asked))

	if settled.Previous == nil {
		t.Fatal("previous = nil, want the question just settled")
	}
	if settled.Previous.SessionQuestionID != session.TurnQuestionIDs[0] {
		t.Errorf("previous question = %s, want %s", settled.Previous.SessionQuestionID, session.TurnQuestionIDs[0])
	}
	if settled.Previous.CorrectSeat == nil || *settled.Previous.CorrectSeat != asked {
		t.Errorf("previous correctSeat = %v, want %d", settled.Previous.CorrectSeat, asked)
	}
}

func TestPQRoundTwoWithoutAScreenPassesToEveryPlayer(t *testing.T) {
	h, db, code, host, guest, session := startedPQPair(t)

	err := db.Model(&pubquizr.Session{}).Where("id = ?", session.ID).
		Updates(map[string]any{"current_round": pubquizr.RoundChoice, "current_position": 0}).Error
	if err != nil {
		t.Fatalf("move to round 2: %v", err)
	}

	session = readPQSession(t, h, code, host.Token)
	first := *session.AnsweringSeat
	last := 1 - first

	// Nobody reads round 2 on phones alone, so the question beats the table only once both players have missed it.
	answerer := guest.Token
	if session.Players[last].UserID == host.User.ID {
		answerer = host.Token
	}

	settled := settlePQOpen(t, h, code, answerer, session, fmt.Sprintf(`"missedSeats":[%d,%d],"correctSeat":null`, first, last))

	if settled.Previous == nil || settled.Previous.CorrectSeat != nil {
		t.Errorf("previous = %+v, want the question to have beaten the table", settled.Previous)
	}
}

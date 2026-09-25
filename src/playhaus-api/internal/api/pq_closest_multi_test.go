package api

import (
	"fmt"
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"

	"gorm.io/gorm"
)

// pqClosestTable is a room of three dealt and moved straight to round 3, with each seat's token.
type pqClosestTable struct {
	h       http.Handler
	db      *gorm.DB
	code    string
	tokens  map[int]string
	session quizSessionResponse
}

func startedPQClosest(t *testing.T) pqClosestTable {
	t.Helper()

	h, db := newQuizServer(t)
	host := newGuestSession(t, h)
	others := []sessionResponse{newGuestSession(t, h), newGuestSession(t, h)}
	quiz := aQuiz(t, h, host.Token, "locale=nl")

	rec := do(t, h, http.MethodPost, pqLobbiesPath, `{"locale":"nl"}`, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	code := decodeBody[pqLobbyResponse](t, rec).Code
	room := pqLobbiesPath + "/" + code

	if rec = do(t, h, http.MethodPatch, room, fmt.Sprintf(`{"quizId":%q}`, quiz.ID), host.Token); rec.Code != http.StatusOK {
		t.Fatalf("update setup: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	for _, other := range others {
		if rec = do(t, h, http.MethodPost, room+"/players", `{}`, other.Token); rec.Code != http.StatusOK {
			t.Fatalf("join lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
		}
	}
	if rec = do(t, h, http.MethodPost, room+"/start", "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("start lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	session := readPQSession(t, h, code, host.Token)
	err := db.Model(&pubquizr.Session{}).Where("id = ?", session.ID).
		Updates(map[string]any{"current_round": pubquizr.RoundClosest, "current_position": 0}).Error
	if err != nil {
		t.Fatalf("move to round 3: %v", err)
	}
	session = readPQSession(t, h, code, host.Token)

	byUser := map[string]string{host.User.ID: host.Token}
	for _, other := range others {
		byUser[other.User.ID] = other.Token
	}
	tokens := map[int]string{}
	for _, player := range session.Players {
		tokens[player.Seat] = byUser[player.UserID]
	}

	return pqClosestTable{h: h, db: db, code: code, tokens: tokens, session: session}
}

// answer is the number the current round 3 question is looking for.
func (table pqClosestTable) answer(t *testing.T) float64 {
	t.Helper()

	var answer float64
	err := table.db.Raw(`SELECT q.numeric_answer FROM pq_session_questions sq
		JOIN pq_questions q ON q.id = sq.question_id WHERE sq.id = ?`, table.session.TurnQuestionIDs[0]).
		Scan(&answer).Error
	if err != nil {
		t.Fatalf("read answer: %v", err)
	}

	return answer
}

func (table pqClosestTable) guess(t *testing.T, seat int, value float64) pqClosestProgressPayload {
	t.Helper()

	rec := do(t, table.h, http.MethodPost, "/api/v1/pubquizr/multi-device/"+table.code+"/closest/guess",
		fmt.Sprintf(`{"sessionQuestionId":%q,"value":%v}`, table.session.TurnQuestionIDs[0], value), table.tokens[seat])
	if rec.Code != http.StatusOK {
		t.Fatalf("guess from seat %d: status = %d, want %d (body: %s)", seat, rec.Code, http.StatusOK, rec.Body)
	}

	return decodeBody[pqClosestProgressPayload](t, rec)
}

func (table pqClosestTable) read(t *testing.T) quizSessionResponse {
	t.Helper()

	return readPQSession(t, table.h, table.code, table.tokens[0])
}

func scoresOf(session quizSessionResponse) map[int]int {
	scores := map[int]int{}
	for _, player := range session.Players {
		scores[player.Seat] = player.Score
	}

	return scores
}

func TestTheReaderGuessesInMultiDeviceRoundThree(t *testing.T) {
	table := startedPQClosest(t)

	progress := table.guess(t, table.session.QuizMasterSeat, 1)

	if got, want := progress.GuessesWanted, len(table.session.Players); got != want {
		t.Errorf("guessesWanted = %d, want the whole table of %d", got, want)
	}
}

func TestRoundThreeWaitsForEveryNumber(t *testing.T) {
	table := startedPQClosest(t)

	table.guess(t, 0, 1)
	table.guess(t, 1, 2)

	after := table.read(t)
	if after.CurrentRound != pubquizr.RoundClosest || after.CurrentPosition != 0 {
		t.Errorf("at round %d position %d with a number missing, want round %d position 0",
			after.CurrentRound, after.CurrentPosition, pubquizr.RoundClosest)
	}
}

func TestTheLastNumberInSettlesRoundThree(t *testing.T) {
	table := startedPQClosest(t)
	answer := table.answer(t)

	table.guess(t, 0, answer)
	table.guess(t, 1, answer+1_000_000)
	table.guess(t, 2, answer+2_000_000)

	after := table.read(t)
	if after.CurrentPosition != 1 {
		t.Fatalf("currentPosition = %d, want the question settled and the table on 1", after.CurrentPosition)
	}

	before, now := scoresOf(table.session), scoresOf(after)
	for seat, want := range map[int]int{0: pubquizr.ClosestPoints, 1: 0, 2: 0} {
		if got := now[seat] - before[seat]; got != want {
			t.Errorf("seat %d gained %d, want %d", seat, got, want)
		}
	}
}

func TestTheSameNumberTwiceIsATie(t *testing.T) {
	table := startedPQClosest(t)
	answer := table.answer(t)

	table.guess(t, 0, answer)
	table.guess(t, 1, answer+1_000_000)
	table.guess(t, 2, answer)

	before, now := scoresOf(table.session), scoresOf(table.read(t))
	for seat, want := range map[int]int{0: pubquizr.ClosestPoints, 1: 0, 2: pubquizr.ClosestPoints} {
		if got := now[seat] - before[seat]; got != want {
			t.Errorf("seat %d gained %d, want %d", seat, got, want)
		}
	}
}

func TestNobodyClosesAMultiDeviceRoundThreeByHand(t *testing.T) {
	table := startedPQClosest(t)

	rec := do(t, table.h, http.MethodPost, "/api/v1/pubquizr/multi-device/"+table.code+"/closest",
		fmt.Sprintf(`{"sessionQuestionId":%q}`, table.session.TurnQuestionIDs[0]), table.tokens[table.session.QuizMasterSeat])
	if rec.Code == http.StatusOK {
		t.Errorf("status = %d, want the route gone", rec.Code)
	}
}

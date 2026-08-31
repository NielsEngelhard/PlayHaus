package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"
)

// The finale over HTTP, reached by playing a real evening rather than by writing rows.
//
// Which is the point of doing it at this level at all: who round 6 seats depends on five
// rounds of scoring, and the one thing worth proving is that a session that got there by
// being played puts two people in the finale and somebody else in the quizmaster's chair.

func finalePath(sessionID string) string {
	return singleDeviceSessionPath(sessionID) + "/finale"
}

func listPath(sessionID string) string {
	return singleDeviceSessionPath(sessionID) + "/list"
}

func listBody(t *testing.T, req listAwardsRequest) string {
	t.Helper()

	body, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal list awards: %v", err)
	}
	return string(body)
}

// answersOfQuiz maps a quiz question id to the ids of its answers, which is what a round
// 5 award has to name.
func answersOfQuiz(t *testing.T, h http.Handler, token, quizID string) map[string][]string {
	t.Helper()

	rec := do(t, h, http.MethodGet, quizPath(quizID), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get quiz: status = %d (body: %s)", rec.Code, rec.Body)
	}

	quiz := decodeBody[quizResponse](t, rec)
	answers := map[string][]string{}
	for _, round := range quiz.Rounds {
		for _, question := range round.Questions {
			for _, answer := range question.Answers {
				answers[question.ID] = append(answers[question.ID], answer.ID)
			}
		}
	}
	return answers
}

// atTheFinale is a real session played through all five rounds, sat on the first finale
// question.
//
// Round 5 is settled so that the scoreboard comes out uneven -- the seat being asked is
// handed the whole question -- because a finale seated off a flat table proves nothing
// about who it picks. Rounds 1 to 4 are `atRoundFive`'s business.
func atTheFinale(t *testing.T, players int) (http.Handler, string, quizSessionResponse) {
	t.Helper()

	h, token, answers, session := atRoundFive(t, players)

	for session.CurrentRound == pubquizr.RoundList {
		dealt := session.TurnQuestionIDs[0]

		var questionID string
		for _, question := range session.Questions {
			if question.ID == dealt {
				questionID = question.QuestionID
			}
		}

		// The seat being asked, for the reason round 4 uses it too: they are the only
		// player who may be credited with more than one of a question's answers,
		// everybody else having a single bonus guess at the leftovers.
		claimer := *session.GuesserSeat

		awards := make([]listAwardRequest, 0, 4)
		for _, answer := range answers[questionID] {
			awards = append(awards, listAwardRequest{AnswerID: answer, Seats: []int{claimer}})
		}

		rec := do(t, h, http.MethodPost, listPath(session.ID), listBody(t, listAwardsRequest{
			SessionQuestionID: dealt,
			Awards:            awards,
		}), token)
		if rec.Code != http.StatusOK {
			t.Fatalf("settle round 5: status = %d (body: %s)", rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)
	}

	if got, want := session.CurrentRound, pubquizr.RoundFinale; got != want {
		t.Fatalf("currentRound = %d, want %d", got, want)
	}

	return h, token, session
}

func scoreOf(session quizSessionResponse, seat int) int {
	for _, player := range session.Players {
		if player.Seat == seat {
			return player.Score
		}
	}
	return -1
}

// The whole shape of the round in one assertion: two people play it, a third reads it,
// and the third is not one of the two.
func TestFinaleIsReadBySomebodyWhoIsNotPlayingIt(t *testing.T) {
	_, _, session := atTheFinale(t, 4)

	if len(session.FinalistSeats) != pubquizr.FinalistCount {
		t.Fatalf("finalistSeats = %v, want %d seats", session.FinalistSeats, pubquizr.FinalistCount)
	}

	finalist := map[int]bool{}
	for _, seat := range session.FinalistSeats {
		if seat == session.QuizMasterSeat {
			t.Errorf("seat %d is both a finalist and the quizmaster", seat)
		}
		finalist[seat] = true
	}

	// Nobody left at the table out-scored either finalist, and nobody left out-scored
	// the quizmaster either -- third place reads the round.
	lowest := scoreOf(session, session.FinalistSeats[0])
	if other := scoreOf(session, session.FinalistSeats[1]); other < lowest {
		lowest = other
	}

	for _, player := range session.Players {
		if finalist[player.Seat] {
			continue
		}
		if player.Score > lowest {
			t.Errorf("seat %d out-scored a finalist and did not play the finale", player.Seat)
		}
		if player.Seat != session.QuizMasterSeat &&
			player.Score > scoreOf(session, session.QuizMasterSeat) {
			t.Errorf("seat %d out-scored the quizmaster and did not get the chair", player.Seat)
		}
	}
}

func TestFinaleOpensOnTheFinalistWhoIsBehind(t *testing.T) {
	_, _, session := atTheFinale(t, 4)

	if session.AnsweringSeat == nil {
		t.Fatal("answeringSeat = null on the first finale question")
	}

	a, b := session.FinalistSeats[0], session.FinalistSeats[1]
	behind := a
	if scoreOf(session, b) < scoreOf(session, a) {
		behind = b
	}

	if got := *session.AnsweringSeat; got != behind {
		t.Errorf("answeringSeat = %d, want %d -- the finalist behind opens", got, behind)
	}
	if got, want := session.HotSeat, behind; got != want {
		t.Errorf("hotSeat = %d, want %d", got, want)
	}
}

// A wrong answer crosses to the other finalist rather than ending the question, and the
// hundred is still there to be taken.
func TestFinaleWrongAnswerCrossesToTheOtherFinalistAndStillPays(t *testing.T) {
	h, token, session := atTheFinale(t, 4)

	opened := *session.AnsweringSeat
	question := session.TurnQuestionIDs[0]
	position := session.CurrentPosition

	rec := do(t, h, http.MethodPost, finalePath(session.ID), verdictBody(t, question, false), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("first go: status = %d (body: %s)", rec.Code, rec.Body)
	}
	session = decodeBody[quizSessionResponse](t, rec)

	if got, want := session.CurrentPosition, position; got != want {
		t.Fatalf("currentPosition = %d, want %d -- the question is still alive", got, want)
	}
	if session.AnsweringSeat == nil {
		t.Fatal("answeringSeat = null with the other finalist still to go")
	}

	crossed := *session.AnsweringSeat
	if crossed == opened {
		t.Fatalf("answeringSeat = %d, want the other finalist", crossed)
	}
	if session.QuizMasterSeat == crossed {
		t.Error("the question crossed to the quizmaster")
	}

	before := scoreOf(session, crossed)

	rec = do(t, h, http.MethodPost, finalePath(session.ID), verdictBody(t, question, true), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("second go: status = %d (body: %s)", rec.Code, rec.Body)
	}
	session = decodeBody[quizSessionResponse](t, rec)

	if got, want := scoreOf(session, crossed), before+pubquizr.FinalePoints; got != want {
		t.Errorf("score = %d, want %d -- a passed question still pays in full", got, want)
	}
	if got, want := session.CurrentPosition, position+1; got != want {
		t.Errorf("currentPosition = %d, want %d", got, want)
	}
}

// The quizmaster reads the whole round: whoever the phone was handed to at the top of
// round 6 is still holding it at the end of it.
func TestFinaleKeepsOneQuizmasterForTheWholeRound(t *testing.T) {
	h, token, session := atTheFinale(t, 4)

	master := session.QuizMasterSeat
	held := scoreOf(session, master)

	for turn := 0; session.CurrentRound == pubquizr.RoundFinale; turn++ {
		if turn > 200 {
			t.Fatal("the finale would not end")
		}

		rec := do(t, h, http.MethodPost, finalePath(session.ID),
			verdictBody(t, session.TurnQuestionIDs[0], true), token)
		if rec.Code != http.StatusOK {
			t.Fatalf("turn %d: status = %d (body: %s)", turn, rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)

		if got := session.QuizMasterSeat; got != master {
			t.Fatalf("after turn %d: quizMasterSeat = %d, want %d", turn, got, master)
		}
	}

	if got, want := session.Status, string(pubquizr.SessionCompleted); got != want {
		t.Errorf("status = %q, want %q", got, want)
	}
	if got, want := scoreOf(session, master), held; got != want {
		t.Errorf("quizmaster score = %d, want %d -- they were not playing this round", got, want)
	}
}

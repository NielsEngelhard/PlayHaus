package api

import (
	"encoding/json"
	"net/http"
	"slices"
	"testing"

	"playhaus-api/internal/pubquizr"
)

func zenStartBody(t *testing.T, quizID string, names ...string) string {
	t.Helper()

	body, err := json.Marshal(startSingleDeviceRequest{
		QuizID:      quizID,
		PlayerNames: names,
		ZenMode:     true,
	})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	return string(body)
}

func startedZenQuiz(t *testing.T, h http.Handler, token, quizID string, names ...string) quizSessionResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, singleDevicePath, zenStartBody(t, quizID, names...), token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("start zen quiz: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[quizSessionResponse](t, rec)
}

func atZenRoundThree(t *testing.T, players int) (http.Handler, string, quizSessionResponse) {
	t.Helper()

	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedZenQuiz(t, h, guest.Token, quiz.ID, tableOf(players)...)
	session = playOutRound(t, h, guest.Token, session)
	session = playOutRound(t, h, guest.Token, session)

	if got, want := session.CurrentRound, pubquizr.RoundClosest; got != want {
		t.Fatalf("currentRound = %d, want %d", got, want)
	}

	return h, guest.Token, session
}

func settleRoundThree(t *testing.T, h http.Handler, token string, session quizSessionResponse) quizSessionResponse {
	t.Helper()

	for session.CurrentRound == pubquizr.RoundClosest {
		winner, _ := otherSeats(session, 1)

		rec := do(t, h, http.MethodPost, closestPath(session.ID), closestBody(t, closestGuessesRequest{
			SessionQuestionID: session.TurnQuestionIDs[0],
			WinningSeats:      []int{winner},
		}), token)
		if rec.Code != http.StatusOK {
			t.Fatalf("settle round 3: status = %d (body: %s)", rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)
	}

	return session
}

func TestZenQuizAnswersTheShortRunningOrder(t *testing.T) {
	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedZenQuiz(t, h, guest.Token, quiz.ID, tableOf(4)...)

	if !session.ZenMode {
		t.Error("zenMode = false on a session that asked for it")
	}
	if want := []int{1, 2, 3, 5, 6}; !slices.Equal(session.Rounds, want) {
		t.Errorf("rounds = %v, want %v", session.Rounds, want)
	}
	if got, want := session.TotalRounds, len(session.Rounds); got != want {
		t.Errorf("totalRounds = %d, want %d -- the length of the running order", got, want)
	}
	if got, want := session.TotalRounds, pubquizr.Rounds-1; got != want {
		t.Errorf("totalRounds = %d, want %d", got, want)
	}

	if got := questionsIn(session, pubquizr.RoundDescribe); len(got) != 0 {
		t.Errorf("round 4 was dealt %d questions, want none", len(got))
	}
	for _, round := range []int{1, 2, 3, 5, 6} {
		if got := questionsIn(session, round); len(got) == 0 {
			t.Errorf("round %d was dealt nothing", round)
		}
	}
}

func TestQuizWithoutZenPlaysEveryRound(t *testing.T) {
	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedQuiz(t, h, guest.Token, quiz.ID, tableOf(4)...)

	if session.ZenMode {
		t.Error("zenMode = true on a session that did not ask for it")
	}
	if want := []int{1, 2, 3, 4, 5, 6}; !slices.Equal(session.Rounds, want) {
		t.Errorf("rounds = %v, want %v", session.Rounds, want)
	}
	if got, want := session.TotalRounds, pubquizr.Rounds; got != want {
		t.Errorf("totalRounds = %d, want %d", got, want)
	}
}

func TestZenHandsRoundThreeStraightToRoundFive(t *testing.T) {
	h, token, session := atZenRoundThree(t, 4)

	if got, want := session.TurnsInRound, 2; got != want {
		t.Fatalf("turnsInRound = %d, want %d -- round 3 is unchanged by the mode", got, want)
	}

	session = settleRoundThree(t, h, token, session)

	if got, want := session.CurrentRound, pubquizr.RoundList; got != want {
		t.Fatalf("currentRound = %d, want %d -- round 4 is not played", got, want)
	}
	if got, want := session.Status, string(pubquizr.SessionInProgress); got != want {
		t.Errorf("status = %q, want %q", got, want)
	}
	if session.GuesserSeat == nil {
		t.Fatal("guesserSeat = null in round 5")
	}
	if session.DescriberSeat != nil {
		t.Errorf("describerSeat = %d, want null -- there is no describing tonight", *session.DescriberSeat)
	}
	if got, want := len(session.BonusSeats), len(session.Players)-2; got != want {
		t.Errorf("bonusSeats = %v, want %d of them", session.BonusSeats, want)
	}
	if got, want := session.TurnsInRound, len(session.Players); got != want {
		t.Errorf("turnsInRound = %d, want %d -- one question each", got, want)
	}
	if got, want := session.CurrentPosition, 0; got != want {
		t.Errorf("currentPosition = %d, want %d", got, want)
	}
}

func TestZenEveningPlaysThroughToTheEnd(t *testing.T) {
	h, token, session := atZenRoundThree(t, 4)
	answers := answersOfQuiz(t, h, token, session.QuizID)

	session = settleRoundThree(t, h, token, session)

	for turn := 0; session.CurrentRound == pubquizr.RoundList; turn++ {
		if turn > 200 {
			t.Fatal("round 5 would not end")
		}

		dealt := session.TurnQuestionIDs[0]
		question := questionOf(t, session, dealt)

		awards := make([]listAwardRequest, 0, len(answers[question]))
		for _, answer := range answers[question] {
			awards = append(awards, listAwardRequest{AnswerID: answer, Seats: []int{*session.GuesserSeat}})
		}

		rec := do(t, h, http.MethodPost, listPath(session.ID), listBody(t, listAwardsRequest{
			SessionQuestionID: dealt,
			Awards:            awards,
		}), token)
		if rec.Code != http.StatusOK {
			t.Fatalf("settle round 5 turn %d: status = %d (body: %s)", turn, rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)
	}

	if got, want := session.CurrentRound, pubquizr.RoundFinale; got != want {
		t.Fatalf("currentRound = %d, want %d", got, want)
	}
	if len(session.FinalistSeats) != pubquizr.FinalistCount {
		t.Fatalf("finalistSeats = %v, want two of them", session.FinalistSeats)
	}

	for turn := 0; session.CurrentRound == pubquizr.RoundFinale; turn++ {
		if turn > 200 {
			t.Fatal("the finale would not end")
		}

		rec := do(t, h, http.MethodPost, finalePath(session.ID),
			verdictBody(t, session.TurnQuestionIDs[0], true), token)
		if rec.Code != http.StatusOK {
			t.Fatalf("finale turn %d: status = %d (body: %s)", turn, rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)
	}

	if got, want := session.Status, string(pubquizr.SessionCompleted); got != want {
		t.Errorf("status = %q, want %q", got, want)
	}
	if want := []int{1, 2, 3, 5, 6}; !slices.Equal(session.Rounds, want) {
		t.Errorf("rounds = %v, want %v", session.Rounds, want)
	}
}

func questionOf(t *testing.T, session quizSessionResponse, sessionQuestionID string) string {
	t.Helper()

	for _, question := range session.Questions {
		if question.ID == sessionQuestionID {
			return question.QuestionID
		}
	}

	t.Fatalf("dealt question %s is not in the session", sessionQuestionID)
	return ""
}

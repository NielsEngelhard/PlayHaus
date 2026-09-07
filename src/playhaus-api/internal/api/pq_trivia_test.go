package api

import (
	"encoding/json"
	"net/http"
	"slices"
	"testing"

	"playhaus-api/internal/pubquizr"
)

func triviaStartBody(t *testing.T, quizID string, names ...string) string {
	t.Helper()

	body, err := json.Marshal(startSingleDeviceRequest{
		QuizID:      quizID,
		PlayerNames: names,
		TriviaMode:  true,
	})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	return string(body)
}

func startedTriviaQuiz(t *testing.T, h http.Handler, token, quizID string, names ...string) quizSessionResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, singleDevicePath, triviaStartBody(t, quizID, names...), token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("start trivia quiz: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[quizSessionResponse](t, rec)
}

func TestTriviaQuizAnswersTheTriviaRunningOrder(t *testing.T) {
	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedTriviaQuiz(t, h, guest.Token, quiz.ID, tableOf(4)...)

	if !session.TriviaMode {
		t.Error("triviaMode = false on a session that asked for it")
	}
	if session.ZenMode {
		t.Error("zenMode = true on a session that only asked for trivia")
	}
	if want := []int{1, 2, 3, 6}; !slices.Equal(session.Rounds, want) {
		t.Errorf("rounds = %v, want %v", session.Rounds, want)
	}
	if got, want := session.TotalRounds, len(session.Rounds); got != want {
		t.Errorf("totalRounds = %d, want %d -- the length of the running order", got, want)
	}

	for _, round := range []int{pubquizr.RoundDescribe, pubquizr.RoundList} {
		if got := questionsIn(session, round); len(got) != 0 {
			t.Errorf("round %d was dealt %d questions, want none", round, len(got))
		}
	}
	for _, round := range session.Rounds {
		if got := questionsIn(session, round); len(got) == 0 {
			t.Errorf("round %d was dealt nothing", round)
		}
	}
}

func TestQuizWithoutTriviaPlaysTheOtherRoundsToo(t *testing.T) {
	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedQuiz(t, h, guest.Token, quiz.ID, tableOf(4)...)

	if session.TriviaMode {
		t.Error("triviaMode = true on a session that did not ask for it")
	}
	if want := []int{1, 2, 3, 4, 5, 6}; !slices.Equal(session.Rounds, want) {
		t.Errorf("rounds = %v, want %v", session.Rounds, want)
	}
}

// The whole evening, end to end, because the interesting part of leaving two rounds out
// is the join afterwards: round 3 has to hand straight to a finale, and the finale has to
// find two players off a scoreboard that was only ever built by rounds 1 to 3.
func TestTriviaEveningPlaysThroughToTheEnd(t *testing.T) {
	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedTriviaQuiz(t, h, guest.Token, quiz.ID, tableOf(4)...)
	session = playOutRound(t, h, guest.Token, session) // round 1
	session = playOutRound(t, h, guest.Token, session) // round 2

	if got, want := session.CurrentRound, pubquizr.RoundClosest; got != want {
		t.Fatalf("currentRound = %d, want %d", got, want)
	}

	session = settleRoundThree(t, h, guest.Token, session)

	if got, want := session.CurrentRound, pubquizr.RoundFinale; got != want {
		t.Fatalf("currentRound = %d, want %d -- rounds 4 and 5 are not played", got, want)
	}
	if got, want := session.Status, string(pubquizr.SessionInProgress); got != want {
		t.Errorf("status = %q, want %q", got, want)
	}
	if len(session.FinalistSeats) != pubquizr.FinalistCount {
		t.Fatalf("finalistSeats = %v, want two of them", session.FinalistSeats)
	}
	if session.DescriberSeat != nil {
		t.Errorf("describerSeat = %d, want null -- there is no describing tonight", *session.DescriberSeat)
	}
	if session.GuesserSeat != nil {
		t.Errorf("guesserSeat = %d, want null -- there is no list round tonight", *session.GuesserSeat)
	}

	for turn := 0; session.CurrentRound == pubquizr.RoundFinale; turn++ {
		if turn > 200 {
			t.Fatal("the finale would not end")
		}

		rec := do(t, h, http.MethodPost, finalePath(session.ID),
			verdictBody(t, session), guest.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("finale turn %d: status = %d (body: %s)", turn, rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)
	}

	if got, want := session.Status, string(pubquizr.SessionCompleted); got != want {
		t.Errorf("status = %q, want %q", got, want)
	}
	if want := []int{1, 2, 3, 6}; !slices.Equal(session.Rounds, want) {
		t.Errorf("rounds = %v, want %v", session.Rounds, want)
	}
}

// Both toggles at once is a table that wants the shortest evening the game has. Zen
// already leaves round 4 out, so the pair must not add up to anything trivia does not
// already say on its own.
func TestZenAndTriviaTogetherPlayTheTriviaRounds(t *testing.T) {
	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	body, err := json.Marshal(startSingleDeviceRequest{
		QuizID:      quiz.ID,
		PlayerNames: tableOf(4),
		ZenMode:     true,
		TriviaMode:  true,
	})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	rec := do(t, h, http.MethodPost, singleDevicePath, string(body), guest.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("start quiz: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	session := decodeBody[quizSessionResponse](t, rec)

	if !session.ZenMode || !session.TriviaMode {
		t.Errorf("zenMode = %t, triviaMode = %t -- both were asked for", session.ZenMode, session.TriviaMode)
	}
	if want := []int{1, 2, 3, 6}; !slices.Equal(session.Rounds, want) {
		t.Errorf("rounds = %v, want %v", session.Rounds, want)
	}
}

package api

import (
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"
)

// Round 6, doubling down, over HTTP.
//
// The round is dealt ten questions and plays one lap of the table, so the whole pool sits
// in every turn's turnQuestionIds and the choice is made on the phone. Which makes the
// part worth reaching through the API for not the scoring but the pool: what arrives in a
// turn, and what the server does with a pick that is not in it.

func doubleDownPath(sessionID string) string {
	return singleDeviceSessionPath(sessionID) + "/double-down"
}

// difficultiesOfQuiz maps a quiz question id to its difficulty, which is the one thing the
// easy-or-hard choice needs and nothing else in a dealt question carries.
func difficultiesOfQuiz(t *testing.T, h http.Handler, token, quizID string) map[string]string {
	t.Helper()

	rec := do(t, h, http.MethodGet, quizPath(quizID), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get quiz: status = %d (body: %s)", rec.Code, rec.Body)
	}

	difficulties := map[string]string{}
	for _, round := range decodeBody[quizResponse](t, rec).Rounds {
		for _, question := range round.Questions {
			difficulties[question.ID] = question.Difficulty
		}
	}
	return difficulties
}

// poolOf is the choice the app would draw: the dealt questions of one difficulty still on
// offer, in the order they were dealt.
func poolOf(t *testing.T, session quizSessionResponse, difficulties map[string]string, difficulty pubquizr.Difficulty) []string {
	t.Helper()

	var pool []string
	for _, dealt := range session.TurnQuestionIDs {
		if difficulties[questionOf(t, session, dealt)] == string(difficulty) {
			pool = append(pool, dealt)
		}
	}
	return pool
}

// atDoubleDown is a real session played through the first five rounds, sat on the first
// easy-or-hard question.
//
// Round 5 is settled so that the scoreboard comes out uneven -- the seat being asked is
// handed the whole question -- because a round that opens on whoever is furthest behind
// proves nothing about who it picks at a flat table. Rounds 1 to 4 are atRoundFive's
// business.
func atDoubleDown(t *testing.T, players int) (http.Handler, string, quizSessionResponse) {
	t.Helper()

	h, token, answers, session := atRoundFive(t, players)

	for session.CurrentRound == pubquizr.RoundList {
		dealt := session.TurnQuestionIDs[0]
		question := questionOf(t, session, dealt)

		// The seat being asked, for the reason round 4 uses it too: they are the only
		// player who may be credited with more than one of a question's answers,
		// everybody else having a single bonus guess at the leftovers.
		claimer := *session.GuesserSeat

		awards := make([]listAwardRequest, 0, len(answers[question]))
		for _, answer := range answers[question] {
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

	if got, want := session.CurrentRound, pubquizr.RoundDoubleDown; got != want {
		t.Fatalf("currentRound = %d, want %d", got, want)
	}

	return h, token, session
}

// takeDoubleDown is the turn the round is mostly made of: a difficulty is picked and the
// seat being asked gets it right.
func takeDoubleDown(
	t *testing.T,
	h http.Handler,
	token string,
	session quizSessionResponse,
	difficulties map[string]string,
	difficulty pubquizr.Difficulty,
) quizSessionResponse {
	t.Helper()

	pool := poolOf(t, session, difficulties, difficulty)
	if len(pool) == 0 {
		t.Fatalf("no %s question left to pick", difficulty)
	}
	if session.AnsweringSeat == nil {
		t.Fatal("answeringSeat = null, so there is nobody being asked")
	}

	rec := do(t, h, http.MethodPost, doubleDownPath(session.ID),
		settledBody(t, pool[0], nil, session.AnsweringSeat), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("settle round 6: status = %d (body: %s)", rec.Code, rec.Body)
	}
	return decodeBody[quizSessionResponse](t, rec)
}

// playOutDoubleDown walks the round out a seat at a time, taking hard while there is any
// hard left, so a table wide enough to spend the hard five meets the exhaustion rule on
// its way past rather than only in the test that is about it.
func playOutDoubleDown(t *testing.T, h http.Handler, token string, session quizSessionResponse) quizSessionResponse {
	t.Helper()

	difficulties := difficultiesOfQuiz(t, h, token, session.QuizID)

	for turn := 0; session.CurrentRound == pubquizr.RoundDoubleDown; turn++ {
		if turn > 200 {
			t.Fatal("round 6 would not end")
		}

		difficulty := pubquizr.DifficultyHard
		if len(poolOf(t, session, difficulties, difficulty)) == 0 {
			difficulty = pubquizr.DifficultyEasy
		}
		session = takeDoubleDown(t, h, token, session, difficulties, difficulty)
	}

	return session
}

// The whole pool arrives in the turn, which is what pays for the round being one request
// and then a choice made on the phone.
func TestDoubleDownDealsTheWholePoolToChooseFrom(t *testing.T) {
	h, token, session := atDoubleDown(t, 4)
	difficulties := difficultiesOfQuiz(t, h, token, session.QuizID)

	if got, want := len(session.TurnQuestionIDs), pubquizr.MinDoubleDownQuestions; got != want {
		t.Fatalf("turnQuestionIds holds %d questions, want %d", got, want)
	}
	for _, difficulty := range []pubquizr.Difficulty{pubquizr.DifficultyEasy, pubquizr.DifficultyHard} {
		if got, want := len(poolOf(t, session, difficulties, difficulty)), pubquizr.DoubleDownPerDifficulty; got != want {
			t.Errorf("%d %s questions on offer, want %d", got, difficulty, want)
		}
	}

	// More questions than goes, on purpose: the ones nobody picks are the choice.
	if got, want := session.TurnsInRound, len(session.Players); got != want {
		t.Errorf("turnsInRound = %d, want %d -- one go each", got, want)
	}
	if session.AnsweringSeat == nil {
		t.Fatal("answeringSeat = null in round 6")
	}

	// And it opens on whoever the five rounds before it left furthest behind.
	asked := scoreOf(session, *session.AnsweringSeat)
	for _, player := range session.Players {
		if player.Score < asked {
			t.Errorf("seat %d is asked first on %d points, but seat %d has %d",
				*session.AnsweringSeat, asked, player.Seat, player.Score)
		}
	}
}

func TestDoubleDownPaysWhatTheDifficultyWasWorth(t *testing.T) {
	table := []struct {
		difficulty pubquizr.Difficulty
		want       int
	}{
		{pubquizr.DifficultyEasy, pubquizr.EasyPoints},
		{pubquizr.DifficultyHard, pubquizr.HardPoints},
	}

	for _, row := range table {
		t.Run(string(row.difficulty), func(t *testing.T) {
			h, token, session := atDoubleDown(t, 4)
			difficulties := difficultiesOfQuiz(t, h, token, session.QuizID)

			asked := *session.AnsweringSeat
			before := scoreOf(session, asked)

			session = takeDoubleDown(t, h, token, session, difficulties, row.difficulty)

			if got, want := scoreOf(session, asked)-before, row.want; got != want {
				t.Errorf("seat %d gained %d, want %d", asked, got, want)
			}
			// One go each, so answering it buys nothing but the points.
			if got, want := session.HotSeat, (asked+1)%len(session.Players); got != want {
				t.Errorf("hotSeat = %d, want %d -- the phone moves round the table", got, want)
			}
			if got, want := session.HotSeatRun, 0; got != want {
				t.Errorf("hotSeatRun = %d, want %d -- there is no seat to hold here", got, want)
			}
		})
	}
}

// The one round 1 rule this round does not borrow: a hard question that walked past the
// first two people is still hard when the third one takes it.
func TestDoubleDownPaysAPassedQuestionInFull(t *testing.T) {
	h, token, session := atDoubleDown(t, 4)
	difficulties := difficultiesOfQuiz(t, h, token, session.QuizID)

	players := len(session.Players)
	asked := *session.AnsweringSeat
	missed := []int{asked, (asked + 1) % players}
	taker := (asked + 2) % players
	before := scoreOf(session, taker)

	pool := poolOf(t, session, difficulties, pubquizr.DifficultyHard)
	rec := do(t, h, http.MethodPost, doubleDownPath(session.ID),
		settledBody(t, pool[0], missed, &taker), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("settle round 6: status = %d (body: %s)", rec.Code, rec.Body)
	}
	session = decodeBody[quizSessionResponse](t, rec)

	if got, want := scoreOf(session, taker)-before, pubquizr.HardPoints; got != want {
		t.Errorf("seat %d gained %d, want %d -- a passed question keeps its value", taker, got, want)
	}
}

// A pick the pool does not hold is refused, and that one check is the whole of the
// server's side of the choice: a question already settled and a question from another
// round are the same refusal, and so is a sixth hard one.
func TestDoubleDownRefusesAPickOutsideThePool(t *testing.T) {
	h, token, session := atDoubleDown(t, 4)
	difficulties := difficultiesOfQuiz(t, h, token, session.QuizID)

	taken := poolOf(t, session, difficulties, pubquizr.DifficultyEasy)[0]
	session = takeDoubleDown(t, h, token, session, difficulties, pubquizr.DifficultyEasy)

	var elsewhere string
	for _, question := range session.Questions {
		if question.Round == pubquizr.RoundOpen {
			elsewhere = question.ID
			break
		}
	}
	if elsewhere == "" {
		t.Fatal("the session holds no round 1 question to try")
	}

	table := []struct {
		name string
		id   string
	}{
		{"one that has already been settled", taken},
		{"one belonging to another round", elsewhere},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, doubleDownPath(session.ID),
				settledBody(t, row.id, nil, session.AnsweringSeat), token)
			if got, want := rec.Code, http.StatusConflict; got != want {
				t.Fatalf("status = %d, want %d (body: %s)", got, want, rec.Body)
			}
			if got, want := errorCode(t, rec), "stale_turn"; got != want {
				t.Errorf("code = %q, want %q", got, want)
			}
		})
	}
}

// The exhaustion rule, with nothing anywhere counting it: at a table of six the hard five
// are spent before the last player is asked, so all there is left to offer them is easy.
func TestDoubleDownRunsOutOfTheSideTheTableSpent(t *testing.T) {
	h, token, session := atDoubleDown(t, 6)
	difficulties := difficultiesOfQuiz(t, h, token, session.QuizID)

	for i := 0; i < pubquizr.DoubleDownPerDifficulty; i++ {
		session = takeDoubleDown(t, h, token, session, difficulties, pubquizr.DifficultyHard)
	}

	if got := poolOf(t, session, difficulties, pubquizr.DifficultyHard); len(got) != 0 {
		t.Errorf("%d hard questions still on offer after the five were taken", len(got))
	}
	if got, want := len(poolOf(t, session, difficulties, pubquizr.DifficultyEasy)), pubquizr.DoubleDownPerDifficulty; got != want {
		t.Fatalf("%d easy questions left, want %d", got, want)
	}

	// So the sixth player is asked easy or easy, which is what the rule comes to.
	session = takeDoubleDown(t, h, token, session, difficulties, pubquizr.DifficultyEasy)

	if got, want := session.CurrentRound, pubquizr.RoundFinale; got != want {
		t.Errorf("currentRound = %d, want %d -- six goes at a table of six", got, want)
	}
}

package api

import (
	"net/http"
	"strconv"
	"testing"

	"playhaus-api/internal/lol"

	"gorm.io/gorm"
)

const highScoresPath = soloPath + "/high-scores"

// solveEveryRound plays the answer straight into each of the game's rounds and returns
// the outcome of the guess that ended it.
func solveEveryRound(t *testing.T, h http.Handler, db *gorm.DB, token string, game soloGameResponse) submitGuessResponse {
	t.Helper()

	var last submitGuessResponse
	for round := 1; round <= game.TotalRounds; round++ {
		rec := submitGuess(t, h, token, game.ID, answerFor(t, db, game.ID, round))
		if rec.Code != http.StatusCreated {
			t.Fatalf("round %d: status = %d, want %d (body: %s)", round, rec.Code, http.StatusCreated, rec.Body)
		}
		last = decodeBody[submitGuessResponse](t, rec)
	}
	if !last.GameOver {
		t.Fatalf("solving every round did not end the game: %+v", last)
	}
	return last
}

func highScores(t *testing.T, h http.Handler, token string) []highScoreResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, highScoresPath, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("high scores: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[[]highScoreResponse](t, rec)
}

func competitiveBody(wordLength int) string {
	return `{"wordLength":` + strconv.Itoa(wordLength) + `,"locale":"en","competitive":true}`
}

// The Boolean is optional, and leaving it out has to keep meaning the calmer game.
func TestCreateSoloGameDefaultsToZen(t *testing.T) {
	srv := newTestServer(t)
	token := newGuestSession(t, srv).Token

	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)
	if game.Competitive {
		t.Error("a game created without the flag came back competitive")
	}
}

func TestCreateSoloGameCanBeCompetitive(t *testing.T) {
	srv := newTestServer(t)
	token := newGuestSession(t, srv).Token

	game := createSoloGame(t, srv, token, competitiveBody(5))
	if !game.Competitive {
		t.Error("a competitive game came back zen")
	}
}

// Zen is the whole point: no clock, no score, nothing riding on it.
func TestZenGameScoresNothing(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	last := solveEveryRound(t, srv, db, token, game)
	if last.Score != 0 {
		t.Errorf("Score = %d, want 0 on a zen game", last.Score)
	}
	if last.TimeBonus != 0 {
		t.Errorf("TimeBonus = %d, want 0 on a zen game", last.TimeBonus)
	}

	finished := getSoloGame(t, srv, token, game.ID)
	if finished.Score != 0 || finished.TimeBonus != 0 {
		t.Errorf("stored score = %d, bonus = %d, want 0 and 0", finished.Score, finished.TimeBonus)
	}
	if finished.FinishedAt != "" {
		t.Errorf("FinishedAt = %q, want empty on a zen game", finished.FinishedAt)
	}
}

func TestZenGameRecordsNoHighScore(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	last := solveEveryRound(t, srv, db, token, game)
	if last.HighScore {
		t.Error("a zen game claimed a personal best")
	}
	if bests := highScores(t, srv, token); len(bests) != 0 {
		t.Errorf("got %d bests after a zen game, want none", len(bests))
	}
}

func TestCompetitiveGameKeepsScoring(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, competitiveBody(5))

	rec := submitGuess(t, srv, token, game.ID, answerFor(t, db, game.ID, 1))
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	got := decodeBody[submitGuessResponse](t, rec)
	if got.Score <= 0 {
		t.Errorf("Score = %d after solving a round, want more than 0", got.Score)
	}
}

// The bonus is only awarded once, when the last round closes.
func TestFinishingCompetitiveAwardsATimeBonus(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, competitiveBody(5))

	last := solveEveryRound(t, srv, db, token, game)
	// The whole run takes milliseconds, so it is comfortably inside the grace window.
	if last.TimeBonus != lol.MaxTimeBonus {
		t.Errorf("TimeBonus = %d, want %d", last.TimeBonus, lol.MaxTimeBonus)
	}
	if last.Score <= lol.MaxTimeBonus {
		t.Errorf("Score = %d, want the base score on top of the %d bonus", last.Score, lol.MaxTimeBonus)
	}

	finished := getSoloGame(t, srv, token, game.ID)
	if finished.Score != last.Score {
		t.Errorf("stored score = %d, want %d -- the bonus was dropped on the way to the database", finished.Score, last.Score)
	}
	if finished.TimeBonus != last.TimeBonus {
		t.Errorf("stored bonus = %d, want %d", finished.TimeBonus, last.TimeBonus)
	}
	if finished.FinishedAt == "" {
		t.Error("a finished competitive game has no FinishedAt")
	}
}

func TestFinishingCompetitiveRecordsTheHighScore(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, competitiveBody(5))

	last := solveEveryRound(t, srv, db, token, game)
	if !last.HighScore {
		t.Error("the first competitive run was not a personal best")
	}

	bests := highScores(t, srv, token)
	if len(bests) != 1 {
		t.Fatalf("got %d bests, want 1", len(bests))
	}
	if bests[0].WordLength != 5 {
		t.Errorf("WordLength = %d, want 5", bests[0].WordLength)
	}
	if bests[0].Score != last.Score {
		t.Errorf("best Score = %d, want %d", bests[0].Score, last.Score)
	}
}

// A four-letter run and a six-letter run are separate achievements, so both survive.
func TestHighScoreIsKeptPerWordLength(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	for _, length := range []int{4, 6} {
		game := createSoloGame(t, srv, token, competitiveBody(length))
		solveEveryRound(t, srv, db, token, game)
	}

	bests := highScores(t, srv, token)
	if len(bests) != 2 {
		t.Fatalf("got %d bests, want 2", len(bests))
	}
	if bests[0].WordLength != 4 || bests[1].WordLength != 6 {
		t.Errorf("lengths = %d, %d, want 4, 6", bests[0].WordLength, bests[1].WordLength)
	}
}

// A run that scores less has to leave the tag on the index page alone.
func TestWorseRunDoesNotReplaceTheBest(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	first := createSoloGame(t, srv, token, competitiveBody(5))
	best := solveEveryRound(t, srv, db, token, first)

	// Burning every guess on each round scores far less than solving them outright.
	second := createSoloGame(t, srv, token, competitiveBody(5))
	var last submitGuessResponse
	for round := 1; round <= second.TotalRounds; round++ {
		answer := answerFor(t, db, second.ID, round)
		for _, word := range wrongGuesses(t, answer, lol.MaxGuesses) {
			rec := submitGuess(t, srv, token, second.ID, word)
			if rec.Code != http.StatusCreated {
				t.Fatalf("round %d: status = %d, want %d (body: %s)", round, rec.Code, http.StatusCreated, rec.Body)
			}
			last = decodeBody[submitGuessResponse](t, rec)
		}
	}
	if !last.GameOver {
		t.Fatalf("running out of guesses everywhere did not end the game: %+v", last)
	}
	if last.Score >= best.Score {
		t.Fatalf("the losing run scored %d, which is not worse than %d", last.Score, best.Score)
	}
	if last.HighScore {
		t.Error("a worse run was reported as a personal best")
	}

	bests := highScores(t, srv, token)
	if len(bests) != 1 || bests[0].Score != best.Score {
		t.Errorf("got %+v, want the first run's %d still standing", bests, best.Score)
	}
}

func TestHighScoresAreTheCallersOwn(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	mine := newGuestSession(t, srv).Token
	theirs := newGuestSession(t, srv).Token

	game := createSoloGame(t, srv, mine, competitiveBody(5))
	solveEveryRound(t, srv, db, mine, game)

	if bests := highScores(t, srv, theirs); len(bests) != 0 {
		t.Errorf("another account sees %d of my bests, want none", len(bests))
	}
}

func TestHighScoresRequireAuth(t *testing.T) {
	srv := newTestServer(t)

	rec := do(t, srv, http.MethodGet, highScoresPath, "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

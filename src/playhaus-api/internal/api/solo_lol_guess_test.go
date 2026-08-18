package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	league_of_letters "playhaus-api/internal/league-of-letters"

	"gorm.io/gorm"
)

func guessPath(gameID string) string { return soloPath + "/" + gameID + "/guesses" }

// answerFor reads a round's word straight out of the database.
//
// The API will not tell a test what the word is any more than it will tell a
// player, so a test that needs to solve a round has to go around it. That is the
// point: if this could be read off a response the secret would not be one.
func answerFor(t *testing.T, db *gorm.DB, gameID string, roundNumber int) string {
	t.Helper()

	var word string
	err := db.Raw(`SELECT word FROM solo_lol_rounds WHERE game_id = ? AND round_number = ?`,
		gameID, roundNumber).Scan(&word).Error
	if err != nil {
		t.Fatalf("read answer: %v", err)
	}
	if word == "" {
		t.Fatalf("no word stored for game %s round %d", gameID, roundNumber)
	}
	return word
}

// wrongGuess is a word of the right shape that is not the answer: same length,
// same opening letter, so only the answer check can reject it.
func wrongGuess(answer string) string {
	runes := []rune(answer)

	// Walk the tail letters on until the word differs from the answer.
	for i := 1; i < len(runes); i++ {
		if runes[i] != 'x' {
			runes[i] = 'x'
			return string(runes)
		}
	}
	return string(runes)
}

func submitGuess(t *testing.T, h http.Handler, token, gameID, word string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, guessPath(gameID), fmt.Sprintf(`{"word":%q}`, word), token)
}

func getSoloGame(t *testing.T, h http.Handler, token, gameID string) soloGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, soloPath+"/"+gameID, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get solo game: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[soloGameResponse](t, rec)
}

func TestSubmitGuessRequiresAuth(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	rec := submitGuess(t, srv, "", game.ID, answerFor(t, db, game.ID, 1))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestSubmitGuessScoresTheWord(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	answer := answerFor(t, db, game.ID, 1)
	rec := submitGuess(t, srv, token, game.ID, wrongGuess(answer))
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	got := decodeBody[submitGuessResponse](t, rec)
	if got.Guess.GuessNumber != 1 {
		t.Errorf("GuessNumber = %d, want 1", got.Guess.GuessNumber)
	}
	if len(got.Guess.Marks) != 5 {
		t.Errorf("got %d marks, want 5", len(got.Guess.Marks))
	}
	// The opening letter is given away, so it is always in the right place.
	if len(got.Guess.Marks) > 0 && got.Guess.Marks[0] != string(league_of_letters.LetterCorrect) {
		t.Errorf("first mark = %q, want %q", got.Guess.Marks[0], league_of_letters.LetterCorrect)
	}
	if got.Solved || got.RoundOver || got.GameOver {
		t.Errorf("a wrong first guess ended something: %+v", got)
	}
	if got.CurrentRound != 1 {
		t.Errorf("CurrentRound = %d, want 1", got.CurrentRound)
	}
	// Still winnable, so the answer stays server-side.
	if got.Word != "" {
		t.Errorf("Word = %q on a round that can still be won", got.Word)
	}
}

// The response is the guess and what it changed -- not the game. Everything the
// caller already had is its own to keep.
func TestSubmitGuessDoesNotReturnTheWholeGame(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	rec := submitGuess(t, srv, token, game.ID, wrongGuess(answerFor(t, db, game.ID, 1)))
	body := rec.Body.String()

	for _, absent := range []string{`"rounds"`, `"wordLength"`, `"maxGuesses"`, `"totalRounds"`} {
		if strings.Contains(body, absent) {
			t.Errorf("guess response carries %s: %s", absent, body)
		}
	}
}

func TestSubmitGuessSolvingAdvancesTheRound(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	answer := answerFor(t, db, game.ID, 1)
	rec := submitGuess(t, srv, token, game.ID, answer)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	got := decodeBody[submitGuessResponse](t, rec)
	if !got.Solved || !got.RoundOver {
		t.Errorf("Solved = %v, RoundOver = %v, want both true", got.Solved, got.RoundOver)
	}
	if got.GameOver {
		t.Error("GameOver on round 1 of 3")
	}
	if got.CurrentRound != 2 {
		t.Errorf("CurrentRound = %d, want 2", got.CurrentRound)
	}
	if got.Word != answer {
		t.Errorf("Word = %q, want %q -- a finished round tells its answer", got.Word, answer)
	}
	for i, mark := range got.Guess.Marks {
		if mark != string(league_of_letters.LetterCorrect) {
			t.Errorf("mark %d = %q, want %q", i, mark, league_of_letters.LetterCorrect)
		}
	}

	// And the game itself has moved on, with round 1's answer now on show.
	fresh := getSoloGame(t, srv, token, game.ID)
	if fresh.CurrentRound != 2 {
		t.Errorf("game CurrentRound = %d, want 2", fresh.CurrentRound)
	}
	if fresh.Rounds[0].Word != answer {
		t.Errorf("finished round word = %q, want %q", fresh.Rounds[0].Word, answer)
	}
	if fresh.Rounds[1].Word != "" {
		t.Errorf("round 2 leaked %q before it was played", fresh.Rounds[1].Word)
	}
}

// Six wrong guesses end the round without solving it, and the answer is told
// once there is nothing left to spoil.
func TestSubmitGuessRunsOutOfGuesses(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	answer := answerFor(t, db, game.ID, 1)
	first := string([]rune(answer)[0])

	var last submitGuessResponse
	for i := range league_of_letters.MaxGuesses {
		// Distinct wrong words: same opening letter, then a run of the same
		// letter with one position moved along each time.
		word := first + strings.Repeat("x", 3)
		if i == 0 {
			word += "y"
		} else {
			word += string(rune('a' + i))
		}
		if word == answer {
			t.Fatalf("test word %q collided with the answer", word)
		}

		rec := submitGuess(t, srv, token, game.ID, word)
		if rec.Code != http.StatusCreated {
			t.Fatalf("guess %d: status = %d, want %d (body: %s)", i+1, rec.Code, http.StatusCreated, rec.Body)
		}
		last = decodeBody[submitGuessResponse](t, rec)

		wantOver := i == league_of_letters.MaxGuesses-1
		if last.RoundOver != wantOver {
			t.Errorf("guess %d: RoundOver = %v, want %v", i+1, last.RoundOver, wantOver)
		}
	}

	if last.Solved {
		t.Error("Solved after six wrong guesses")
	}
	if last.Word != answer {
		t.Errorf("Word = %q, want %q once the round is spent", last.Word, answer)
	}
	if last.CurrentRound != 2 {
		t.Errorf("CurrentRound = %d, want 2", last.CurrentRound)
	}

	// A seventh guess is not refused -- it lands in round 2, which has its own
	// word and so its own opening letter.
	next := answerFor(t, db, game.ID, 2)
	rec := submitGuess(t, srv, token, game.ID, wrongGuess(next))
	if rec.Code != http.StatusCreated {
		t.Fatalf("the next round should accept a guess: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if got := decodeBody[submitGuessResponse](t, rec); got.Guess.GuessNumber != 1 {
		t.Errorf("GuessNumber = %d, want 1 -- a new round counts from one", got.Guess.GuessNumber)
	}
}

// Solving the last round finishes the game, and a finished game takes nothing
// more.
func TestSubmitGuessCompletesTheGame(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	var last submitGuessResponse
	for round := 1; round <= soloRounds; round++ {
		rec := submitGuess(t, srv, token, game.ID, answerFor(t, db, game.ID, round))
		if rec.Code != http.StatusCreated {
			t.Fatalf("round %d: status = %d, want %d (body: %s)", round, rec.Code, http.StatusCreated, rec.Body)
		}
		last = decodeBody[submitGuessResponse](t, rec)

		wantOver := round == soloRounds
		if last.GameOver != wantOver {
			t.Errorf("round %d: GameOver = %v, want %v", round, last.GameOver, wantOver)
		}
	}

	fresh := getSoloGame(t, srv, token, game.ID)
	if fresh.Status != string(league_of_letters.GameCompleted) {
		t.Errorf("Status = %q, want %q", fresh.Status, league_of_letters.GameCompleted)
	}
	// Every round is done, so every answer is on show.
	for _, round := range fresh.Rounds {
		if round.Word == "" {
			t.Errorf("round %d withheld its answer after the game ended", round.RoundNumber)
		}
	}

	rec := submitGuess(t, srv, token, game.ID, "aaaaa")
	if rec.Code != http.StatusConflict {
		t.Errorf("guess into a finished game: status = %d, want %d (body: %s)",
			rec.Code, http.StatusConflict, rec.Body)
	}
}

func TestSubmitGuessRefusals(t *testing.T) {
	tests := []struct {
		name string
		// word is built from the answer, so each case can be exactly one thing wrong.
		word func(answer string) string
		want int
	}{
		{"too short", func(a string) string { return string([]rune(a)[:len([]rune(a))-1]) }, http.StatusBadRequest},
		{"too long", func(a string) string { return a + "s" }, http.StatusBadRequest},
		{"wrong opening letter", func(a string) string {
			runes := []rune(wrongGuess(a))
			if runes[0] == 'q' {
				runes[0] = 'z'
			} else {
				runes[0] = 'q'
			}
			return string(runes)
		}, http.StatusBadRequest},
		{"digits", func(a string) string { return string([]rune(a)[0]) + "1234"[:len([]rune(a))-1] }, http.StatusBadRequest},
		{"empty", func(string) string { return "" }, http.StatusUnprocessableEntity},
		{"blank", func(string) string { return "   " }, http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv, db := newTestServerWithDB(t)
			token := newGuestSession(t, srv).Token
			game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

			rec := submitGuess(t, srv, token, game.ID, tt.word(answerFor(t, db, game.ID, 1)))
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// The board refuses repeats itself, so this only fires when something got past
// it -- but the rule has to be true on the server, not merely enforced there.
func TestSubmitGuessRejectsDuplicates(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	word := wrongGuess(answerFor(t, db, game.ID, 1))
	if rec := submitGuess(t, srv, token, game.ID, word); rec.Code != http.StatusCreated {
		t.Fatalf("first guess: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := submitGuess(t, srv, token, game.ID, word)
	if rec.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}

	// Casing is not a way around it.
	rec = submitGuess(t, srv, token, game.ID, strings.ToUpper(word))
	if rec.Code != http.StatusConflict {
		t.Errorf("upper case repeat: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
}

func TestSubmitGuessHidesOtherPlayersGames(t *testing.T) {
	srv, db := newTestServerWithDB(t)

	ownerToken := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, ownerToken, `{"wordLength":5,"locale":"en"}`)
	answer := answerFor(t, db, game.ID, 1)

	intruderToken := newGuestSession(t, srv).Token
	rec := submitGuess(t, srv, intruderToken, game.ID, answer)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}

	// And it changed nothing.
	fresh := getSoloGame(t, srv, ownerToken, game.ID)
	if len(fresh.Rounds[0].Guesses) != 0 {
		t.Errorf("an intruder's guess was recorded: %+v", fresh.Rounds[0].Guesses)
	}
}

func TestSubmitGuessUnknownGame(t *testing.T) {
	srv := newTestServer(t)
	token := newGuestSession(t, srv).Token

	for name, id := range map[string]string{
		"well-formed but unknown": "b3f1c2d4-5e6a-4b8c-9d0e-1f2a3b4c5d6e",
		"not a uuid":              "not-a-uuid",
	} {
		t.Run(name, func(t *testing.T) {
			rec := submitGuess(t, srv, token, id, "abcde")
			if rec.Code != http.StatusNotFound {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
			}
		})
	}
}

// Guesses survive a reload: coming back to a game shows what was played, and the
// round still in progress still keeps its answer.
func TestGetSoloGameReturnsPlayedGuesses(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	answer := answerFor(t, db, game.ID, 1)
	word := wrongGuess(answer)
	if rec := submitGuess(t, srv, token, game.ID, word); rec.Code != http.StatusCreated {
		t.Fatalf("guess: status = %d (body: %s)", rec.Code, rec.Body)
	}

	fresh := getSoloGame(t, srv, token, game.ID)
	if fresh.MaxGuesses != league_of_letters.MaxGuesses {
		t.Errorf("MaxGuesses = %d, want %d", fresh.MaxGuesses, league_of_letters.MaxGuesses)
	}
	if fresh.TotalRounds != soloRounds {
		t.Errorf("TotalRounds = %d, want %d", fresh.TotalRounds, soloRounds)
	}

	round := fresh.Rounds[0]
	if round.FirstLetter != string([]rune(answer)[0]) {
		t.Errorf("FirstLetter = %q, want %q", round.FirstLetter, string([]rune(answer)[0]))
	}
	if round.Word != "" {
		t.Errorf("round 1 leaked %q while it can still be won", round.Word)
	}
	if len(round.Guesses) != 1 {
		t.Fatalf("got %d guesses, want 1", len(round.Guesses))
	}
	if round.Guesses[0].Word != word {
		t.Errorf("Word = %q, want %q", round.Guesses[0].Word, word)
	}
	if len(round.Guesses[0].Marks) != 5 {
		t.Errorf("got %d marks, want 5", len(round.Guesses[0].Marks))
	}
	if round.Guesses[0].UserID == "" {
		t.Error("guess came back with no userId, which the board matches on")
	}
}

// The hint is one letter and the answer is the rest -- giving it away must not
// give the word away.
func TestSubmitGuessDoesNotLeakUnfinishedAnswers(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	answer := answerFor(t, db, game.ID, 1)
	rec := submitGuess(t, srv, token, game.ID, wrongGuess(answer))

	if strings.Contains(strings.ToLower(rec.Body.String()), strings.ToLower(answer)) {
		t.Errorf("guess response leaked the answer %q: %s", answer, rec.Body)
	}
}

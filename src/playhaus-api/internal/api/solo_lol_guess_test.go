package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"playhaus-api/internal/i18n"
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
	err := db.Raw(`SELECT word FROM lol_rounds WHERE game_id = ? AND round_number = ?`,
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
func wrongGuess(t *testing.T, answer string) string {
	t.Helper()
	return wrongGuesses(t, answer, 1)[0]
}

// wrongGuesses is n distinct real words the round will accept, none of them the
// answer.
//
// They cannot be built by bending a letter of the answer, which is what this used
// to do: the server checks the guess is a word the list actually holds *and* that
// it opens with the round's hint letter, so "lepxl" fails the first and "xepel"
// the second. Drawn from the same list the answer came from instead.
func wrongGuesses(t *testing.T, answer string, n int) []string {
	t.Helper()

	size := len([]rune(answer))
	first := string([]rune(answer)[0])

	found := make([]string, 0, n)
	seen := map[string]bool{answer: true}

	// Sampling rather than reading the list: the word files are the game package's
	// own business, and GetRandomWords is the door it already opens. Bounded so a
	// list with too few words starting with the hint letter fails the test rather
	// than hanging it.
	for range 2000 {
		if len(found) == n {
			return found
		}

		word, err := league_of_letters.GetRandomWord(i18n.EN, size, false)
		if err != nil {
			t.Fatalf("draw a word: %v", err)
		}
		if seen[word] || !strings.HasPrefix(word, first) {
			continue
		}

		seen[word] = true
		found = append(found, word)
	}

	t.Fatalf("could not find %d %d-letter words starting with %q that are not %q", n, size, first, answer)
	return nil
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
	rec := submitGuess(t, srv, token, game.ID, wrongGuess(t, answer))
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

	rec := submitGuess(t, srv, token, game.ID, wrongGuess(t, answerFor(t, db, game.ID, 1)))
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

	var last submitGuessResponse
	for i, word := range wrongGuesses(t, answer, league_of_letters.MaxGuesses) {
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
	rec := submitGuess(t, srv, token, game.ID, wrongGuess(t, next))
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
			runes := []rune(wrongGuess(t, a))
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

	word := wrongGuess(t, answerFor(t, db, game.ID, 1))
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
	word := wrongGuess(t, answer)
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
	rec := submitGuess(t, srv, token, game.ID, wrongGuess(t, answer))

	if strings.Contains(strings.ToLower(rec.Body.String()), strings.ToLower(answer)) {
		t.Errorf("guess response leaked the answer %q: %s", answer, rec.Body)
	}
}

package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	league_of_letters "playhaus-api/internal/league-of-letters"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// startedMultiplayerGame is a game and the things a test needs to drive it.
type startedMultiplayerGame struct {
	multiplayerGameResponse
	lobbyCode string
}

// startedGame opens a room, seats everybody in it and starts it.
func startedGame(t *testing.T, h http.Handler, host sessionResponse, others ...sessionResponse) startedMultiplayerGame {
	t.Helper()

	lobby := createLobby(t, h, host.Token)

	for _, player := range others {
		if rec := joinLobby(t, h, player.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
		}
	}

	rec := do(t, h, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	started := decodeBody[lobbyResponse](t, rec)
	if started.GameID == "" {
		t.Fatal("a started room came back with no gameId")
	}

	rec = do(t, h, http.MethodGet, mpGamePath(started.GameID), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get game: status = %d (body: %s)", rec.Code, rec.Body)
	}

	return startedMultiplayerGame{
		multiplayerGameResponse: decodeBody[multiplayerGameResponse](t, rec),
		lobbyCode:               lobby.Code,
	}
}

// tokenFor is the session belonging to a user id, so a test can play as whoever
// the server says is up rather than assuming.
func tokenFor(t *testing.T, userID string, sessions ...sessionResponse) string {
	t.Helper()

	for _, session := range sessions {
		if session.User.ID == userID {
			return session.Token
		}
	}
	t.Fatalf("no session for user %q", userID)
	return ""
}

func submitMpGuess(t *testing.T, h http.Handler, token, gameID, word string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, mpGuessesPath(gameID), fmt.Sprintf(`{"word":%q}`, word), token)
}

// lolServiceFrom reaches the game service behind the handler, for the two things
// that have no route of their own: the turn timeout and the resume that follows an
// empty room. Both are driven by the socket rather than by a request, and waiting
// thirty-five seconds of wall clock to see one is not a test.
func lolServiceFrom(db *gorm.DB) *league_of_letters.Service {
	return league_of_letters.NewService(league_of_letters.NewGormStore(db))
}

func mustUUID(t *testing.T, id string) uuid.UUID {
	t.Helper()

	parsed, err := uuid.Parse(id)
	if err != nil {
		t.Fatalf("parse game id %q: %v", id, err)
	}
	return parsed
}

// A started game opens on the host, with a clock running and everybody on nought.
func TestStartLobbyDealsTheFirstTurn(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	if game.Mode != "multiplayer" {
		t.Errorf("mode = %q, want multiplayer", game.Mode)
	}
	if game.Status != string(league_of_letters.GameInProgress) {
		t.Errorf("status = %q, want in_progress", game.Status)
	}
	if len(game.Players) != 2 {
		t.Fatalf("got %d players, want 2", len(game.Players))
	}
	for _, player := range game.Players {
		if player.Score != 0 {
			t.Errorf("%s opened on %d, want 0", player.Name, player.Score)
		}
		if player.Name == "" || player.AvatarColorID == "" {
			t.Errorf("player %+v is missing what the scoreboard draws", player)
		}
	}

	// The host walked in first, so the host is up first.
	if game.Turn.UserID != host.User.ID {
		t.Errorf("turn = %q, want the host %q", game.Turn.UserID, host.User.ID)
	}

	endsAt, err := time.Parse(time.RFC3339, game.Turn.EndsAt)
	if err != nil {
		t.Fatalf("turn endsAt = %q: %v", game.Turn.EndsAt, err)
	}
	if left := time.Until(endsAt); left <= 0 || left > league_of_letters.SecondsPerTurn*time.Second {
		t.Errorf("turn has %s left, want up to %ds", left, league_of_letters.SecondsPerTurn)
	}

	// The board's countdown reads the round it is drawing, so the deadline has to
	// be on the round being played -- and on no other.
	for _, round := range game.Rounds {
		if round.RoundNumber == game.CurrentRound {
			if round.EndsAt != game.Turn.EndsAt {
				t.Errorf("round %d endsAt = %q, want the turn's %q", round.RoundNumber, round.EndsAt, game.Turn.EndsAt)
			}
		} else if round.EndsAt != "" {
			t.Errorf("round %d carries a deadline (%q) but is not being played", round.RoundNumber, round.EndsAt)
		}
	}
}

// The turn is the whole of the permission model on a shared board.
func TestSubmitMultiplayerGuessRefusesOutOfTurn(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	answer := answerFor(t, db, game.ID, 1)

	// Whoever is not up.
	waiting := tokenFor(t, game.Players[1].UserID, host, guest)
	if game.Turn.UserID == game.Players[1].UserID {
		waiting = tokenFor(t, game.Players[0].UserID, host, guest)
	}

	rec := submitMpGuess(t, srv, waiting, game.ID, wrongGuess(t, answer))
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "not_your_turn" {
		t.Errorf("code = %q, want %q", code, "not_your_turn")
	}
}

// Somebody who is not at the table cannot read the board, let alone play on it.
func TestMultiplayerGameIsForItsPlayersOnly(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)
	stranger := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	rec := do(t, srv, http.MethodGet, mpGamePath(game.ID), "", stranger.Token)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// A row lands, it scores, and the turn moves on.
func TestSubmitMultiplayerGuessScoresAndPassesTheTurn(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	answer := answerFor(t, db, game.ID, 1)
	up := tokenFor(t, game.Turn.UserID, host, guest)

	rec := submitMpGuess(t, srv, up, game.ID, wrongGuess(t, answer))
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	got := decodeBody[multiplayerGuessResponse](t, rec)
	if got.Guess.UserID != game.Turn.UserID {
		t.Errorf("guess userId = %q, want %q", got.Guess.UserID, game.Turn.UserID)
	}
	if got.Solved || got.RoundOver || got.GameOver {
		t.Errorf("a wrong first guess ended something: %+v", got)
	}
	// The opening letter is given away, so it is always in the right place -- which
	// makes every guess worth at least something.
	if len(got.Guess.Marks) != 5 {
		t.Errorf("got %d marks, want 5", len(got.Guess.Marks))
	}

	// It is now somebody else's turn, with a fresh clock.
	if got.Turn.UserID == game.Turn.UserID {
		t.Errorf("turn is still %q after they played", got.Turn.UserID)
	}

	// Checked as a duration rather than against the previous deadline: timestamps
	// go over the wire at second precision, and a guess played in the same second
	// the game started produces the same string for a clock that really did reset.
	endsAt, err := time.Parse(time.RFC3339, got.Turn.EndsAt)
	if err != nil {
		t.Fatalf("turn endsAt = %q: %v", got.Turn.EndsAt, err)
	}
	if left := time.Until(endsAt); left <= 0 || left > league_of_letters.SecondsPerTurn*time.Second {
		t.Errorf("the new turn has %s left, want a full %ds", left, league_of_letters.SecondsPerTurn)
	}

	// And the score went to the player who earned it, not to the table.
	for _, player := range got.Players {
		if player.UserID == game.Turn.UserID && player.Score == 0 {
			t.Error("the guesser scored nothing for a guess with the hint letter in it")
		}
		if player.UserID != game.Turn.UserID && player.Score != 0 {
			t.Errorf("%s scored %d for somebody else's guess", player.Name, player.Score)
		}
	}
}

// The board is shared, so a word somebody else has tried is as much of a repeat as
// one you tried yourself.
func TestSubmitMultiplayerGuessRefusesTheTablesDuplicates(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	answer := answerFor(t, db, game.ID, 1)
	word := wrongGuess(t, answer)

	first := tokenFor(t, game.Turn.UserID, host, guest)
	rec := submitMpGuess(t, srv, first, game.ID, word)
	if rec.Code != http.StatusCreated {
		t.Fatalf("first guess: status = %d (body: %s)", rec.Code, rec.Body)
	}

	// The next player, trying the same word.
	next := decodeBody[multiplayerGuessResponse](t, rec).Turn.UserID
	rec = submitMpGuess(t, srv, tokenFor(t, next, host, guest), game.ID, word)
	if rec.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
}

// Solving ends the round for everybody and opens the next one, hint and all.
func TestSubmitMultiplayerGuessSolvingOpensTheNextRound(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	answer := answerFor(t, db, game.ID, 1)
	up := tokenFor(t, game.Turn.UserID, host, guest)

	rec := submitMpGuess(t, srv, up, game.ID, answer)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	got := decodeBody[multiplayerGuessResponse](t, rec)
	if !got.Solved || !got.RoundOver {
		t.Errorf("Solved = %v, RoundOver = %v, want both true", got.Solved, got.RoundOver)
	}
	if got.GameOver {
		t.Errorf("GameOver on round 1 of %d", game.TotalRounds)
	}
	if got.Word != answer {
		t.Errorf("Word = %q, want %q -- a finished round tells its answer", got.Word, answer)
	}
	if got.CurrentRound != 2 {
		t.Errorf("CurrentRound = %d, want 2", got.CurrentRound)
	}

	// The next board is sent with the row that opened it, so nobody has to refetch
	// the game to draw it.
	if got.NextRound == nil {
		t.Fatal("no nextRound on the guess that ended round 1")
	}
	if got.NextRound.RoundNumber != 2 {
		t.Errorf("nextRound = %d, want 2", got.NextRound.RoundNumber)
	}
	if got.NextRound.FirstLetter == "" {
		t.Error("nextRound came with no hint letter, which the board opens every row with")
	}
	if got.NextRound.Word != "" {
		t.Errorf("nextRound leaked its answer %q", got.NextRound.Word)
	}

	// Round two opens on the second player: going first is shared out rather than
	// always landing on the host.
	if got.Turn.UserID == game.Turn.UserID {
		t.Errorf("round 2 opened on %q again, want the turn rotated", got.Turn.UserID)
	}
}

// Six rows end a round however they were filled, and the answer is told once there
// is nothing left to spoil.
func TestMultiplayerRoundRunsOutOfGuesses(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	answer := answerFor(t, db, game.ID, 1)

	turn := game.Turn.UserID
	var last multiplayerGuessResponse

	for i, word := range wrongGuesses(t, answer, league_of_letters.MaxGuesses) {
		rec := submitMpGuess(t, srv, tokenFor(t, turn, host, guest), game.ID, word)
		if rec.Code != http.StatusCreated {
			t.Fatalf("guess %d: status = %d (body: %s)", i+1, rec.Code, rec.Body)
		}

		last = decodeBody[multiplayerGuessResponse](t, rec)
		turn = last.Turn.UserID

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
}

// The board draws everybody's rows, so every row has to come back on the round --
// not only your own.
func TestMultiplayerBoardCarriesEverybodysRows(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	answer := answerFor(t, db, game.ID, 1)
	words := wrongGuesses(t, answer, 2)

	turn := game.Turn.UserID
	played := map[string]bool{}

	for i, word := range words {
		rec := submitMpGuess(t, srv, tokenFor(t, turn, host, guest), game.ID, word)
		if rec.Code != http.StatusCreated {
			t.Fatalf("guess %d: status = %d (body: %s)", i+1, rec.Code, rec.Body)
		}
		played[turn] = true
		turn = decodeBody[multiplayerGuessResponse](t, rec).Turn.UserID
	}

	// Read back by each player in turn: both have to see the same two rows.
	for _, session := range []sessionResponse{host, guest} {
		rec := do(t, srv, http.MethodGet, mpGamePath(game.ID), "", session.Token)
		fresh := decodeBody[multiplayerGameResponse](t, rec)

		round := fresh.Rounds[0]
		if len(round.Guesses) != 2 {
			t.Fatalf("%s sees %d rows, want 2", session.User.Name, len(round.Guesses))
		}
		for _, guess := range round.Guesses {
			if !played[guess.UserID] {
				t.Errorf("%s sees a row from %q, who did not play one", session.User.Name, guess.UserID)
			}
		}
	}
}

// Running the clock out costs the table a row rather than costing it nothing.
func TestSkipTurnSpendsARowAndMovesOn(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	// Driven directly rather than by waiting thirty-five seconds for the socket's
	// timer, which is the same call that timer makes.
	outcome, err := lolServiceFrom(db).SkipTurn(t.Context(), mustUUID(t, game.ID))
	if err != nil {
		t.Fatalf("skip turn: %v", err)
	}

	if !outcome.Guess.Skipped {
		t.Error("a timed-out turn did not record a skipped row")
	}
	if outcome.Guess.Word != "" {
		t.Errorf("a skipped row carries the word %q", outcome.Guess.Word)
	}
	if outcome.Guess.OwnerID != game.Turn.UserID {
		t.Errorf("skipped row belongs to %q, want the player who ran out of time %q",
			outcome.Guess.OwnerID, game.Turn.UserID)
	}
	if outcome.Solved || outcome.RoundOver {
		t.Errorf("one skipped row ended the round: %+v", outcome)
	}
	if outcome.Game.TurnUserID == game.Turn.UserID {
		t.Error("the turn did not move on after it ran out")
	}

	// Nobody scored for it, and the row is on the board for everybody.
	rec := do(t, srv, http.MethodGet, mpGamePath(game.ID), "", guest.Token)
	fresh := decodeBody[multiplayerGameResponse](t, rec)

	if len(fresh.Rounds[0].Guesses) != 1 {
		t.Fatalf("got %d rows, want the skipped one", len(fresh.Rounds[0].Guesses))
	}
	if !fresh.Rounds[0].Guesses[0].Skipped {
		t.Error("the skipped row does not say so on the wire, so the board cannot draw it")
	}
	for _, player := range fresh.Players {
		if player.Score != 0 {
			t.Errorf("%s scored %d for a turn nobody took", player.Name, player.Score)
		}
	}
}

// Six wasted turns spend the round exactly as six wrong words would.
func TestSkippedTurnsCanSpendAWholeRound(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	svc := lolServiceFrom(db)
	id := mustUUID(t, game.ID)

	var last *league_of_letters.MultiplayerGuessOutcome
	for i := range league_of_letters.MaxGuesses {
		outcome, err := svc.SkipTurn(t.Context(), id)
		if err != nil {
			t.Fatalf("skip %d: %v", i+1, err)
		}
		last = outcome
	}

	if !last.RoundOver {
		t.Error("six wasted turns did not end the round")
	}
	if last.Word == "" {
		t.Error("a spent round did not tell its answer")
	}
	if last.Game.CurrentRound != 2 {
		t.Errorf("CurrentRound = %d, want 2", last.Game.CurrentRound)
	}
}

// A game that ran out of rounds is over, and takes nothing further.
func TestMultiplayerGameEndsAfterItsLastRound(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	turn := game.Turn.UserID

	// Solved rather than skipped, so the game ends the way a game normally does.
	var last multiplayerGuessResponse
	for round := 1; round <= game.TotalRounds; round++ {
		answer := answerFor(t, db, game.ID, round)

		rec := submitMpGuess(t, srv, tokenFor(t, turn, host, guest), game.ID, answer)
		if rec.Code != http.StatusCreated {
			t.Fatalf("round %d: status = %d (body: %s)", round, rec.Code, rec.Body)
		}
		last = decodeBody[multiplayerGuessResponse](t, rec)
		turn = last.Turn.UserID
	}

	if !last.GameOver {
		t.Errorf("the last round did not end the game: %+v", last)
	}
	if last.NextRound != nil {
		t.Error("a finished game opened another round")
	}

	fresh := decodeBody[multiplayerGameResponse](t, do(t, srv, http.MethodGet, mpGamePath(game.ID), "", host.Token))
	if fresh.Status != string(league_of_letters.GameCompleted) {
		t.Errorf("status = %q, want completed", fresh.Status)
	}

	// And it takes nothing further.
	rec := submitMpGuess(t, srv, tokenFor(t, turn, host, guest), game.ID, "anything")
	if rec.Code != http.StatusConflict {
		t.Errorf("a finished game took a guess: status = %d (body: %s)", rec.Code, rec.Body)
	}
}

// A room whose deadline passed while nobody was connected gives the turn back
// whole rather than burning every turn between then and now.
func TestResumeTurnGivesBackAnExpiredTurn(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	svc := lolServiceFrom(db)
	id := mustUUID(t, game.ID)

	// The room emptied and the deadline went by.
	err := db.Exec(`UPDATE mp_lol_games SET turn_ends_at = ? WHERE id = ?`,
		time.Now().UTC().Add(-10*time.Minute), game.ID).Error
	if err != nil {
		t.Fatalf("expire the turn: %v", err)
	}

	endsAt, err := svc.ResumeTurn(t.Context(), id)
	if err != nil {
		t.Fatalf("resume turn: %v", err)
	}
	if !endsAt.After(time.Now().UTC()) {
		t.Errorf("resumed to %s, which is already past", endsAt)
	}

	// Same player, same round -- nothing was spent.
	fresh := decodeBody[multiplayerGameResponse](t, do(t, srv, http.MethodGet, mpGamePath(game.ID), "", host.Token))
	if fresh.Turn.UserID != game.Turn.UserID {
		t.Errorf("turn = %q, want it still to be %q", fresh.Turn.UserID, game.Turn.UserID)
	}
	if len(fresh.Rounds[0].Guesses) != 0 {
		t.Errorf("resuming spent %d rows", len(fresh.Rounds[0].Guesses))
	}
}

// A turn whose deadline has not passed is left exactly as it was: somebody joining
// must not hand the player up a fresh thirty-five seconds.
func TestResumeTurnLeavesALiveTurnAlone(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	endsAt, err := lolServiceFrom(db).ResumeTurn(t.Context(), mustUUID(t, game.ID))
	if err != nil {
		t.Fatalf("resume turn: %v", err)
	}

	want, err := time.Parse(time.RFC3339, game.Turn.EndsAt)
	if err != nil {
		t.Fatalf("parse endsAt: %v", err)
	}
	if !endsAt.Truncate(time.Second).Equal(want.Truncate(time.Second)) {
		t.Errorf("resumed to %s, want the deadline it already had, %s", endsAt, want)
	}
}

// A live room turns up in the reconnect list, under the code that gets you back
// into it.
func TestReconnectableGamesListsMultiplayerRooms(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	rec := do(t, srv, http.MethodGet, "/api/v1/reconnect-games", "", guest.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d (body: %s)", rec.Code, rec.Body)
	}

	games := decodeBody[[]ReconnectableGame](t, rec)

	var found bool
	for _, listed := range games {
		if listed.Type == LeagueOfLettersMultiplayer {
			found = true
			if listed.ID != game.lobbyCode {
				t.Errorf("listed id = %q, want the join code %q -- that is what the room screen opens on",
					listed.ID, game.lobbyCode)
			}
		}
	}
	if !found {
		t.Errorf("a game in progress is not in the reconnect list: %+v", games)
	}
}

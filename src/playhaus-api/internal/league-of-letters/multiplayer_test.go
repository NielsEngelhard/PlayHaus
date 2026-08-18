package league_of_letters

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// gameWith builds a game in memory: `players` seats, `rounds` rounds, sitting on
// round 1 with the first player up. No database -- advance is arithmetic on the
// board, and the point of testing it here is that it can be read.
func gameWith(players, rounds int) *MultiplayerLeagueOfLettersGame {
	game := &MultiplayerLeagueOfLettersGame{
		ID:           uuid.New(),
		CurrentRound: 1,
		Status:       GameInProgress,
		WordLength:   5,
	}

	for i := range players {
		game.Players = append(game.Players, MultiplayerGamePlayer{
			GameID:    game.ID,
			UserID:    string(rune('a' + i)),
			TurnOrder: i,
		})
	}
	for i := range rounds {
		game.Rounds = append(game.Rounds, LeagueOfLettersRound{
			ID:          uuid.New(),
			GameID:      game.ID,
			RoundNumber: i + 1,
			Word:        "kaars",
		})
	}

	game.TurnUserID = game.Players[0].UserID
	return game
}

// play puts a row on the current round. `solve` marks it as the answer, which is
// all advance reads off it.
func play(game *MultiplayerLeagueOfLettersGame, solve bool) {
	round := game.round(game.CurrentRound)

	guess := LeagueOfLettersGuess{
		ID:          uuid.New(),
		RoundID:     round.ID,
		OwnerID:     game.TurnUserID,
		GuessNumber: len(round.Guesses) + 1,
	}
	if solve {
		for _, r := range round.Word {
			guess.Letters = append(guess.Letters, LeagueOfLettersValidatedLetter{
				Letter: string(r), Status: LetterCorrect,
			})
		}
	}

	round.Guesses = append(round.Guesses, guess)
	game.advance(time.Now().UTC())
}

// The turn goes round the table, and comes back to the top.
func TestAdvanceRotatesTheTurn(t *testing.T) {
	game := gameWith(3, 4)

	want := []string{"b", "c", "a", "b"}
	for i, expected := range want {
		play(game, false)

		if game.TurnUserID != expected {
			t.Fatalf("after row %d the turn is %q, want %q", i+1, game.TurnUserID, expected)
		}
		if game.CurrentRound != 1 {
			t.Fatalf("after row %d the game is on round %d, want 1", i+1, game.CurrentRound)
		}
	}
}

// Every turn gets the full clock, whoever it belongs to.
func TestAdvanceResetsTheClock(t *testing.T) {
	game := gameWith(2, 2)

	play(game, false)

	left := time.Until(game.TurnEndsAt)
	if left <= 0 || left > SecondsPerTurn*time.Second {
		t.Errorf("the new turn has %s left, want a full %ds", left, SecondsPerTurn)
	}
}

// Solving ends the round wherever it happens, and the next one opens.
func TestAdvanceOpensTheNextRoundWhenSolved(t *testing.T) {
	game := gameWith(3, 3)

	play(game, true)

	if game.CurrentRound != 2 {
		t.Errorf("CurrentRound = %d, want 2", game.CurrentRound)
	}
	if game.Status != GameInProgress {
		t.Errorf("status = %q on round 2 of 3", game.Status)
	}
}

// Six rows end a round however they were filled.
func TestAdvanceOpensTheNextRoundWhenSpent(t *testing.T) {
	game := gameWith(2, 3)

	for range MaxGuesses {
		play(game, false)
	}

	if game.CurrentRound != 2 {
		t.Errorf("CurrentRound = %d, want 2 after %d rows", game.CurrentRound, MaxGuesses)
	}
}

// Going first is the turn that learns the least, so it is shared out rather than
// always landing on the host.
func TestAdvanceRotatesWhoOpensARound(t *testing.T) {
	game := gameWith(3, 4)

	// Round 1 opens on the first player, by construction.
	if game.TurnUserID != "a" {
		t.Fatalf("round 1 opened on %q, want %q", game.TurnUserID, "a")
	}

	want := []string{"b", "c", "a"}
	for i, expected := range want {
		play(game, true) // solve, which moves straight to the next round

		if game.TurnUserID != expected {
			t.Errorf("round %d opened on %q, want %q", i+2, game.TurnUserID, expected)
		}
	}
}

// The last round decided is the game over.
func TestAdvanceEndsTheGameAfterTheLastRound(t *testing.T) {
	game := gameWith(2, 2)

	play(game, true)
	if game.Status != GameInProgress {
		t.Fatalf("status = %q after round 1 of 2", game.Status)
	}

	play(game, true)
	if game.Status != GameCompleted {
		t.Errorf("status = %q after the last round, want completed", game.Status)
	}
	// And it does not run off the end of its own round list.
	if game.CurrentRound > len(game.Rounds) {
		t.Errorf("CurrentRound = %d, past the last round %d", game.CurrentRound, len(game.Rounds))
	}
}

// A skipped row is nobody's guess, so it can never be the answer -- and it still
// spends one of the round's six.
func TestSkippedRowsCountButNeverSolve(t *testing.T) {
	game := gameWith(2, 2)
	round := game.round(1)

	for i := range MaxGuesses {
		round.Guesses = append(round.Guesses, LeagueOfLettersGuess{
			ID:          uuid.New(),
			RoundID:     round.ID,
			GuessNumber: i + 1,
			Skipped:     true,
		})
	}

	if round.Solved() {
		t.Error("a round of skipped rows counts as solved")
	}
	if !round.IsOver() {
		t.Error("six skipped rows did not spend the round")
	}
}

// NextSeat has to leave a gap alone: somebody leaving takes their number out of
// the middle, and reusing it would put a new arrival ahead of people already
// waiting -- and, once the game starts, ahead of them in the turn order.
func TestNextSeatDoesNotReuseAVacatedSeat(t *testing.T) {
	lobby := MultiplayerLeagueOfLettersLobby{
		Players: []MultiplayerLobbyPlayer{{Seat: 0}, {Seat: 2}},
	}

	if got := lobby.NextSeat(); got != 3 {
		t.Errorf("NextSeat() = %d, want 3", got)
	}
}

func TestNextSeatOnAnEmptyRoom(t *testing.T) {
	var lobby MultiplayerLeagueOfLettersLobby

	if got := lobby.NextSeat(); got != 0 {
		t.Errorf("NextSeat() = %d, want 0", got)
	}
}

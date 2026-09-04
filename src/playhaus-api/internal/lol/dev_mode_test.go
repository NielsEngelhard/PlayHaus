package lol

import (
	"testing"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

// Dev mode used to hand every round one hard-coded five-letter word, which made the
// word length setting look broken in every mode: pick eight, play five.
func TestDevModeWordIsAsLongAsTheGameAskedFor(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	for _, length := range []int{MinWordLength, DefaultWordLength, MaxWordLength} {
		rounds, err := service.generateRounds(uuid.New(), 3, length, i18n.NL, true)
		if err != nil {
			t.Fatalf("generateRounds(%d): %v", length, err)
		}

		for _, round := range rounds {
			if len([]rune(round.Word)) != length {
				t.Errorf("round %d word = %q (%d letters), want %d",
					round.RoundNumber, round.Word, len([]rune(round.Word)), length)
			}
		}
	}
}

// The point of the flag: the same word every round, so a screen can be walked through
// without guessing at anything.
func TestDevModePlaysOneWordAllGame(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	rounds, err := service.generateRounds(uuid.New(), 4, DefaultWordLength, i18n.NL, true)
	if err != nil {
		t.Fatalf("generateRounds: %v", err)
	}

	for _, round := range rounds {
		if round.Word != rounds[0].Word {
			t.Fatalf("round %d word = %q, want the same %q every round",
				round.RoundNumber, round.Word, rounds[0].Word)
		}
	}
}

// Off, every round draws its own -- four rounds all landing on one word is possible in
// theory and would mean the flag leaked, so this asks the list for more than it could
// accidentally repeat.
func TestWithoutDevModeEachRoundDrawsItsOwnWord(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})

	rounds, err := service.generateRounds(uuid.New(), 8, DefaultWordLength, i18n.NL, true)
	if err != nil {
		t.Fatalf("generateRounds: %v", err)
	}

	seen := map[string]struct{}{}
	for _, round := range rounds {
		seen[round.Word] = struct{}{}
	}
	if len(seen) != len(rounds) {
		t.Errorf("drew %d distinct words across %d rounds, want one each", len(seen), len(rounds))
	}
}

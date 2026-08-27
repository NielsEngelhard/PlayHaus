package lol

import "testing"

// played builds a guess the way SubmitGuess does, so the marks under test are the
// ones Evaluate really produces rather than ones written out by hand.
func played(word, target string) LeagueOfLettersGuess {
	return LeagueOfLettersGuess{
		Word:    word,
		Letters: validatedLetters(word, target),
	}
}

func TestDetermineScore(t *testing.T) {
	const target = "melk"

	// p c c p -- the k and m are in the word but in each other's places.
	opening := played("kelm", target)

	// Two letters placed out of nowhere, two sighted for the first time. Nothing was
	// known going in, so every letter is news. Spelled out of the rules rather than
	// as a bare 12, so re-pricing a letter in rules.go moves this with it.
	wantOpening := 2*InstantCorrectPoints + 2*WrongPlacePoints
	if got := DetermineScore(opening, nil); got != wantOpening {
		t.Fatalf("opening guess scored %d, want %d", got, wantOpening)
	}

	// c c c c, and the answer.
	solving := played("melk", target)

	// The e and the l were already nailed down, so they pay nothing the second
	// time. The m and the k had only been sighted, so placing them is worth the
	// after-hint rate -- plus the flat bonus for landing the word.
	wantSolving := 2*CorrectAfterHintPoints + WordGuessedPoints
	if got := DetermineScore(solving, []LeagueOfLettersGuess{opening}); got != wantSolving {
		t.Fatalf("solving guess scored %d, want %d", got, wantSolving)
	}
}

func TestDetermineScoreIgnoresWhatIsAlreadyKnown(t *testing.T) {
	const target = "melk"

	first := played("kelm", target)

	// The same word again. Every letter repeats something the round has already
	// said, so it earns nothing at all -- which is the point of scoring against
	// the history rather than the marks alone.
	if got := DetermineScore(played("kelm", target), []LeagueOfLettersGuess{first}); got != 0 {
		t.Fatalf("repeated guess scored %d, want 0", got)
	}
}

func TestDetermineScoreSkipsAbsentLetters(t *testing.T) {
	// Nothing in common: four absent letters and no solve.
	if got := DetermineScore(played("vocht", "spaar"), nil); got != 0 {
		t.Fatalf("guess with nothing in it scored %d, want 0", got)
	}
}

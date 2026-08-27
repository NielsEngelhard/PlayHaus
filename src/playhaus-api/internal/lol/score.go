package lol

// DetermineScore is what one guess earned, given the guesses that came before it
// in the same round.
//
// `previousGuesses` is the round's history *without* `currentGuess` in it —
// SubmitGuess scores a guess before appending it, which is the only order in
// which "already known" means anything.
func DetermineScore(currentGuess LeagueOfLettersGuess, previousGuesses []LeagueOfLettersGuess) int {
	placed, spotted := createListOfAlreadyGuessedLetters(previousGuesses)

	score := 0
	for _, letter := range currentGuess.Letters {
		switch letter.Status {
		case LetterCorrect:
			switch {
			// Already nailed to a square in an earlier guess. Typing it again is
			// copying off your own board.
			case placed[letter.Letter]:
			// The round had already said this letter was in the word somewhere;
			// finding its square is the part that was still open.
			case spotted[letter.Letter]:
				score += CorrectAfterHintPoints
			default:
				score += InstantCorrectPoints
			}
		case LetterPresent:
			// Only the first sighting is news. A letter kept in the wrong place
			// across three guesses is one discovery, not three.
			if !placed[letter.Letter] && !spotted[letter.Letter] {
				score += WrongPlacePoints
			}
		}
	}

	if currentGuess.Correct() {
		score += WordGuessedPoints
	}

	return score
}

// createListOfAlreadyGuessedLetters splits what the round has revealed so far
// into the letters whose square is known and the letters only known to be in the
// word — the two states that change what the next sighting of them is worth.
//
// Both are keyed by the letter itself rather than by position: the player learns
// about letters, and a second E in the answer is not a second discovery.
func createListOfAlreadyGuessedLetters(guesses []LeagueOfLettersGuess) (placed, spotted map[string]bool) {
	placed = make(map[string]bool)
	spotted = make(map[string]bool)

	for _, guess := range guesses {
		for _, letter := range guess.Letters {
			switch letter.Status {
			case LetterCorrect:
				placed[letter.Letter] = true
			case LetterPresent:
				spotted[letter.Letter] = true
			}
		}
	}

	return placed, spotted
}

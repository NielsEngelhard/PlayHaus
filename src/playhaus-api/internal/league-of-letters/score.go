package league_of_letters

// What a guess is worth.
//
// The scale pays for information, not for being right. A letter you had no way
// of knowing is worth five; the same letter placed a second time is worth
// nothing, because the board already told you where it went. Landing a letter
// you had only ever seen as "somewhere in the word" sits between the two: the
// round gave you the hint, you did the placing.
//
// The effect is that the cheapest way to a high score is to learn something with
// every word, and that padding a solved round with repeats pays nothing.
const instantCorrectPoints = 5
const correctAfterHintPoints = 2
const wrongPlacePoints = 1
const wordGuessedPoints = 6

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
				score += correctAfterHintPoints
			default:
				score += instantCorrectPoints
			}
		case LetterPresent:
			// Only the first sighting is news. A letter kept in the wrong place
			// across three guesses is one discovery, not three.
			if !placed[letter.Letter] && !spotted[letter.Letter] {
				score += wrongPlacePoints
			}
		}
	}

	if currentGuess.Correct() {
		score += wordGuessedPoints
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

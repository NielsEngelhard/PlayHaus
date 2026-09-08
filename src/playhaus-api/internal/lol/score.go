package lol

import "strings"

// DetermineScore is what one guess earned, given the guesses that came before it in the same round and the letter the round handed out for free.
func DetermineScore(currentGuess LeagueOfLettersGuess, previousGuesses []LeagueOfLettersGuess, hintLetter string) int {
	placed, spotted := createListOfAlreadyGuessedLetters(previousGuesses)
	if hintLetter != "" {
		placed[strings.ToLower(hintLetter)] = true
	}

	score := 0
	for _, letter := range currentGuess.Letters {
		switch letter.Status {
		case LetterCorrect:
			switch {
			// Already nailed to a square in an earlier guess.
			case placed[letter.Letter]:
			// The round had already said this letter was in the word somewhere; finding its square is the part that was still open.
			case spotted[letter.Letter]:
				score += CorrectAfterHintPoints
			default:
				score += InstantCorrectPoints
			}
		case LetterPresent:
			// Only the first sighting is news.
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

// createListOfAlreadyGuessedLetters splits what the round has revealed into placed letters and letters only known to be in the word.
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

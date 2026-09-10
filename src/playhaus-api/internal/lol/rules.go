package lol

import (
	"math"
	"time"
)

const (
	MinLobbyPlayers = 2
	MaxLobbyPlayers = 4
)

const (
	MinWordLength = 4
	MaxWordLength = 8
)

const (
	MinSecondsPerTurn     = 10
	MaxSecondsPerTurn     = 100
	DefaultSecondsPerTurn = 35
)

const DefaultWordLength = 5

const MaxGuesses = 6

const multiplayerCommonWordsOnly = true

const (
	SoloRounds                = 3
	SmallTableUpTo            = 3
	RoundsPerPlayerSmallTable = 2
	RoundsPerPlayer           = 3
)

func RoundsFor(players int) int {
	switch {
	case players <= 1:
		return SoloRounds
	case players <= SmallTableUpTo:
		return players * RoundsPerPlayerSmallTable
	default:
		return players * RoundsPerPlayer
	}
}

const (
	InstantCorrectPoints   = 5
	CorrectAfterHintPoints = 2
	WrongPlacePoints       = 1
	WordGuessedPoints      = 6
)

func ValidWordLength(length int) bool {
	return length >= MinWordLength && length <= MaxWordLength
}

func RoundIsOver(solved bool, guesses int) bool {
	return solved || guesses >= MaxGuesses
}
func HintLetter(word string) string {
	if word == "" {
		return ""
	}
	return string([]rune(word)[0])
}

func OpenerSeat(roundNumber, players int) int {
	if players <= 0 {
		return 0
	}
	return (roundNumber - 1) % players
}

func SeatAfter(seat, players int) int {
	if players <= 0 {
		return 0
	}
	return (seat + 1) % players
}

func AlreadyGuessed(guesses []LeagueOfLettersGuess, word string) bool {
	for _, played := range guesses {
		if !played.Skipped && played.Word == word {
			return true
		}
	}
	return false
}

const (
	MaxTimeBonus       = 60
	FullTimeBonusUnder = time.Minute
	TimeBonusZeroAt    = 6 * time.Minute
)

// TimeBonus is what finishing a competitive run in this long is worth: full marks under a minute, nothing after six.
func TimeBonus(elapsed time.Duration) int {
	// The first branch also absorbs a negative duration from a clock going backwards.
	switch {
	case elapsed <= FullTimeBonusUnder:
		return MaxTimeBonus
	case elapsed >= TimeBonusZeroAt:
		return 0
	}

	left := float64(TimeBonusZeroAt - elapsed)
	window := float64(TimeBonusZeroAt - FullTimeBonusUnder)

	return int(math.Round(MaxTimeBonus * left / window))
}

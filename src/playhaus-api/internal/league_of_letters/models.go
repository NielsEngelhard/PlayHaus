type LeagueOfLettersGame struct {
	ID         string
	hostUserId string
	rounds     []LeagueOfLettersRound
}

type LeagueOfLettersRound struct {
	roundNumber uint8
	guesses     []LeagueOfLettersGuess
}

type LeagueOfLettersGuess struct {
	guessedWord   string
	guessNumber   uint8
	guesserUserId string
	result        GuessResult
}

type GuessResult struct {
	position uint8
}

type 
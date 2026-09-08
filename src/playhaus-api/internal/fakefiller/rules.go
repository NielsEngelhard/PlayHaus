package fakefiller

// The rules of Fake Filler, as functions of nothing but their arguments: no context, no store, no clock.

const (
	// Three is the real floor rather than a chosen one.
	MinLobbyPlayers = 3
	MaxLobbyPlayers = 9
)

// AnswersPerPlayer is how many prompts each player writes for.
const AnswersPerPlayer = 2

const (
	// TruthPoints is for picking the real answer out of the line-up.
	TruthPoints = 1
	// FooledPoints is for having written something a voter picked.
	FooledPoints = 1
)

// RoundsFor is how many prompts a game of this size deals.
func RoundsFor(players int) int {
	if players < 2 {
		return 0
	}
	return players * AnswersPerPlayer / 2
}

// AuthorSeats is which two seats were dealt round n, as a pair of indices into the shuffled seating.
func AuthorSeats(roundNumber, players int) (int, int) {
	if players < 2 {
		return 0, 0
	}
	first := (roundNumber - 1) % players
	return first, (first + 1) % players
}

// OptionsPerRound is how many things a voter is shown: the two fakes, plus the truth in the mode that has one.
func OptionsPerRound(mode FFGameMode) int {
	if mode.HasTruth() {
		return AnswersPerPlayer + 1
	}
	return AnswersPerPlayer
}

// VotersFor is how many players are expected to vote on any one round: everybody except its two authors.
func VotersFor(players int) int {
	voters := players - AnswersPerPlayer
	if voters < 0 {
		return 0
	}
	return voters
}

// AnswersFor is how many fills a whole game is waiting on before voting can open.
func AnswersFor(players int) int { return RoundsFor(players) * AnswersPerPlayer }

// ValidPlayerCount reports whether a table of this size can be dealt a game.
func ValidPlayerCount(players int) bool {
	return players >= MinLobbyPlayers && players <= MaxLobbyPlayers
}

// ScoreVote is what one vote is worth, split between the person who cast it and the person who wrote the thing they picked.
func ScoreVote(mode FFGameMode, votedForAuthorID string) (guesser, author int) {
	if votedForAuthorID == TruthAuthorID {
		if mode.HasTruth() {
			return TruthPoints, 0
		}
		return 0, 0
	}
	return 0, FooledPoints
}

// EligibleVoter reports whether a player may vote on a round: everybody except the two people who wrote for it.
func EligibleVoter(round FFRound, userID string) bool {
	return !round.WrittenBy(userID)
}

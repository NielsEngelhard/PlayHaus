package fakefiller

// The rules of Fake Filler, as functions of nothing but their arguments: no context, no store, no clock.

const (
	// Two is the real floor rather than a chosen one: a prompt needs somebody to write a fake and somebody to be fooled by it.
	MinLobbyPlayers = 2
	MaxLobbyPlayers = 9
)

// MinPlayersWithoutTruth is the floor for a mode whose line-up is nothing but the fakes, where a table of two would leave the guesser one thing to pick from.
const MinPlayersWithoutTruth = 3

// AnswersPerPlayer is how many prompts each player writes for.
const AnswersPerPlayer = 2

const (
	// TruthPoints is for picking the real answer out of the line-up.
	TruthPoints = 1
	// FooledPoints is for having written something a voter picked.
	FooledPoints = 1
)

// AuthorsPerRound is how many players write for one prompt: two, except at a table of two, where one writes and the other guesses.
func AuthorsPerRound(players int) int {
	if players <= 2 {
		return 1
	}
	return 2
}

// RoundsFor is how many prompts a game of this size deals.
func RoundsFor(players int) int {
	if players < MinLobbyPlayers {
		return 0
	}
	return players * AnswersPerPlayer / AuthorsPerRound(players)
}

// AuthorSeats is which seats were dealt round n, as indices into the shuffled seating.
func AuthorSeats(roundNumber, players int) []int {
	if players < MinLobbyPlayers {
		return nil
	}
	first := (roundNumber - 1) % players
	if AuthorsPerRound(players) == 1 {
		return []int{first}
	}
	return []int{first, (first + 1) % players}
}

// OptionsPerRound is how many things a voter is shown: the fakes, plus the truth in the mode that has one.
func OptionsPerRound(mode FFGameMode, players int) int {
	if mode.HasTruth() {
		return AuthorsPerRound(players) + 1
	}
	return AuthorsPerRound(players)
}

// VotersFor is how many players are expected to vote on any one round: everybody except its authors.
func VotersFor(players int) int {
	voters := players - AuthorsPerRound(players)
	if voters < 0 {
		return 0
	}
	return voters
}

// AnswersFor is how many fills a whole game is waiting on before voting can open.
func AnswersFor(players int) int { return RoundsFor(players) * AuthorsPerRound(players) }

// MinPlayersFor is the floor a mode can be started on, which is not the same for both of them.
func MinPlayersFor(mode FFGameMode) int {
	if mode.HasTruth() {
		return MinLobbyPlayers
	}
	return MinPlayersWithoutTruth
}

// ValidPlayerCount reports whether a table of this size can be dealt a game in this mode.
func ValidPlayerCount(mode FFGameMode, players int) bool {
	return players >= MinPlayersFor(mode) && players <= MaxLobbyPlayers
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

// EligibleVoter reports whether a player may vote on a round: everybody except the people who wrote for it.
func EligibleVoter(round FFRound, userID string) bool {
	return !round.WrittenBy(userID)
}

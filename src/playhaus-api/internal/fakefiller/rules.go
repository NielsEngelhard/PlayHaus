package fakefiller

// The rules of Fake Filler, as functions of nothing but their arguments: no context, no
// store, no clock. Everything here is asked the same question by the service and by the
// HTTP layer, so a rule lives in exactly one place.

const (
	// Three is the real floor rather than a chosen one: a round is written by two people
	// and voted on by everybody else, so a table of two would deal every prompt to both
	// players and leave nobody to vote.
	MinLobbyPlayers = 3
	MaxLobbyPlayers = 9
)

// AnswersPerPlayer is how many prompts each player writes for, and it is the number the
// whole shape of a game falls out of.
const AnswersPerPlayer = 2

const (
	// TruthPoints is for picking the real answer out of the line-up.
	TruthPoints = 1
	// FooledPoints is for having written something a voter picked.
	FooledPoints = 1
)

// RoundsFor is how many prompts a game of this size deals.
//
// Every player writes AnswersPerPlayer prompts and every prompt takes two authors, so the
// count is players*2/2 -- which is to say a game has exactly as many rounds as it has
// players. The arithmetic is written out rather than folded into "return players" so that
// changing AnswersPerPlayer changes the answer instead of quietly disagreeing with it.
func RoundsFor(players int) int {
	if players < 2 {
		return 0
	}
	return players * AnswersPerPlayer / 2
}

// AuthorSeats is which two seats were dealt round n, as a pair of indices into the shuffled
// seating.
//
// Each player must author exactly two prompts and each prompt exactly two players, which
// makes the author graph 2-regular -- and the simplest 2-regular graph on n vertices is a
// single cycle. So round 1 is seats 0 and 1, round 2 is seats 1 and 2, and the last round
// closes the ring back onto seat 0. Every player appears in exactly two rounds, and because
// n is at least 3 the two seats of a round are never the same person.
//
// roundNumber is 1-based. A players count below 2 has no pairing and comes back (0, 0).
func AuthorSeats(roundNumber, players int) (int, int) {
	if players < 2 {
		return 0, 0
	}
	first := (roundNumber - 1) % players
	return first, (first + 1) % players
}

// OptionsPerRound is how many things a voter is shown: the two fakes, plus the truth in the
// mode that has one.
func OptionsPerRound(mode FFGameMode) int {
	if mode.HasTruth() {
		return AnswersPerPlayer + 1
	}
	return AnswersPerPlayer
}

// VotersFor is how many players are expected to vote on any one round: everybody except its
// two authors.
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

// ScoreVote is what one vote is worth, split between the person who cast it and the person
// who wrote the thing they picked.
//
// A guesser scores only for finding the truth, and only in a mode that has one; an author
// scores whenever somebody picks their fake. The truth has no author to pay, which is why
// the second return is zero for it -- TruthAuthorID is not a player.
func ScoreVote(mode FFGameMode, votedForAuthorID string) (guesser, author int) {
	if votedForAuthorID == TruthAuthorID {
		if mode.HasTruth() {
			return TruthPoints, 0
		}
		return 0, 0
	}
	return 0, FooledPoints
}

// EligibleVoter reports whether a player may vote on a round: everybody except the two
// people who wrote for it.
//
// Not a timing question -- it says nothing about whether the table has reached this round
// -- but a question about who this round belongs to, which never changes once the prompts
// are dealt. The screen uses it to know which of its own prompts it is only watching.
func EligibleVoter(round FFRound, userID string) bool {
	return !round.WrittenBy(userID)
}

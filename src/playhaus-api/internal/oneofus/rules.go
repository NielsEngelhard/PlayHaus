package oneofus

import "slices"

const (
	MinPlayers = 3
	MaxPlayers = 9
)

func PlayerCountOK(n int) bool {
	return n >= MinPlayers && n <= MaxPlayers
}

const SeatsInInputOrder = true

const (
	PlayersPerImposter        = 3
	MinImposters              = 1
	ImpostersRedrawnEachRound = true
)

func ImpostersFor(players int) int {
	return max(players/PlayersPerImposter, MinImposters)
}

const (
	// MinImpostersForNitwit is the imposter count a table has to be dealing before one
	// of them is turned into the nitwit.
	//
	// Three, because the nitwit is taken out of the imposters rather than added to
	// them: a table dealing two would be left with a single ordinary imposter and
	// somebody who cannot help them, which is a harder game for the liars than the
	// ratio was ever meant to be. At three there are still two imposters who know the
	// word, so the side is playable and the nitwit is a bonus problem rather than the
	// whole of it.
	MinImpostersForNitwit = 3
	// MaxNitwits is one, always. Two people with nothing to go on would find each other
	// in a round -- a pair of players saying nothing in particular is a pattern -- and
	// the role is only frightening while you are the only one in it.
	MaxNitwits = 1
)

// NitwitsFor is how many of a table's imposters are dealt as the nitwit instead.
//
// Zero or one, and it is derived from the imposter count rather than from the player
// count so that re-pricing PlayersPerImposter moves both together. Today only a full
// table of nine reaches three imposters, so the nitwit is the nine-player game's role.
func NitwitsFor(players int) int {
	if ImpostersFor(players) < MinImpostersForNitwit {
		return 0
	}

	return MaxNitwits
}

// imposterRoles is every role that may be dealt in place of a civilian, and so every
// role a host is allowed to switch off.
//
// Deliberately a list of the roles rather than "everything that is not a civilian":
// Role is an int, so a predicate written the negative way would call an unknown number
// arriving off the wire a perfectly good imposter role and deal it to somebody. The
// civilian is absent because a table of nothing but liars has nobody to lie to, and the
// mayor is absent because it was never a Role in the first place -- see the note on
// IsMayor. Both are always in the game, and neither is a switch.
var imposterRoles = []Role{Imposter, Nitwit}

// ImposterRoles is the whole set, and the set a table falls back to when nobody has
// said otherwise. A copy, because the caller is handed something it will want to filter.
func ImposterRoles() []Role {
	return append([]Role(nil), imposterRoles...)
}

// ImposterRoleSetOK says whether a set of roles is one this game can be dealt from.
//
// Three ways to fail: something in it is not an imposter role at all (a civilian, a
// mayor that never was one, an int nobody has defined yet), the same role is in it
// twice, or it is empty. The last is the one worth naming -- a table with every liar
// switched off is not a quiet game of nothing but civilians, it is a game with no win
// condition, because the civilians only win by voting out an imposter that does not
// exist.
func ImposterRoleSetOK(roles []Role) bool {
	if len(roles) == 0 {
		return false
	}

	for index, role := range roles {
		if !slices.Contains(imposterRoles, role) {
			return false
		}

		if slices.Contains(roles[:index], role) {
			return false
		}
	}

	return true
}

// RolesFor is the hand a table's liars are dealt -- one role per imposter seat -- given
// which imposter roles were left switched on.
//
// The length is always ImpostersFor, whatever is enabled: the setting says what the
// liars may be, never how many of them there are. A role switched off moves its seats
// onto another enabled role rather than handing them back to the civilians, because the
// win condition in determineGameEnded is priced off the ratio ImpostersFor promises, and
// a table that quietly dealt fewer liars would be a different game than the one the
// setting offered to change.
//
// An unusable set is not an error here. This is a pure rule with no way to report one,
// and the two callers that could hand it a bad set -- a request that got past Validate,
// a test written before this existed -- are both better served by the full game than by
// a table with no roles on it. The wire is where an empty set is refused.
func RolesFor(players int, enabled []Role) []Role {
	seats := ImpostersFor(players)
	if seats <= 0 || seats > players {
		return nil
	}

	if !ImposterRoleSetOK(enabled) {
		enabled = imposterRoles
	}

	nitwits := 0

	switch {
	case !slices.Contains(enabled, Nitwit):
		nitwits = 0
	case !slices.Contains(enabled, Imposter):
		// Nothing left to be dealt beside, so MaxNitwits does not apply. That cap is
		// there to keep the nitwit a bonus problem sitting next to two imposters who do
		// know the word; with the imposter switched off there are none for them to sit
		// next to, and the whole of the liars' side plays blind. That is the game the
		// switch was thrown for, not an accident to clamp back to one.
		nitwits = seats
	default:
		// Clamped against the seats rather than trusted, the same way the old deal
		// clamped it: NitwitsFor only says yes once there are three imposters to promote
		// one out of, but a future change to either number should deal a strange table
		// rather than slice past the end of the hand.
		nitwits = min(NitwitsFor(players), seats)
	}

	hand := make([]Role, 0, seats)

	for range nitwits {
		hand = append(hand, Nitwit)
	}

	for range seats - nitwits {
		hand = append(hand, Imposter)
	}

	return hand
}

const (
	// MayorsPerTable is one, always, and that is the whole of the office: a tie needs a
	// casting vote, and a casting vote shared between two people is another tie.
	MayorsPerTable = 1
	// MayorMayBeAnImposter says the chain is drawn from the whole table rather than
	// from the civilians. Written down rather than left implicit in MayorCandidates
	// because it is the rule that surprises people: the table can spend a whole game
	// letting the person they are hunting decide who goes home.
	MayorMayBeAnImposter = true
)

// MayorCandidates is every seat that may hold the chain, as indices into players.
//
// Being alive is the only test. Role is deliberately not read here -- see
// MayorMayBeAnImposter -- and neither is who held it before, because the office is
// redrawn from scratch each time rather than passed to a neighbour: passing it round the
// ring would make the next mayor guessable from the seating, and a tie-breaker whose
// identity can be predicted is a tie-breaker that can be played around.
//
// Indices rather than players so the caller can write back into its own slice, the same
// shape assignRoles works in.
func MayorCandidates(players []OneOfUsLocalPlayer) []int {
	candidates := make([]int, 0, len(players))

	for index, player := range players {
		if player.IsVotedOut {
			continue
		}

		candidates = append(candidates, index)
	}

	return candidates
}

const Rounds = 4

type GameMode string

const (
	Word     GameMode = "word"
	Sentence GameMode = "sentence"
)

const DefaultMode = Sentence

func ModeFor(wordOnly bool) GameMode {
	if wordOnly {
		return Word
	}

	return DefaultMode
}

type Phase string

const (
	PhaseDeal    Phase = "deal"
	PhaseAnswer  Phase = "answer"
	PhaseDiscuss Phase = "discuss"
	PhaseVote    Phase = "vote"
	PhaseReveal  Phase = "reveal"
)

var phaseOrder = []Phase{PhaseDeal, PhaseAnswer, PhaseDiscuss, PhaseVote, PhaseReveal}

func Phases() []Phase {
	return append([]Phase(nil), phaseOrder...)
}

func NextPhase(p Phase) Phase {
	for i, phase := range phaseOrder {
		if phase == p && i+1 < len(phaseOrder) {
			return phaseOrder[i+1]
		}
	}

	return p
}

const (
	DiscussSeconds = 90
	VoteSeconds    = 30
)

const (
	VotesPerPlayer   = 1
	SelfVotesAllowed = false
	MinVotesToCatch  = 2
)

func Caught(votes int) bool {
	return votes >= MinVotesToCatch
}

func CanVoteFor(voter, accused int) bool {
	return SelfVotesAllowed || voter != accused
}

const (
	CorrectVotePoints    = 2
	ImposterEscapePoints = 3
	ImposterCaughtPoints = 0
)

func VotePoints(votedForImposter bool) int {
	if votedForImposter {
		return CorrectVotePoints
	}

	return 0
}

func ImposterPoints(caught bool) int {
	if caught {
		return ImposterCaughtPoints
	}

	return ImposterEscapePoints
}

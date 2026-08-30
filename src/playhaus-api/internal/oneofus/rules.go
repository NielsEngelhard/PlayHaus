package oneofus

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

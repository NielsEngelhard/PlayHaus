package oneofus

const (
	MinPlayers = 3
	MaxPlayers = 10
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

package oneofus

import (
	"slices"
	"strings"
)

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
	// MinImpostersForNitwit is the imposter count a table has to be dealing before one of them is turned into the nitwit.
	MinImpostersForNitwit = 3
	// MaxNitwits is one, always.
	MaxNitwits = 1
)

// NitwitsFor is how many of a table's imposters are dealt as the nitwit instead.
func NitwitsFor(players int) int {
	if ImpostersFor(players) < MinImpostersForNitwit {
		return 0
	}

	return MaxNitwits
}

// imposterRoles is every role that may be dealt in place of a civilian.
var imposterRoles = []Role{Imposter, Nitwit}

// ImposterRoles is the whole set, and the set a table falls back to when nobody has said otherwise.
func ImposterRoles() []Role {
	return append([]Role(nil), imposterRoles...)
}

// ImposterRoleSetOK says whether a set of roles is one this game can be dealt from.
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

// RolesFor is the hand a table's liars are dealt.
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
		// Nothing left to be dealt beside, so MaxNitwits does not apply.
		nitwits = seats
	default:
		// Clamped against the seats rather than trusted, the same way the old deal clamped it.
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
	// MayorsPerTable is one, always, and that is the whole of the office.
	MayorsPerTable = 1
	// MayorMayBeAnImposter says the chain is drawn from the whole table rather than from the civilians.
	MayorMayBeAnImposter = true
)

// MayorCandidates is every seat that may hold the chain, as indices into players.
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

// Valid says whether a mode is one this game knows how to draw prompts for.
func (m GameMode) Valid() bool {
	return m == Word || m == Sentence
}

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

// GameEnded reads a count of the living and says whether the game is over, and whether it is over because the imposters are gone.
func GameEnded(civilians, active int) (bool, bool) {
	civiliansInMinority := civilians <= active/2
	noMoreImposters := active == civilians

	return civiliansInMinority || noMoreImposters, noMoreImposters
}

// PromptFor is the line one role is playing on, and the empty string for the one who is given none.
func PromptFor(role Role, actual, imposter string) string {
	switch role {
	case Nitwit:
		return ""
	case Imposter:
		return imposter
	default:
		return actual
	}
}

// MaxAnswerRunes caps a typed answer. The prompt may be a word or a sentence, but the answer is a free clue either way, so there is one cap and not one per mode.
const MaxAnswerRunes = 140

// NormaliseAnswer trims an answer and collapses its inner whitespace, so two answers cannot differ by spacing alone.
func NormaliseAnswer(text string) string {
	return strings.Join(strings.Fields(text), " ")
}

// AnswerOK says whether a normalised answer is one this game will accept.
func AnswerOK(text string) bool {
	length := len([]rune(text))

	return length > 0 && length <= MaxAnswerRunes
}

// CanVoteForUser is the user-id-keyed sibling of CanVoteFor.
func CanVoteForUser(voter, accused string) bool {
	return SelfVotesAllowed || voter != accused
}

// LivingSeats is every index into players still in the game, the OOUGamePlayer sibling of MayorCandidates.
func LivingSeats(players []OOUGamePlayer) []int {
	seats := make([]int, 0, len(players))

	for index, player := range players {
		if player.IsVotedOut {
			continue
		}

		seats = append(seats, index)
	}

	return seats
}

// Tally counts a round's votes per accused player.
func Tally(votes []OOUVote) map[string]int {
	tally := make(map[string]int, len(votes))

	for _, vote := range votes {
		tally[vote.AccusedUserID]++
	}

	return tally
}

// Eliminate is the plurality count with the mayor's vote as the casting one. It assumes every living player has voted, which is what makes the mayor's vote always present.
func Eliminate(players []OOUGamePlayer, votes []OOUVote) (string, int, bool) {
	tally := Tally(votes)
	if len(tally) == 0 {
		return "", 0, false
	}

	seated := append([]OOUGamePlayer(nil), players...)
	slices.SortFunc(seated, func(a, b OOUGamePlayer) int { return a.Seat - b.Seat })

	best := 0

	for _, count := range tally {
		if count > best {
			best = count
		}
	}

	// Leaders in seat order, so a tie the mayor cannot settle still resolves the same way every time.
	leaders := make([]string, 0, len(seated))
	mayor := ""

	for _, player := range seated {
		if player.IsVotedOut {
			continue
		}

		if player.IsMayor {
			mayor = player.UserID
		}

		if tally[player.UserID] == best {
			leaders = append(leaders, player.UserID)
		}
	}

	if len(leaders) == 0 {
		return "", 0, false
	}

	if len(leaders) == 1 {
		return leaders[0], best, false
	}

	// The chain decides. A tied mayor can never take themselves, because a self-vote is impossible.
	for _, vote := range votes {
		if vote.VoterUserID == mayor && slices.Contains(leaders, vote.AccusedUserID) {
			return vote.AccusedUserID, best, true
		}
	}

	return leaders[0], best, true
}

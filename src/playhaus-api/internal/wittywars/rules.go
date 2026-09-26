package wittywars

import (
	"strings"
	"unicode/utf8"
)

// The rules of Witty Wars, as functions of nothing but their arguments: no context, no store, no clock.

const (
	// Three is the real floor: two to write a prompt and one to judge it.
	MinLobbyPlayers = 3
	MaxLobbyPlayers = 8
)

// How many prompts each player writes for: the host's choice, between the two bounds.
const (
	DefaultAnswersPerPlayer = 3
	MinAnswersPerPlayer     = 2
	MaxAnswersPerPlayer     = 4
)

// AuthorsPerRound is how many players answer one prompt: always a duel.
const AuthorsPerRound = 2

// MaxAnswerLength is counted in characters, not bytes, so an accent costs the same as any other letter.
const MaxAnswerLength = 75

const (
	// VotePoints is paid to a writer for every vote their answer draws.
	VotePoints = 1
	// SweepBonus is paid on top to a writer who took every vote on a round.
	SweepBonus = 1
)

// Placeholder is where a player's name is put into a prompt, and the single source of truth for its spelling.
const Placeholder = "{playerName}"

// ValidAnswersPerPlayer reports whether a table can be dealt this many prompts each.
func ValidAnswersPerPlayer(answersPerPlayer int) bool {
	return answersPerPlayer >= MinAnswersPerPlayer && answersPerPlayer <= MaxAnswersPerPlayer
}

// ValidPlayerCount reports whether a table of this size can be dealt a game.
func ValidPlayerCount(players int) bool {
	return players >= MinLobbyPlayers && players <= MaxLobbyPlayers
}

// RoundsFor is how many prompts a game of this size deals. Rounded up, so an odd total costs nobody a turn.
func RoundsFor(players, answersPerPlayer int) int {
	if players < AuthorsPerRound || answersPerPlayer <= 0 {
		return 0
	}
	return (players*answersPerPlayer + AuthorsPerRound - 1) / AuthorsPerRound
}

// DealSeats pairs the shuffled seating into duels, one pair per round, so every seat writes answersPerPlayer times (one more for a seat an odd total leaves over).
func DealSeats(players, answersPerPlayer int) [][2]int {
	if players < AuthorsPerRound || answersPerPlayer <= 0 {
		return nil
	}

	var pairs [][2]int
	// Each lap pairs every seat with the one a fixed distance on, which costs every seat two answers; the distance moves on so the duels vary.
	for lap := 0; lap < answersPerPlayer/2; lap++ {
		distance := 1 + lap%(players-1)
		for seat := 0; seat < players; seat++ {
			pairs = append(pairs, [2]int{seat, (seat + distance) % players})
		}
	}
	// An odd answer count is one answer each: neighbours paired off, and an odd seat out paired with the first.
	if answersPerPlayer%2 == 1 {
		for seat := 0; seat+1 < players; seat += 2 {
			pairs = append(pairs, [2]int{seat, seat + 1})
		}
		if players%2 == 1 {
			pairs = append(pairs, [2]int{players - 1, 0})
		}
	}
	return pairs
}

// VotersFor is how many players vote on any one round: everybody except its two writers.
func VotersFor(players int) int {
	voters := players - AuthorsPerRound
	if voters < 0 {
		return 0
	}
	return voters
}

// AnswersFor is how many answers a whole game is waiting on before voting can open.
func AnswersFor(players, answersPerPlayer int) int {
	return RoundsFor(players, answersPerPlayer) * AuthorsPerRound
}

// HasPlaceholder reports whether a prompt names a player.
func HasPlaceholder(line string) bool {
	return strings.Contains(line, Placeholder)
}

// ResolveLine puts a name into every placeholder in a prompt.
func ResolveLine(line, name string) string {
	return strings.ReplaceAll(line, Placeholder, name)
}

// NormaliseAnswer trims an answer and reports whether it is fit to send: not blank, and not too long.
func NormaliseAnswer(answer string) (string, error) {
	answer = strings.TrimSpace(answer)
	if answer == "" {
		return "", ErrInvalidInput
	}
	if utf8.RuneCountInString(answer) > MaxAnswerLength {
		return "", ErrAnswerTooLong
	}
	return answer, nil
}

// SameAnswer reports whether two answers read the same, ignoring case; answers arrive already trimmed.
func SameAnswer(a, b string) bool {
	return strings.EqualFold(a, b)
}

// GroupSameAnswers buckets answers that read the same, keeping first-seen order, so two identical answers share one slot.
func GroupSameAnswers(options []WWOption) [][]WWOption {
	var groups [][]WWOption
	for _, option := range options {
		placed := false
		for i := range groups {
			if SameAnswer(groups[i][0].Answer, option.Answer) {
				groups[i] = append(groups[i], option)
				placed = true
				break
			}
		}
		if !placed {
			groups = append(groups, []WWOption{option})
		}
	}
	return groups
}

// EligibleVoter reports whether a player may vote on a round: everybody except the two people who wrote for it.
func EligibleVoter(round WWRound, userID string) bool {
	return !round.WrittenBy(userID)
}

// VotesPerSlot counts a round's votes by the slot they landed in.
func VotesPerSlot(round WWRound) map[int]int {
	counts := map[int]int{}
	for _, vote := range round.Votes {
		if option := round.Option(vote.VotedForAuthorID); option != nil {
			counts[option.Slot]++
		}
	}
	return counts
}

// SweepSlot is the slot that took every vote on a round, or -1 when the votes were split or there were none.
func SweepSlot(round WWRound) int {
	counts := VotesPerSlot(round)
	if len(counts) != 1 {
		return -1
	}
	for slot := range counts {
		return slot
	}
	return -1
}

// PointsFor is what one answer earned on a round: a point a vote, and the bonus if it swept.
func PointsFor(round WWRound, slot int) int {
	points := VotesPerSlot(round)[slot] * VotePoints
	if slot >= 0 && SweepSlot(round) == slot {
		points += SweepBonus
	}
	return points
}

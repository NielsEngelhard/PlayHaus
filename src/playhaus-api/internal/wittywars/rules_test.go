package wittywars

import (
	"errors"
	"strings"
	"testing"
)

// Every player writes as many answers as the setting says, give or take the one extra prompt an odd total rounds up to.
func TestEveryPlayerIsDealtTheirShareOfPrompts(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		for answers := MinAnswersPerPlayer; answers <= MaxAnswersPerPlayer; answers++ {
			dealt := make([]int, players)
			pairs := DealSeats(players, answers)
			if len(pairs) != RoundsFor(players, answers) {
				t.Fatalf("%d players, %d answers: dealt %d pairs, want %d rounds", players, answers, len(pairs), RoundsFor(players, answers))
			}
			for round, seats := range pairs {
				if seats[0] == seats[1] {
					t.Fatalf("%d players, round %d: one player was dealt both sides of the duel", players, round)
				}
				for _, seat := range seats {
					dealt[seat]++
				}
			}
			for seat, count := range dealt {
				if count < answers || count > answers+1 {
					t.Errorf("%d players, %d answers: seat %d was dealt %d prompts", players, answers, seat, count)
				}
			}
		}
	}
}

func TestEverybodyButTheTwoWritersVotes(t *testing.T) {
	if got := VotersFor(3); got != 1 {
		t.Errorf("VotersFor(3) = %d, want 1", got)
	}
	if got := VotersFor(8); got != 6 {
		t.Errorf("VotersFor(8) = %d, want 6", got)
	}
}

func TestAnAnswerIsTrimmedAndHeldToItsLength(t *testing.T) {
	if got, err := NormaliseAnswer("  a cat called Dog  "); err != nil || got != "a cat called Dog" {
		t.Errorf("NormaliseAnswer = %q, %v", got, err)
	}
	if _, err := NormaliseAnswer("   "); !errors.Is(err, ErrInvalidInput) {
		t.Errorf("a blank answer: %v, want ErrInvalidInput", err)
	}
	if _, err := NormaliseAnswer(strings.Repeat("é", MaxAnswerLength)); err != nil {
		t.Errorf("an answer of exactly the limit in accented letters was refused: %v", err)
	}
	if _, err := NormaliseAnswer(strings.Repeat("a", MaxAnswerLength+1)); !errors.Is(err, ErrAnswerTooLong) {
		t.Errorf("an answer over the limit: %v, want ErrAnswerTooLong", err)
	}
}

func TestThePlaceholderIsFilledWithAName(t *testing.T) {
	line := "What is always on " + Placeholder + "'s mind?"
	if !HasPlaceholder(line) {
		t.Fatal("HasPlaceholder missed the placeholder")
	}
	if got := ResolveLine(line, "Sam"); got != "What is always on Sam's mind?" {
		t.Errorf("ResolveLine = %q", got)
	}
}

func roundWithVotes(votesForOne, votesForTwo int) WWRound {
	round := WWRound{
		AuthorOneUserID: "one",
		AuthorTwoUserID: "two",
		Options: []WWOption{
			{AuthorID: "one", Answer: "left", Slot: 0},
			{AuthorID: "two", Answer: "right", Slot: 1},
		},
	}
	voter := 0
	for range votesForOne {
		round.Votes = append(round.Votes, WWVote{VoterUserID: string(rune('a' + voter)), VotedForAuthorID: "one"})
		voter++
	}
	for range votesForTwo {
		round.Votes = append(round.Votes, WWVote{VoterUserID: string(rune('a' + voter)), VotedForAuthorID: "two"})
		voter++
	}
	return round
}

func TestTakingEveryVoteEarnsTheSweepBonus(t *testing.T) {
	round := roundWithVotes(3, 0)
	if got := SweepSlot(round); got != 0 {
		t.Fatalf("SweepSlot = %d, want 0", got)
	}
	if got := PointsFor(round, 0); got != 3*VotePoints+SweepBonus {
		t.Errorf("PointsFor the sweep = %d, want %d", got, 3*VotePoints+SweepBonus)
	}
	if got := PointsFor(round, 1); got != 0 {
		t.Errorf("PointsFor the loser = %d, want 0", got)
	}
}

func TestASplitVoteHasNoSweep(t *testing.T) {
	round := roundWithVotes(2, 1)
	if got := SweepSlot(round); got != -1 {
		t.Errorf("SweepSlot = %d, want -1", got)
	}
	if got := PointsFor(round, 0); got != 2*VotePoints {
		t.Errorf("PointsFor = %d, want %d", got, 2*VotePoints)
	}
	if got := SweepSlot(roundWithVotes(0, 0)); got != -1 {
		t.Errorf("a round with no votes swept slot %d", got)
	}
}

func TestIdenticalAnswersShareASlot(t *testing.T) {
	groups := GroupSameAnswers([]WWOption{{AuthorID: "one", Answer: "Mr Whiskers"}, {AuthorID: "two", Answer: "mr whiskers"}})
	if len(groups) != 1 || len(groups[0]) != 2 {
		t.Errorf("GroupSameAnswers = %v, want one group of two", groups)
	}
}

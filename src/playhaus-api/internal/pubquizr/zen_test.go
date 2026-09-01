package pubquizr

import (
	"slices"
	"testing"
)

func TestZenLeavesRoundFourOutOfTheRunningOrder(t *testing.T) {
	classic := RunningOrder(false)
	zen := RunningOrder(true)

	if want := []int{RoundOpen, RoundChoice, RoundClosest, RoundDescribe, RoundList, RoundFinale}; !slices.Equal(classic, want) {
		t.Errorf("RunningOrder(false) = %v, want %v", classic, want)
	}
	if want := []int{RoundOpen, RoundChoice, RoundClosest, RoundList, RoundFinale}; !slices.Equal(zen, want) {
		t.Errorf("RunningOrder(true) = %v, want %v", zen, want)
	}

	if got, want := len(classic), Rounds; got != want {
		t.Errorf("a classic evening plays %d rounds, want all %d", got, want)
	}
}

func TestZenStepsFromRoundThreeStraightToRoundFive(t *testing.T) {
	table := []struct {
		zen         bool
		round       int
		want        int
		whatItMeans string
	}{
		{zen: false, round: RoundClosest, want: RoundDescribe, whatItMeans: "the classic evening still describes"},
		{zen: true, round: RoundClosest, want: RoundList, whatItMeans: "zen skips the describing"},
		{zen: true, round: RoundList, want: RoundFinale, whatItMeans: "and picks the evening back up at the finale"},
		{zen: false, round: RoundFinale, want: -1, whatItMeans: "nothing follows the finale"},
		{zen: true, round: RoundFinale, want: -1, whatItMeans: "in either mode"},
	}

	for _, row := range table {
		if got := NextRound(row.zen, row.round); got != row.want {
			t.Errorf("NextRound(%t, %d) = %d, want %d -- %s",
				row.zen, row.round, got, row.want, row.whatItMeans)
		}
	}

	if got := NextRound(true, RoundDescribe); got != -1 {
		t.Errorf("NextRound(true, RoundDescribe) = %d, want -1", got)
	}
}

func TestZenDealsNoDescribeWords(t *testing.T) {
	const players = 4

	quiz := quizCarrying(40)

	zen, err := dealQuestions(quiz, players, true)
	if err != nil {
		t.Fatalf("zen deal: %v", err)
	}
	classic, err := dealQuestions(quiz, players, false)
	if err != nil {
		t.Fatalf("classic deal: %v", err)
	}

	inRound := func(deal []dealtQuestion, round int) int {
		count := 0
		for _, slot := range deal {
			if slot.round == round {
				count++
			}
		}
		return count
	}

	if got := inRound(zen, RoundDescribe); got != 0 {
		t.Errorf("a zen deal wrote %d round 4 words, want none", got)
	}
	for _, round := range RunningOrder(true) {
		if got, want := inRound(zen, round), inRound(classic, round); got != want {
			t.Errorf("zen dealt %d questions to round %d, want %d -- the same as always",
				got, round, want)
		}
	}
}

func TestZenDealsAQuizWithNoDescribeWordsAtAll(t *testing.T) {
	quiz := quizCarrying(0)

	if _, err := dealQuestions(quiz, 4, false); err == nil {
		t.Fatal("a classic deal took a quiz with nothing to describe")
	}
	if _, err := dealQuestions(quiz, 4, true); err != nil {
		t.Errorf("zen deal: %v -- round 4 is not played, so its shelf is not its problem", err)
	}
}

func TestZenSessionHoldsNoRoundFourTurns(t *testing.T) {
	players := []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}}

	classic := &Session{Players: players}
	if got, want := classic.TurnsInRound(RoundDescribe), len(players); got != want {
		t.Errorf("classic turnsInRound(4) = %d, want %d -- one each", got, want)
	}

	zen := &Session{Players: players, ZenMode: true}
	if got := zen.TurnsInRound(RoundDescribe); got != 0 {
		t.Errorf("zen turnsInRound(4) = %d, want 0 -- the round is not played", got)
	}
}

func TestZenGivesMoreGuessesThanThereAreAnswers(t *testing.T) {
	if ZenListGuesses <= ListAnswersPerQuestion {
		t.Errorf("ZenListGuesses = %d, want more than the %d answers there are to find",
			ZenListGuesses, ListAnswersPerQuestion)
	}
}

package pubquizr

import (
	"slices"
	"testing"
)

func TestTriviaLeavesBothNonTriviaRoundsOutOfTheRunningOrder(t *testing.T) {
	trivia := RunningOrder(Modes{Trivia: true})

	if want := []int{RoundOpen, RoundChoice, RoundClosest, RoundFinale}; !slices.Equal(trivia, want) {
		t.Errorf("RunningOrder(trivia) = %v, want %v", trivia, want)
	}

	// The rule the mode is named after, checked against the mode itself: whatever
	// RoundIsTrivia says yes to is what an evening of trivia plays, and nothing else.
	for round := 1; round <= Rounds; round++ {
		if got, want := slices.Contains(trivia, round), RoundIsTrivia(round); got != want {
			t.Errorf("trivia plays round %d = %t, want %t", round, got, want)
		}
	}
}

// Zen already leaves round 4 out, so the two toggles overlap on it. Turning both on has
// to leave the same four rounds trivia alone does rather than something in between.
func TestTriviaAndZenTogetherPlayTheTriviaRounds(t *testing.T) {
	both := RunningOrder(Modes{Zen: true, Trivia: true})

	if want := RunningOrder(Modes{Trivia: true}); !slices.Equal(both, want) {
		t.Errorf("RunningOrder(zen+trivia) = %v, want %v -- zen has nothing left to take", both, want)
	}
}

func TestTriviaStepsFromRoundThreeStraightToTheFinale(t *testing.T) {
	table := []struct {
		round       int
		want        int
		whatItMeans string
	}{
		{round: RoundOpen, want: RoundChoice, whatItMeans: "the first three rounds are untouched"},
		{round: RoundChoice, want: RoundClosest, whatItMeans: "and follow each other as always"},
		{round: RoundClosest, want: RoundFinale, whatItMeans: "then the evening jumps the describing and the list"},
		{round: RoundFinale, want: -1, whatItMeans: "nothing follows the finale"},
		{round: RoundDescribe, want: -1, whatItMeans: "a round that is not played leads nowhere"},
		{round: RoundList, want: -1, whatItMeans: "neither does the other one"},
	}

	for _, row := range table {
		if got := NextRound(Modes{Trivia: true}, row.round); got != row.want {
			t.Errorf("NextRound(trivia, %d) = %d, want %d -- %s",
				row.round, got, row.want, row.whatItMeans)
		}
	}
}

func TestTriviaDealsNeitherWordsNorLists(t *testing.T) {
	const players = 4

	quiz := quizCarrying(40)

	trivia, err := dealQuestions(quiz, players, Modes{Trivia: true})
	if err != nil {
		t.Fatalf("trivia deal: %v", err)
	}
	classic, err := dealQuestions(quiz, players, Modes{})
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

	for _, round := range []int{RoundDescribe, RoundList} {
		if got := inRound(trivia, round); got != 0 {
			t.Errorf("a trivia deal wrote %d round %d questions, want none", got, round)
		}
	}
	// The rounds that survive are dealt exactly as they always were: the mode decides
	// which rounds get played and has nothing to say about how long one is.
	for _, round := range RunningOrder(Modes{Trivia: true}) {
		if got, want := inRound(trivia, round), inRound(classic, round); got != want {
			t.Errorf("trivia dealt %d questions to round %d, want %d -- the same as always",
				got, round, want)
		}
	}
}

// A quiz too thin for the rounds trivia does not play is still a quiz a trivia evening
// can be dealt from -- the shelf it is short of is one nobody is going to read off.
func TestTriviaDealsAQuizWithNothingToDescribe(t *testing.T) {
	quiz := quizCarrying(0)

	if _, err := dealQuestions(quiz, MinPlayers, Modes{}); err == nil {
		t.Fatal("a classic deal took a quiz with nothing to describe")
	}
	if _, err := dealQuestions(quiz, MinPlayers, Modes{Trivia: true}); err != nil {
		t.Errorf("trivia deal: %v -- round 4 is not played, so its shelf is not its problem", err)
	}
}

func TestTriviaSessionHoldsNoRoundFourTurns(t *testing.T) {
	players := []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}}

	trivia := &Session{Players: players, TriviaMode: true}
	if got := trivia.TurnsInRound(RoundDescribe); got != 0 {
		t.Errorf("trivia turnsInRound(4) = %d, want 0 -- the round is not played", got)
	}
}

// The columns are the storage; Modes is what every rule reads. They have to agree.
func TestSessionModesReadBackTheTogglesItWasDealtWith(t *testing.T) {
	for _, want := range []Modes{{}, {Zen: true}, {Trivia: true}, {Zen: true, Trivia: true}} {
		session := &Session{ZenMode: want.Zen, TriviaMode: want.Trivia}

		if got := session.Modes(); got != want {
			t.Errorf("Modes() = %+v, want %+v", got, want)
		}
	}
}

package pubquizr

import (
	"testing"

	"github.com/google/uuid"
)

// quizCarrying builds a quiz that holds exactly what it is asked to hold: the floor for
// every round, plus however many round 4 words the test wants. Only the fields
// dealQuestions reads are filled in -- it counts rows and copies ids, and never looks at
// a prompt.
func quizCarrying(describeWords int) *Quiz {
	quiz := &Quiz{ID: uuid.New()}

	add := func(round, count int) {
		for position := range count {
			quiz.Questions = append(quiz.Questions, Question{
				ID:       uuid.New(),
				QuizID:   quiz.ID,
				Round:    round,
				Kind:     KindOf(round),
				Position: position,
			})
		}
	}

	for round := 1; round <= Rounds; round++ {
		if round == RoundDescribe {
			add(round, describeWords)
			continue
		}
		add(round, MinQuestionsIn(round))
	}

	return quiz
}

// wordsPerSeat is how many round 4 words the deal put on each seat.
func wordsPerSeat(t *testing.T, deal []dealtQuestion) map[int]int {
	t.Helper()

	perSeat := map[int]int{}
	for _, slot := range deal {
		if slot.round != RoundDescribe {
			continue
		}
		if slot.assignedSeat == nil {
			t.Fatalf("round 4 slot %d belongs to nobody", slot.position)
		}
		perSeat[*slot.assignedSeat]++
	}
	return perSeat
}

// A big enough shelf has to hand every player DescribeWordsPerTurn words and stop there.
//
// Untested until now, which is how inTurns came to work the figure out for itself --
// dealt/players, correct only because the deal is players*per by construction. Nothing
// held that identity in place, and a shelf of eighty going to the first three seats
// would have shown up as five people sitting through round 4 with nothing to describe.
// This is the assertion that would have caught it.
func TestRoundFourDealsTheCapPerPlayerNotTheWholeShelf(t *testing.T) {
	const players = MaxPlayers
	const carried = 80

	deal, err := dealQuestions(quizCarrying(carried), players)
	if err != nil {
		t.Fatalf("deal: %v", err)
	}

	// Asserted against the rule rather than a 4, so re-pricing the turn moves this
	// with it.
	want := DescribeWordsPerPlayer(players, carried)
	if want != DescribeWordsPerTurn {
		t.Fatalf("a shelf of %d should not be short for %d players: %d each", carried, players, want)
	}

	perSeat := wordsPerSeat(t, deal)
	if len(perSeat) != players {
		t.Fatalf("%d of %d seats got words: %v", len(perSeat), players, perSeat)
	}
	for seat := range players {
		if got := perSeat[seat]; got != want {
			t.Errorf("seat %d got %d words, want %d", seat, got, want)
		}
	}
}

// The other side of the same rule: a thin shelf gives everybody the same smaller number
// rather than giving the last seats nothing.
func TestRoundFourSharesAThinShelfEvenly(t *testing.T) {
	const players = MaxPlayers
	const carried = MinDescribeWords // sixteen: two each at a full table

	deal, err := dealQuestions(quizCarrying(carried), players)
	if err != nil {
		t.Fatalf("deal: %v", err)
	}

	want := DescribeWordsPerPlayer(players, carried)
	perSeat := wordsPerSeat(t, deal)
	if len(perSeat) != players {
		t.Fatalf("%d of %d seats got words: %v", len(perSeat), players, perSeat)
	}
	for seat := range players {
		if got := perSeat[seat]; got != want {
			t.Errorf("seat %d got %d words, want %d", seat, got, want)
		}
	}
}

// Every other round belongs to the table, whatever the shelf holds. Round 4 is the only
// one that hands a slot to a seat, and a slot that quietly gained an owner would be a
// question nobody but one player is allowed to answer.
func TestOnlyRoundFourAssignsSeats(t *testing.T) {
	deal, err := dealQuestions(quizCarrying(40), MaxPlayers)
	if err != nil {
		t.Fatalf("deal: %v", err)
	}

	for _, slot := range deal {
		if slot.round != RoundDescribe && slot.assignedSeat != nil {
			t.Errorf("round %d slot %d was dealt to seat %d", slot.round, slot.position, *slot.assignedSeat)
		}
	}
}

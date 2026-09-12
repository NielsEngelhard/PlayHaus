package pubquizr

import (
	"testing"

	"github.com/google/uuid"
)

// choiceQuestion is an ABCD question written the way the biased quiz files were: the right option always first.
func choiceQuestion() Question {
	return Question{
		ID:   uuid.New(),
		Kind: KindMultipleChoice,
		Answers: []Answer{
			{ID: uuid.New(), Position: 0, Text: "right", Correct: true},
			{ID: uuid.New(), Position: 1, Text: "wrong one"},
			{ID: uuid.New(), Position: 2, Text: "wrong two"},
			{ID: uuid.New(), Position: 3, Text: "wrong three"},
		},
	}
}

func correctPosition(answers []Answer) int {
	for _, answer := range answers {
		if answer.Correct {
			return answer.Position
		}
	}
	return -1
}

func TestTheRightOptionIsNotWhereTheQuizFilePutIt(t *testing.T) {
	landed := map[int]int{}
	for range 400 {
		landed[correctPosition(choiceQuestion().ShownAnswers())]++
	}

	// Four hundred questions put roughly a hundred on each letter; thirty is far outside chance.
	for position := range ChoiceOptions {
		if landed[position] < 30 {
			t.Errorf("the right option landed on position %d only %d times out of 400 (%v)", position, landed[position], landed)
		}
	}
}

func TestAQuestionShowsTheSameLettersEveryTimeItIsAsked(t *testing.T) {
	question := choiceQuestion()
	first := question.ShownAnswers()

	for range 20 {
		again := question.ShownAnswers()
		for i := range first {
			if first[i].ID != again[i].ID || again[i].Position != i {
				t.Fatalf("the options came back in a different order: %v then %v", first, again)
			}
		}
	}

	if question.Answers[0].Position != 0 || !question.Answers[0].Correct {
		t.Error("shuffling the shown options rewrote the question's own answers")
	}
}

func TestOnlyAnABCDQuestionIsShuffled(t *testing.T) {
	question := choiceQuestion()
	question.Kind = KindList

	for i, answer := range question.ShownAnswers() {
		if answer.ID != question.Answers[i].ID || answer.Position != i {
			t.Fatalf("a list question's answers moved: position %d is %q", i, answer.Text)
		}
	}
}

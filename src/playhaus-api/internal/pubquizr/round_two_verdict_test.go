package pubquizr

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/google/uuid"
)

// Round 2 is the one round nobody has to judge: the answerer taps an option on their own
// phone and the phone knows whether it was right, because `correct` is in the quiz payload
// every device already holds. So the settle arrives carrying a claim -- "this option, and
// it was right" -- and the server's job is to check the claim against its own content
// rather than trust it.
//
// That check is round 2's alone. An open answer is judged by a human and the stored text is
// a hint rather than a rule, so rounds 1, 6 and 7 must reach the scoring body without ever
// consulting it. Half of what is worth proving here is that they still do.

const choiceCorrectOption = 2

// newChoiceQuizSession is a table of four in round 2 with a quiz behind it, each question
// carrying four options of which the third is the right one.
func newChoiceQuizSession(master, hot, position, positions int) (*Session, *Quiz) {
	session := newChoiceSession(master, hot, position, positions)
	session.QuizID = uuid.New()

	quiz := &Quiz{ID: session.QuizID}
	for i := range session.Questions {
		session.Questions[i].QuestionID = uuid.New()

		question := Question{
			ID:       session.Questions[i].QuestionID,
			QuizID:   quiz.ID,
			Round:    RoundChoice,
			Position: i,
			Kind:     KindMultipleChoice,
			Prompt:   fmt.Sprintf("question %d", i),
		}
		for option := 0; option < 4; option++ {
			question.Answers = append(question.Answers, Answer{
				ID:         uuid.New(),
				QuestionID: question.ID,
				Position:   option,
				Text:       fmt.Sprintf("option %d", option),
				Correct:    option == choiceCorrectOption,
			})
		}

		quiz.Questions = append(quiz.Questions, question)
	}

	return session, quiz
}

// optionAt is the id of one option of the question in the given slot, so a test can name
// an option the way the answerer's phone does.
func optionAt(quiz *Quiz, position, option int) uuid.UUID {
	return quiz.Questions[position].Answers[option].ID
}

// pickOption settles one round 2 question the way the answerer's phone does: the option it
// landed on, and whether it claims that option took the question.
func pickOption(store *verdictStore, missed []int, correct *int, answerID uuid.UUID) error {
	session := store.session
	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		return ErrStaleTurn
	}

	_, err := NewService(store).RecordHotSeatTurn(context.Background(), TurnInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: question.ID,
		MissedSeats:       missed,
		CorrectSeat:       correct,
		ChosenAnswerID:    &answerID,
	})

	return err
}

func TestChoiceVerdictClaimingCorrectOnTheWrongOptionIsRefused(t *testing.T) {
	session, quiz := newChoiceQuizSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	asked := remaining(store)
	err := pickOption(store, nil, &asked[0], optionAt(quiz, 0, choiceCorrectOption+1))

	if !errors.Is(err, ErrVerdictDisagrees) {
		t.Fatalf("settle = %v, want ErrVerdictDisagrees", err)
	}
	if store.session.PlayerAt(asked[0]).Score != 0 {
		t.Error("a refused claim still paid out")
	}
}

func TestChoiceVerdictClaimingWrongOnTheCorrectOptionIsRefused(t *testing.T) {
	session, quiz := newChoiceQuizSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	err := pickOption(store, remaining(store), nil, optionAt(quiz, 0, choiceCorrectOption))

	if !errors.Is(err, ErrVerdictDisagrees) {
		t.Fatalf("settle = %v, want ErrVerdictDisagrees", err)
	}
}

// The point of keeping it: round 2 is the one round where which option was picked is a fact
// the server can be sure of, so it is the one round that can be reviewed afterwards.
func TestChoicePickIsKeptOnTheAttemptRow(t *testing.T) {
	session, quiz := newChoiceQuizSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	asked := remaining(store)
	chosen := optionAt(quiz, 0, choiceCorrectOption)

	if err := pickOption(store, nil, &asked[0], chosen); err != nil {
		t.Fatalf("RecordHotSeatTurn: %v", err)
	}

	attempt := only(store.recorded.Answers)
	if attempt == nil {
		t.Fatal("no attempt row written")
	}
	if attempt.AnswerID == nil {
		t.Fatal("AnswerID = nil, want the option the phone landed on")
	}
	if got := *attempt.AnswerID; got != chosen {
		t.Errorf("AnswerID = %s, want %s", got, chosen)
	}
}

func TestChoiceVerdictNamingAnotherQuestionsOptionIsRefused(t *testing.T) {
	session, quiz := newChoiceQuizSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	asked := remaining(store)
	// The right option of the next question, which is right about a question the table is not on.
	err := pickOption(store, nil, &asked[0], optionAt(quiz, 1, choiceCorrectOption))

	if !errors.Is(err, ErrVerdictDisagrees) {
		t.Fatalf("settle = %v, want ErrVerdictDisagrees", err)
	}
}

// Round 1 runs down the same function, so the gate is the only thing keeping the check off
// it -- and an open answer judged against the quiz's stored text would refuse every correct
// answer a player phrased differently.
func TestOpenVerdictIsNotCheckedAgainstTheStoredAnswer(t *testing.T) {
	session, quiz := newChoiceQuizSession(0, 1, 0, 4)
	session.CurrentRound = RoundOpen
	for i := range session.Questions {
		session.Questions[i].Round = RoundOpen
	}
	store := &verdictStore{session: session, quiz: quiz}

	asked := remaining(store)
	// A wrong option, claimed correct. Round 2 would refuse this; round 1 never looks.
	if err := pickOption(store, nil, &asked[0], optionAt(quiz, 0, choiceCorrectOption+1)); err != nil {
		t.Fatalf("RecordHotSeatTurn: %v", err)
	}

	if got, want := store.session.PlayerAt(asked[0]).Score, HotSeatPointsAt(RoundOpen, 0); got != want {
		t.Errorf("score = %d, want %d", got, want)
	}
}

// Rounds 6 and 7 settle down their own functions, which is where this is really enforced;
// the test is here so that moving the check up into shared code fails loudly.
func TestDoubleDownVerdictIsNotCheckedAgainstTheStoredAnswer(t *testing.T) {
	session, quiz := newDoubleDownSession(4)
	store := &verdictStore{session: session, quiz: quiz}

	question := pickable(session, quiz, DifficultyHard)
	if question == nil {
		t.Fatal("nothing hard left in the pool")
	}

	stranger := uuid.New()
	seat := session.HotSeatOrFirst()
	_, err := NewService(store).RecordDoubleDownTurn(t.Context(), TurnInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: question.ID,
		CorrectSeat:       &seat,
		ChosenAnswerID:    &stranger,
	})
	if err != nil {
		t.Fatalf("RecordDoubleDownTurn: %v", err)
	}

	if got, want := store.session.PlayerAt(seat).Score, HardPoints; got != want {
		t.Errorf("score = %d, want %d", got, want)
	}
}

func TestFinaleVerdictIsNotCheckedAgainstTheStoredAnswer(t *testing.T) {
	session := newFinaleSession(0, 1, 2, 0, 4)
	// No quiz at all, which is the strongest way to say the finale never reads one.
	store := &verdictStore{session: session}

	stranger := uuid.New()
	seat := session.FinaleLine(0)[0]
	_, err := NewService(store).RecordFinaleTurn(t.Context(), TurnInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: session.QuestionAt(RoundFinale, 0).ID,
		CorrectSeat:       &seat,
		ChosenAnswerID:    &stranger,
	})
	if err != nil {
		t.Fatalf("RecordFinaleTurn: %v", err)
	}

	if store.session.PlayerAt(seat).Score == 0 {
		t.Error("the finale paid nothing for a correct answer")
	}
}

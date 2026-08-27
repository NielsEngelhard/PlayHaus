package pubquizr

import (
	"errors"
	"fmt"
	"testing"

	"github.com/google/uuid"
)

// Round 5 settles a whole question in one request, the same shape round 3 and round 4
// do: every answer that was found during the ten seconds arrives together, credited to
// whoever called it out. So these tests are about the settling -- who gets the point,
// who may not, and what the table does afterwards -- rather than about a ring being
// walked one attempt at a time.

// newListSession is a table of four in round 5, with `positions` questions dealt and a
// quiz behind them carrying four correct answers apiece.
func newListSession(master, hot, position, positions int) (*Session, *Quiz) {
	session := newVerdictSession(master, hot, position, positions)
	session.CurrentRound = RoundList
	session.QuizID = uuid.New()

	quiz := &Quiz{ID: session.QuizID}
	for i := range session.Questions {
		session.Questions[i].Round = RoundList
		session.Questions[i].QuestionID = uuid.New()

		question := Question{ID: session.Questions[i].QuestionID, Round: RoundList, Kind: KindList}
		for a := 0; a < ListAnswersPerQuestion; a++ {
			question.Answers = append(question.Answers, Answer{
				ID:         uuid.New(),
				QuestionID: question.ID,
				Position:   a,
				Text:       fmt.Sprintf("answer %d", a),
				Correct:    true,
			})
		}
		quiz.Questions = append(quiz.Questions, question)
	}

	return session, quiz
}

// answersOf are the four correct answers behind whichever list question a session is
// currently sat on.
func answersOf(t *testing.T, session *Session, quiz *Quiz) []Answer {
	t.Helper()

	dealt := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if dealt == nil {
		t.Fatal("no question dealt in the current slot")
	}
	for _, question := range quiz.Questions {
		if question.ID == dealt.QuestionID {
			return question.CorrectAnswers()
		}
	}

	t.Fatalf("no quiz question behind dealt question %s", dealt.ID)
	return nil
}

func settleList(t *testing.T, store *verdictStore, awards []ListAward) error {
	t.Helper()

	session := store.session
	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		t.Fatal("no question dealt in the current slot")
	}

	_, err := NewService(store).RecordListAward(t.Context(), ListInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: question.ID,
		Awards:            awards,
	})
	return err
}

// unfound rules every one of the four answers as found by nobody, except whichever ids
// are overridden in `named`.
func fullAwards(answers []Answer, named map[uuid.UUID][]int) []ListAward {
	awards := make([]ListAward, 0, len(answers))
	for _, answer := range answers {
		awards = append(awards, ListAward{AnswerID: answer.ID, Seats: named[answer.ID]})
	}
	return awards
}

func TestListAwardsPayCreditedSeats(t *testing.T) {
	session, quiz := newListSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}
	answers := answersOf(t, session, quiz)

	err := settleList(t, store, fullAwards(answers, map[uuid.UUID][]int{
		answers[0].ID: {1},
		answers[1].ID: {2},
	}))
	if err != nil {
		t.Fatalf("RecordListAward: %v", err)
	}

	for _, seat := range []int{1, 2} {
		if got, want := store.session.PlayerAt(seat).Score, ListAnswerPoints; got != want {
			t.Errorf("seat %d scored %d, want %d", seat, got, want)
		}
	}
	if got := store.session.PlayerAt(3).Score; got != 0 {
		t.Errorf("seat 3 found nothing and scored %d, want 0", got)
	}

	// Two found, two not: one row each for the found pair and one row apiece for the
	// two that stayed unfound, the same accounting round 4 gives a word nobody guessed.
	if got, want := len(store.recorded.Answers), 4; got != want {
		t.Errorf("wrote %d rows, want %d", got, want)
	}
	if got, want := store.recorded.Questions[0].Points, 2*ListAnswerPoints; got != want {
		t.Errorf("the question closed for %d, want %d", got, want)
	}
}

// Two people can call an answer out at the same instant, and neither loses out over who
// was half a second faster: both take the full point, the same way a tied round 3 guess
// and a tied round 4 word do.
func TestListTwoSimultaneousFindsBothScore(t *testing.T) {
	session, quiz := newListSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}
	answers := answersOf(t, session, quiz)

	err := settleList(t, store, fullAwards(answers, map[uuid.UUID][]int{
		answers[0].ID: {1, 2},
	}))
	if err != nil {
		t.Fatalf("RecordListAward: %v", err)
	}

	for _, seat := range []int{1, 2} {
		if got, want := store.session.PlayerAt(seat).Score, ListAnswerPoints; got != want {
			t.Errorf("seat %d scored %d, want %d -- a draw is not worth half", seat, got, want)
		}
	}
}

// The reading rotates to whoever is next, the same shuffle round 2's questions get --
// round 5 never lets whoever is reading keep the job.
func TestListReadingRotatesEachQuestion(t *testing.T) {
	session, quiz := newListSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}
	answers := answersOf(t, session, quiz)

	if err := settleList(t, store, fullAwards(answers, nil)); err != nil {
		t.Fatalf("RecordListAward: %v", err)
	}

	if got, want := store.session.CurrentPosition, 1; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 1; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- the reading moved on", got, want)
	}
}

func TestListAwardsRefusals(t *testing.T) {
	table := []struct {
		name   string
		awards func(answers []Answer) []ListAward
		want   error
	}{
		{
			name: "the quizmaster is reading, not guessing",
			awards: func(answers []Answer) []ListAward {
				return fullAwards(answers, map[uuid.UUID][]int{answers[0].ID: {0}})
			},
			want: ErrQuizmasterCannotGuess,
		},
		{
			name: "a seat that is not at this table",
			awards: func(answers []Answer) []ListAward {
				return fullAwards(answers, map[uuid.UUID][]int{answers[0].ID: {9}})
			},
			want: ErrUnknownSeat,
		},
		{
			name: "an answer left unruled",
			awards: func(answers []Answer) []ListAward {
				return fullAwards(answers, nil)[:3]
			},
			want: ErrInvalidInput,
		},
		{
			name: "an answer not part of this question",
			awards: func(answers []Answer) []ListAward {
				return append(fullAwards(answers, nil), ListAward{AnswerID: uuid.New()})
			},
			want: ErrUnknownAnswer,
		},
		{
			name: "the same seat named twice for one answer",
			awards: func(answers []Answer) []ListAward {
				return fullAwards(answers, map[uuid.UUID][]int{answers[0].ID: {1, 1}})
			},
			want: ErrInvalidInput,
		},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			session, quiz := newListSession(0, 1, 0, 4)
			store := &verdictStore{session: session, quiz: quiz}
			answers := answersOf(t, session, quiz)

			err := settleList(t, store, row.awards(answers))

			if !errors.Is(err, row.want) {
				t.Fatalf("err = %v, want %v", err, row.want)
			}
			if len(store.recorded.Answers) > 0 || len(store.recorded.Players) > 0 {
				t.Error("a refused turn still wrote something")
			}
		})
	}
}

func TestListRefusesAStaleTurn(t *testing.T) {
	session, quiz := newListSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	_, err := NewService(store).RecordListAward(t.Context(), ListInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: uuid.New(),
		Awards:            fullAwards(answersOf(t, session, quiz), nil),
	})

	if !errors.Is(err, ErrStaleTurn) {
		t.Fatalf("err = %v, want %v", err, ErrStaleTurn)
	}
}

// And when the round runs out, the finale opens on the two highest scores rather than on
// whoever is furthest behind at the whole table.
func TestListEndsIntoTheFinale(t *testing.T) {
	session, quiz := newListSession(0, 1, 3, 4)
	session.Players[0].Score = 7
	session.Players[1].Score = 5
	session.Players[2].Score = 9
	session.Players[3].Score = 2

	store := &verdictStore{session: session, quiz: quiz}
	answers := answersOf(t, session, quiz)

	if err := settleList(t, store, fullAwards(answers, nil)); err != nil {
		t.Fatalf("RecordListAward: %v", err)
	}

	if got, want := store.session.CurrentRound, RoundFinale; got != want {
		t.Fatalf("CurrentRound = %d, want %d", got, want)
	}
	// Seats 2 and 0 are the two highest scores (9 and 7); the lower of the pair opens.
	if got, want := store.session.HotSeat, 0; got != want {
		t.Errorf("HotSeat = %d, want %d -- the weaker finalist opens", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 2; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- the stronger finalist reads first", got, want)
	}
}

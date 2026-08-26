package pubquizr

import (
	"errors"
	"math"
	"testing"

	"github.com/google/uuid"
)

// Round 3 settles a whole turn in one request: everybody's number arrives together and
// the nearest takes the points. So these tests are about the settling -- who won, who may
// guess, and what the table does afterwards -- rather than about a ring being walked.

func TestClosestWinners(t *testing.T) {
	table := []struct {
		name    string
		target  float64
		guesses []SeatGuess
		want    []int
	}{
		{
			name:    "one of them is nearer",
			target:  206,
			guesses: []SeatGuess{{Seat: 1, Value: 180}, {Seat: 2, Value: 210}, {Seat: 3, Value: 300}},
			want:    []int{2},
		},
		{
			// Two people equally close either side of it are both right, and a pub
			// table would not accept anything else.
			name:    "equally close either side",
			target:  205,
			guesses: []SeatGuess{{Seat: 1, Value: 180}, {Seat: 2, Value: 230}, {Seat: 3, Value: 400}},
			want:    []int{1, 2},
		},
		{
			name:    "an exact hit beats a near miss",
			target:  1927,
			guesses: []SeatGuess{{Seat: 0, Value: 1927}, {Seat: 2, Value: 1928}},
			want:    []int{0},
		},
		{
			name:    "decimals and negatives",
			target:  -2.5,
			guesses: []SeatGuess{{Seat: 0, Value: -2.4}, {Seat: 1, Value: -3}},
			want:    []int{0},
		},
		{
			name:    "nobody guessed",
			target:  10,
			guesses: nil,
			want:    nil,
		},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			got := ClosestWinners(row.target, row.guesses)

			if len(got) != len(row.want) {
				t.Fatalf("ClosestWinners = %v, want %v", got, row.want)
			}
			for i := range got {
				if got[i] != row.want[i] {
					t.Errorf("ClosestWinners = %v, want %v", got, row.want)
				}
			}
		})
	}
}

func TestDuplicateGuessSeat(t *testing.T) {
	clean := []SeatGuess{{Seat: 0, Value: 10}, {Seat: 1, Value: 11}}
	if got := DuplicateGuessSeat(clean); got != -1 {
		t.Errorf("DuplicateGuessSeat on distinct numbers = %d, want -1", got)
	}

	copied := []SeatGuess{{Seat: 0, Value: 10}, {Seat: 2, Value: 11}, {Seat: 3, Value: 10}}
	if got, want := DuplicateGuessSeat(copied), 3; got != want {
		t.Errorf("DuplicateGuessSeat = %d, want %d -- the second to say it is the copier", got, want)
	}
}

// Everybody but the reader, starting where the question opened.
func TestGuessingSeatsSkipTheReader(t *testing.T) {
	got := GuessingSeats(1, 2, 4)
	want := []int{2, 3, 0}

	if len(got) != len(want) {
		t.Fatalf("GuessingSeats = %v, want %v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("GuessingSeats = %v, want %v", got, want)
		}
	}
}

// --- settling one question ------------------------------------------------

const closestTarget = 206

// newClosestSession is a table of four in round 3, with `positions` questions dealt and a
// quiz behind them carrying the number each one is looking for.
func newClosestSession(master, hot, position, positions int) (*Session, *Quiz) {
	session := newVerdictSession(master, hot, position, positions)
	session.CurrentRound = RoundClosest
	session.QuizID = uuid.New()

	quiz := &Quiz{ID: session.QuizID}
	for i := range session.Questions {
		session.Questions[i].Round = RoundClosest
		session.Questions[i].QuestionID = uuid.New()

		answer := float64(closestTarget)
		quiz.Questions = append(quiz.Questions, Question{
			ID:            session.Questions[i].QuestionID,
			Round:         RoundClosest,
			Kind:          KindClosest,
			NumericAnswer: &answer,
		})
	}

	return session, quiz
}

func settle(t *testing.T, store *verdictStore, in ClosestInput) error {
	t.Helper()

	session := store.session
	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		t.Fatal("no question dealt in the current slot")
	}

	in.SessionID = session.ID
	in.OwnerID = verdictOwner
	in.SessionQuestionID = question.ID

	_, err := NewService(store).RecordClosestGuesses(t.Context(), in)
	return err
}

func TestTypedGuessesScoreTheNearest(t *testing.T) {
	session, quiz := newClosestSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	err := settle(t, store, ClosestInput{Guesses: []SeatGuess{
		{Seat: 1, Value: 180},
		{Seat: 2, Value: 210},
		{Seat: 3, Value: 300},
	}})
	if err != nil {
		t.Fatalf("RecordClosestGuesses: %v", err)
	}

	if got, want := store.session.PlayerAt(2).Score, ClosestPoints; got != want {
		t.Errorf("the nearest guess scored %d, want %d", got, want)
	}
	for _, seat := range []int{0, 1, 3} {
		if got := store.session.PlayerAt(seat).Score; got != 0 {
			t.Errorf("seat %d scored %d, want 0", seat, got)
		}
	}

	// Every number typed in is written down, so the table can argue about them after.
	if got, want := len(store.recorded.Answers), 3; got != want {
		t.Fatalf("wrote %d guesses, want %d", got, want)
	}
	for _, answer := range store.recorded.Answers {
		if answer.NumericValue == nil {
			t.Errorf("the guess from seat %d was written without its number", *answer.Seat)
		}
	}
}

func TestEquallyCloseGuessesBothTakeTheWholePoints(t *testing.T) {
	session, quiz := newClosestSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	// 186 and 226 are both twenty out from 206.
	err := settle(t, store, ClosestInput{Guesses: []SeatGuess{
		{Seat: 1, Value: 186},
		{Seat: 2, Value: 226},
		{Seat: 3, Value: 400},
	}})
	if err != nil {
		t.Fatalf("RecordClosestGuesses: %v", err)
	}

	for _, seat := range []int{1, 2} {
		if got, want := store.session.PlayerAt(seat).Score, ClosestPoints; got != want {
			t.Errorf("seat %d scored %d, want %d -- a tie is not worth half", seat, got, want)
		}
	}
	if got, want := len(store.recorded.Players), 2; got != want {
		t.Errorf("wrote %d score updates, want %d", got, want)
	}
}

func TestNamedWinnerScoresWithoutTheNumbers(t *testing.T) {
	session, _ := newClosestSession(0, 1, 0, 4)
	// No quiz behind it: naming the winner must not need the answer looked up.
	store := &verdictStore{session: session}

	if err := settle(t, store, ClosestInput{WinningSeats: []int{3}}); err != nil {
		t.Fatalf("RecordClosestGuesses: %v", err)
	}

	if got, want := store.session.PlayerAt(3).Score, ClosestPoints; got != want {
		t.Errorf("the named winner scored %d, want %d", got, want)
	}
	if got, want := len(store.recorded.Answers), 1; got != want {
		t.Fatalf("wrote %d rows, want %d -- there is nothing true to write about the rest", got, want)
	}
	if got := store.recorded.Answers[0].NumericValue; got != nil {
		t.Errorf("a named winner was written with a number: %v", *got)
	}
}

func TestClosestRefusals(t *testing.T) {
	table := []struct {
		name string
		in   ClosestInput
		want error
	}{
		{
			name: "copying is not guessing",
			in:   ClosestInput{Guesses: []SeatGuess{{Seat: 1, Value: 200}, {Seat: 2, Value: 200}}},
			want: ErrDuplicateGuess,
		},
		{
			name: "the quizmaster is reading, not guessing",
			in:   ClosestInput{Guesses: []SeatGuess{{Seat: 0, Value: 200}}},
			want: ErrQuizmasterCannotGuess,
		},
		{
			name: "a seat that is not at this table",
			in:   ClosestInput{Guesses: []SeatGuess{{Seat: 9, Value: 200}}},
			want: ErrUnknownSeat,
		},
		{
			name: "one seat guessing twice",
			in:   ClosestInput{Guesses: []SeatGuess{{Seat: 1, Value: 200}, {Seat: 1, Value: 300}}},
			want: ErrInvalidInput,
		},
		{
			name: "guesses and a winner at once",
			in:   ClosestInput{Guesses: []SeatGuess{{Seat: 1, Value: 200}}, WinningSeats: []int{2}},
			want: ErrInvalidInput,
		},
		{
			name: "neither",
			in:   ClosestInput{},
			want: ErrInvalidInput,
		},
		{
			name: "a guess that is not a number",
			in:   ClosestInput{Guesses: []SeatGuess{{Seat: 1, Value: math.Inf(1)}}},
			want: ErrInvalidInput,
		},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			session, quiz := newClosestSession(0, 1, 0, 4)
			store := &verdictStore{session: session, quiz: quiz}

			err := settle(t, store, row.in)

			if !errors.Is(err, row.want) {
				t.Fatalf("err = %v, want %v", err, row.want)
			}
			if len(store.recorded.Answers) > 0 || len(store.recorded.Players) > 0 {
				t.Error("a refused turn still wrote something")
			}
		})
	}
}

// The round goes round: everybody reads one out, and the reading moves whether anybody
// scored or not.
func TestRoundThreeMovesOneSeatEachQuestion(t *testing.T) {
	session, quiz := newClosestSession(0, 1, 0, 4)
	store := &verdictStore{session: session, quiz: quiz}

	if err := settle(t, store, ClosestInput{WinningSeats: []int{2}}); err != nil {
		t.Fatalf("RecordClosestGuesses: %v", err)
	}

	if got, want := store.session.CurrentPosition, 1; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 1; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- the next player reads it out", got, want)
	}
	if got, want := store.session.HotSeat, 2; got != want {
		t.Errorf("HotSeat = %d, want %d", got, want)
	}
}

// And when it runs out, round 4 opens on whoever is furthest behind -- describing,
// because that is what starting means in round 4.
func TestRoundThreeEndsIntoRoundFourOnTheLowestScore(t *testing.T) {
	session, quiz := newClosestSession(0, 1, 3, 4)
	session.Players[0].Score = 7
	session.Players[1].Score = 5
	session.Players[2].Score = 9
	session.Players[3].Score = 2

	store := &verdictStore{session: session, quiz: quiz}

	if err := settle(t, store, ClosestInput{WinningSeats: []int{1}}); err != nil {
		t.Fatalf("RecordClosestGuesses: %v", err)
	}

	if got, want := store.session.CurrentRound, RoundDescribe; got != want {
		t.Fatalf("CurrentRound = %d, want %d", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 3; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- the lowest score describes first", got, want)
	}
}

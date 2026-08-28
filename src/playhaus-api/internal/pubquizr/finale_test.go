package pubquizr

import (
	"errors"
	"testing"

	"github.com/google/uuid"
)

// The finale is round 1's question-asking -- an open question, read aloud -- down a line
// exactly two seats long, with a quizmaster who is in neither of them. So these tests are
// about three things: who reads, which finalist a question opens on, and what happens to
// a question the first of them misses.

// newFinaleSession is a table of four in round 6, with `positions` questions dealt, the
// finale between seats `a` and `b`, and `master` reading to them.
func newFinaleSession(master, a, b, position, positions int) *Session {
	session := newVerdictSession(master, a, position, positions)
	session.CurrentRound = RoundFinale
	session.FinalistSeatA, session.FinalistSeatB = a, b
	session.HotSeat = session.FinaleOpener()
	for i := range session.Questions {
		session.Questions[i].Round = RoundFinale
	}
	return session
}

func settleFinale(t *testing.T, store *verdictStore, correct bool) error {
	t.Helper()

	session := store.session
	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		t.Fatal("no question dealt in the current slot")
	}

	_, err := NewService(store).RecordFinaleVerdict(t.Context(), VerdictInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: question.ID,
		Correct:           correct,
	})
	return err
}

// One tally, and the finale pays a hundred onto it. There is no second column any more.
func TestFinaleVerdictPaysTheRunningScore(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 0, 4)}

	if err := settleFinale(t, store, true); err != nil {
		t.Fatalf("RecordFinaleVerdict: %v", err)
	}

	if got, want := store.session.PlayerAt(1).Score, FinalePoints; got != want {
		t.Errorf("Score = %d, want %d", got, want)
	}
	if got, want := FinalePoints, 100; got != want {
		t.Errorf("FinalePoints = %d, want %d", got, want)
	}
}

func TestFinaleVerdictScoresNothingWhenWrong(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 0, 4)}

	if err := settleFinale(t, store, false); err != nil {
		t.Fatalf("RecordFinaleVerdict: %v", err)
	}

	if got := store.session.PlayerAt(1).Score; got != 0 {
		t.Errorf("Score = %d, want 0", got)
	}
}

// The quizmaster is not playing, so nothing a verdict does may move them.
func TestFinaleKeepsTheSameQuizmasterAllRound(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 0, 4)}

	for question := range 3 {
		if err := settleFinale(t, store, true); err != nil {
			t.Fatalf("question %d: %v", question+1, err)
		}
		if got, want := store.session.QuizMasterSeat, 3; got != want {
			t.Fatalf("after question %d: QuizMasterSeat = %d, want %d", question+1, got, want)
		}
	}
}

// The rule the whole round hangs on: the question opens on whichever finalist is behind,
// worked out again every question rather than swapped turn about.
func TestFinaleOpensOnWhicheverFinalistIsBehind(t *testing.T) {
	session := newFinaleSession(3, 1, 2, 0, 4)
	session.Players[1].Score = 4 // seat 1
	session.Players[2].Score = 7 // seat 2
	session.HotSeat = session.FinaleOpener()

	store := &verdictStore{session: session}
	if got, want := session.HotSeat, 1; got != want {
		t.Fatalf("HotSeat = %d, want %d -- the finalist behind opens", got, want)
	}

	// Seat 1 takes it: 4 -> 104, which puts seat 2 behind.
	if err := settleFinale(t, store, true); err != nil {
		t.Fatalf("question 1: %v", err)
	}
	if got, want := store.session.HotSeat, 2; got != want {
		t.Errorf("HotSeat = %d, want %d -- the hundred changed who is behind", got, want)
	}

	// Seat 2 misses it and so does seat 1, so nobody moves and seat 2 is still behind.
	store.attempts = 0
	if err := settleFinale(t, store, false); err != nil {
		t.Fatalf("question 2, first go: %v", err)
	}
	store.attempts = 1
	if err := settleFinale(t, store, false); err != nil {
		t.Fatalf("question 2, second go: %v", err)
	}
	if got, want := store.session.HotSeat, 2; got != want {
		t.Errorf("HotSeat = %d, want %d -- nobody scored, so nobody moved", got, want)
	}
}

// A question the finalist in front of it misses is still worth its full hundred to the
// other one.
func TestFinaleWrongAnswerPassesToTheOtherFinalist(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 0, 4)}

	if err := settleFinale(t, store, false); err != nil {
		t.Fatalf("first go: %v", err)
	}

	if got, want := store.session.CurrentPosition, 0; got != want {
		t.Errorf("CurrentPosition = %d, want %d -- the question is still alive", got, want)
	}
	if got, want := store.session.HotSeat, 1; got != want {
		t.Errorf("HotSeat = %d, want %d -- it still names where the question opened", got, want)
	}
	if len(store.recorded.Questions) > 0 {
		t.Error("a question still being passed across was closed")
	}
	if got, want := store.session.FinaleAnsweringSeat(1), 2; got != want {
		t.Errorf("FinaleAnsweringSeat(1) = %d, want %d", got, want)
	}

	// The other finalist takes it, and is paid for it.
	store.attempts = 1
	if err := settleFinale(t, store, true); err != nil {
		t.Fatalf("second go: %v", err)
	}

	if got, want := store.session.PlayerAt(2).Score, FinalePoints; got != want {
		t.Errorf("Score = %d, want %d -- a passed question still pays", got, want)
	}
	if got, want := store.session.CurrentPosition, 1; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}
}

// Two goes and no more: a question neither of them gets dies, the same as a round 1
// question that beat the table.
func TestFinaleQuestionNeitherFinalistGetsIsDead(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 0, 4), attempts: 1}

	if err := settleFinale(t, store, false); err != nil {
		t.Fatalf("second go: %v", err)
	}

	if got, want := store.session.CurrentPosition, 1; got != want {
		t.Errorf("CurrentPosition = %d, want %d -- the question is over", got, want)
	}
	if got := only(store.recorded.Questions); got == nil || got.Points != 0 {
		t.Error("a question neither finalist got should be closed for no points")
	}
	if len(store.recorded.Players) > 0 {
		t.Error("a scoreless question still asked for a score update")
	}
}

func TestFinaleRefusesAThirdGoAtTheSameQuestion(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 0, 4), attempts: FinalistCount}

	if err := settleFinale(t, store, true); !errors.Is(err, ErrStaleTurn) {
		t.Fatalf("err = %v, want %v", err, ErrStaleTurn)
	}
}

func TestFinaleRefusesRoundsThatAreNotTheFinale(t *testing.T) {
	for _, round := range []int{RoundOpen, RoundChoice, RoundClosest, RoundDescribe, RoundList} {
		session := newFinaleSession(3, 1, 2, 0, 4)
		session.CurrentRound = round
		for i := range session.Questions {
			session.Questions[i].Round = round
		}

		store := &verdictStore{session: session}
		_, err := NewService(store).RecordFinaleVerdict(t.Context(), VerdictInput{
			SessionID:         session.ID,
			OwnerID:           verdictOwner,
			SessionQuestionID: session.Questions[0].ID,
			Correct:           true,
		})

		if !errors.Is(err, ErrWrongRound) {
			t.Errorf("round %d: err = %v, want %v", round, err, ErrWrongRound)
		}
	}
}

func TestFinaleRefusesAStaleTurn(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 0, 4)}

	_, err := NewService(store).RecordFinaleVerdict(t.Context(), VerdictInput{
		SessionID:         store.session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: uuid.New(),
		Correct:           true,
	})

	if !errors.Is(err, ErrStaleTurn) {
		t.Fatalf("err = %v, want %v", err, ErrStaleTurn)
	}
}

// The last finale question ends the session rather than opening a round 7 that does not
// exist.
func TestFinaleEndsTheSession(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(3, 1, 2, 3, 4)}

	if err := settleFinale(t, store, true); err != nil {
		t.Fatalf("RecordFinaleVerdict: %v", err)
	}

	if got, want := store.session.Status, SessionCompleted; got != want {
		t.Errorf("Status = %q, want %q", got, want)
	}
	if store.session.CompletedAt == nil {
		t.Error("CompletedAt was left unset")
	}
}

// --- OpenFinale --------------------------------------------------------------------

func TestOpenFinalePicksTheTopTwoScoresAndThirdPlaceReads(t *testing.T) {
	session := &Session{Players: []SessionPlayer{
		{Seat: 0, Score: 3}, {Seat: 1, Score: 9}, {Seat: 2, Score: 1}, {Seat: 3, Score: 5},
	}}

	session.OpenFinale()

	// Seats 1 (9) and 3 (5) are the top two, and seat 0 (3) is the best of the rest.
	a, b, ok := session.Finalists()
	if !ok || a != 1 || b != 3 {
		t.Errorf("Finalists() = %d, %d, %v -- want 1, 3, true", a, b, ok)
	}
	if got, want := session.QuizMasterSeat, 0; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- third place reads the finale", got, want)
	}
	if got, want := session.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d -- the finalist behind opens", got, want)
	}
}

// Neither finalist may be handed the quizmaster's chair, whatever the scores look like.
func TestOpenFinaleNeverSeatsAFinalistAsQuizmaster(t *testing.T) {
	session := &Session{Players: []SessionPlayer{
		{Seat: 0, Score: 5}, {Seat: 1, Score: 5}, {Seat: 2, Score: 5}, {Seat: 3, Score: 0},
	}}

	session.OpenFinale()

	// Ties go the way LowestScoringSeat's do: to whoever sits nearest the head.
	a, b, _ := session.Finalists()
	if a != 0 || b != 1 {
		t.Errorf("Finalists() = %d, %d -- want 0, 1; ties favour the lower seat", a, b)
	}
	if got, want := session.QuizMasterSeat, 2; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d", got, want)
	}
	if session.FinaleRival(session.QuizMasterSeat) >= 0 {
		t.Error("the quizmaster is one of the finalists")
	}
}

// A table with nobody spare to read is below MinPlayers and cannot happen through the
// setup form, but it must not seat somebody as their own quizmaster either.
func TestOpenFinaleDeclinesATableOfTwo(t *testing.T) {
	session := &Session{Players: []SessionPlayer{{Seat: 0, Score: 4}, {Seat: 1, Score: 1}}}

	session.OpenFinale()

	if _, _, ok := session.Finalists(); ok {
		t.Error("a table of two seated a finale")
	}
}

func TestFinaleOpenerBreaksTiesBySeat(t *testing.T) {
	session := &Session{
		Players:       []SessionPlayer{{Seat: 1, Score: 200}, {Seat: 2, Score: 200}},
		FinalistSeatA: 2, FinalistSeatB: 1,
	}

	if got, want := session.FinaleOpener(), 1; got != want {
		t.Errorf("FinaleOpener() = %d, want %d", got, want)
	}
}

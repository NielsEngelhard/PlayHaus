package pubquizr

import (
	"errors"
	"testing"

	"github.com/google/uuid"
)

// The finale is round 1's question-asking -- an open question, read aloud -- on round
// 2's turn order -- the seat never keeps itself, right or wrong. With only two players
// left there is no line to pass a question down, so these tests are about the swap and
// about FinaleScore rather than about an attempt count.

// newFinaleSession is a table of four with `positions` finale questions dealt and the
// finale already opened between `hot` and `master`.
func newFinaleSession(master, hot, position, positions int) *Session {
	session := newVerdictSession(master, hot, position, positions)
	session.CurrentRound = RoundFinale
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

// A correct answer pays FinaleScore, not Score -- the finale is won on its own tally.
func TestFinaleVerdictPaysFinaleScoreNotScore(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(0, 1, 0, 4)}

	if err := settleFinale(t, store, true); err != nil {
		t.Fatalf("RecordFinaleVerdict: %v", err)
	}

	player := store.session.PlayerAt(1)
	if got, want := player.FinaleScore, FinalePoints; got != want {
		t.Errorf("FinaleScore = %d, want %d", got, want)
	}
	if got := player.Score; got != 0 {
		t.Errorf("Score = %d, want 0 -- the finale does not add to the running total", got)
	}
}

func TestFinaleVerdictScoresNothingWhenWrong(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(0, 1, 0, 4)}

	if err := settleFinale(t, store, false); err != nil {
		t.Fatalf("RecordFinaleVerdict: %v", err)
	}

	if got := store.session.PlayerAt(1).FinaleScore; got != 0 {
		t.Errorf("FinaleScore = %d, want 0", got)
	}
}

// Round 2's rule: the seat never keeps itself, right or wrong. With two finalists that
// just means the two names swap every question.
func TestFinaleAlwaysSwapsRegardlessOfTheVerdict(t *testing.T) {
	for _, correct := range []bool{true, false} {
		store := &verdictStore{session: newFinaleSession(0, 1, 0, 4)}

		if err := settleFinale(t, store, correct); err != nil {
			t.Fatalf("RecordFinaleVerdict(correct=%v): %v", correct, err)
		}

		if got, want := store.session.HotSeat, 0; got != want {
			t.Errorf("correct=%v: HotSeat = %d, want %d -- the reader answers next", correct, got, want)
		}
		if got, want := store.session.QuizMasterSeat, 1; got != want {
			t.Errorf("correct=%v: QuizMasterSeat = %d, want %d -- whoever just answered reads next", correct, got, want)
		}
	}
}

func TestFinaleSwapsBackAndForth(t *testing.T) {
	store := &verdictStore{session: newFinaleSession(0, 1, 0, 4)}

	if err := settleFinale(t, store, true); err != nil {
		t.Fatalf("question 1: %v", err)
	}
	if got, want := store.session.HotSeat, 0; got != want {
		t.Fatalf("after question 1: HotSeat = %d, want %d", got, want)
	}

	if err := settleFinale(t, store, false); err != nil {
		t.Fatalf("question 2: %v", err)
	}
	if got, want := store.session.HotSeat, 1; got != want {
		t.Errorf("after question 2: HotSeat = %d, want %d -- back to where it opened", got, want)
	}
}

func TestFinaleRefusesRoundsThatAreNotTheFinale(t *testing.T) {
	for _, round := range []int{RoundOpen, RoundChoice, RoundClosest, RoundDescribe, RoundList} {
		session := newFinaleSession(0, 1, 0, 4)
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
	store := &verdictStore{session: newFinaleSession(0, 1, 0, 4)}

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
	store := &verdictStore{session: newFinaleSession(0, 1, 3, 4)}

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

func TestOpenFinalePicksTheTopTwoScores(t *testing.T) {
	session := &Session{Players: []SessionPlayer{
		{Seat: 0, Score: 3}, {Seat: 1, Score: 9}, {Seat: 2, Score: 1}, {Seat: 3, Score: 5},
	}}

	session.OpenFinale()

	// Seats 1 (9) and 3 (5) are the top two; the lower of them opens.
	if got, want := session.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d -- the weaker finalist opens", got, want)
	}
	if got, want := session.QuizMasterSeat, 1; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- the stronger finalist reads first", got, want)
	}
}

// Ties go the way LowestScoringSeat's do: to whoever sits nearest the head of the table.
func TestOpenFinaleBreaksTiesBySeat(t *testing.T) {
	session := &Session{Players: []SessionPlayer{
		{Seat: 0, Score: 5}, {Seat: 1, Score: 5}, {Seat: 2, Score: 5}, {Seat: 3, Score: 0},
	}}

	session.OpenFinale()

	if got, want := session.QuizMasterSeat, 0; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- ties favour the lower seat", got, want)
	}
	if got, want := session.HotSeat, 1; got != want {
		t.Errorf("HotSeat = %d, want %d -- ties favour the lower seat", got, want)
	}
}

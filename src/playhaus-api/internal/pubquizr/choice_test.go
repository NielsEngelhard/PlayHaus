package pubquizr

import "testing"

// Round 2 is round 1's hot seat with four options read out and a different sum.
//
// Which means the interesting tests are the differences, not the mechanics -- those are
// verdict_test.go's, and they run against the same code. What is worth proving here is
// that every question pays, that it pays double, and that the seat still moves the way
// it does in round 1, because a shared implementation is only worth having if it really
// is shared.

// newChoiceSession is a table of four part way through round 2.
func newChoiceSession(master, hot, position, positions int) *Session {
	session := newVerdictSession(master, hot, position, positions)
	session.CurrentRound = RoundChoice

	for i := range session.Questions {
		session.Questions[i].Round = RoundChoice
	}

	return session
}

// Round 1's every-second rhythm is what makes surviving a scoreless question worth
// something. Round 2 is one question per player, so there is no lap to survive and every
// one of them simply pays.
func TestEveryChoiceQuestionPays(t *testing.T) {
	for position := 0; position < 4; position++ {
		store := &verdictStore{session: newChoiceSession(0, 1, position, 4)}

		rule(t, store, true)

		if got, want := store.session.PlayerAt(1).Score, ChoicePoints; got != want {
			t.Errorf("question %d scored %d, want %d", position+1, got, want)
		}
		if got, want := only(store.recorded.Questions).Points, ChoicePoints; got != want {
			t.Errorf("question %d was closed for %d, want %d", position+1, got, want)
		}
		if len(store.recorded.Players) != 1 {
			t.Errorf("question %d wrote %d score updates, want 1", position+1, len(store.recorded.Players))
		}
	}
}

// The reading follows the seat in round 2 exactly as it does in round 1: seat 2 takes a
// question seat 1 missed, and the reading comes round to seat 1.
func TestChoiceTakingAQuestionTakesTheReading(t *testing.T) {
	store := &verdictStore{session: newChoiceSession(0, 1, 0, 4), attempts: 2}

	rule(t, store, true)

	if got, want := store.session.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 2; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- read to by the seat on their right", got, want)
	}
}

// And a question that beats the whole table moves both on one, for no points.
func TestChoiceQuestionNobodyGetsMovesOn(t *testing.T) {
	store := &verdictStore{session: newChoiceSession(0, 1, 0, 4), attempts: 2}

	rule(t, store, false)

	if got, want := store.session.QuizMasterSeat, 1; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d", got, want)
	}
	if got, want := store.session.HotSeat, 2; got != want {
		t.Errorf("HotSeat = %d, want %d", got, want)
	}
	if got := store.session.PlayerAt(3).Score; got != 0 {
		t.Errorf("the last seat to miss it scored %d, want 0", got)
	}
	if got := only(store.recorded.Questions); got == nil || got.Points != 0 {
		t.Error("a question nobody got should be closed for no points")
	}
}

// The round is as long as the table, and the last question of it hands the game to
// round 3 -- opened on whoever is furthest behind, read to by their neighbour.
func TestRoundTwoEndsIntoRoundThree(t *testing.T) {
	session := newChoiceSession(0, 1, 3, 4)
	session.Players[0].Score = 6
	session.Players[1].Score = 4
	session.Players[2].Score = 9
	session.Players[3].Score = 1

	store := &verdictStore{session: session}

	rule(t, store, true) // seat 1 takes the last one: 4 -> 6

	if got, want := store.session.CurrentRound, RoundClosest; got != want {
		t.Fatalf("CurrentRound = %d, want %d", got, want)
	}
	if got, want := store.session.CurrentPosition, 0; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}
	if got, want := store.session.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d -- round 3 opens on the lowest score", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 2; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d", got, want)
	}
}

// Rounds this build cannot play are still refused, which is what stops a screen left
// open on the wrong round scoring into it.
func TestHotSeatVerdictRefusesRoundsThatAreNotAHotSeat(t *testing.T) {
	for _, round := range []int{RoundClosest, RoundDescribe, RoundList, RoundFinale} {
		session := newChoiceSession(0, 1, 0, 4)
		session.CurrentRound = round
		for i := range session.Questions {
			session.Questions[i].Round = round
		}

		store := &verdictStore{session: session}
		question := session.QuestionAt(round, 0)

		_, err := NewService(store).RecordHotSeatVerdict(t.Context(), VerdictInput{
			SessionID:         session.ID,
			OwnerID:           verdictOwner,
			SessionQuestionID: question.ID,
			Correct:           true,
		})
		if err == nil {
			t.Errorf("round %d took a hot seat verdict", round)
		}
	}
}

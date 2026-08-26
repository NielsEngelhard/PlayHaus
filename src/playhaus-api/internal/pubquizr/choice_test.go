package pubquizr

import (
	"slices"
	"sort"
	"testing"
)

// Round 2 is round 1's hot seat with four options read out, a different sum, and one
// rule of its own: nobody keeps the seat. The round deals exactly one question per
// player, and the only way that turns into everybody asked once and everybody reading
// once is if landing a question never buys another go at the next one -- so what is
// worth proving here is that every question pays, that it pays double, and that the
// seat always shuffles on by exactly one, correct or not, regardless of who actually
// answered it.

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

// Unlike round 1, taking a question from down the table does not hand the taker the
// seat: it shuffles on from where the question opened regardless of who ends up
// answering it correctly, because round 2's fairness only holds if landing a question
// never buys another go at the next one.
func TestChoiceCorrectAnswerStillShufflesOn(t *testing.T) {
	// Question opened on seat 1, already missed by seats 1 and 2; seat 3 takes it.
	store := &verdictStore{session: newChoiceSession(0, 1, 0, 4), attempts: 2}

	rule(t, store, true)

	if got, want := store.session.HotSeat, 2; got != want {
		t.Errorf("HotSeat = %d, want %d -- one along from where the question opened, not from who took it", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 1; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- read to by the seat on their right", got, want)
	}
}

// Over the whole round, every seat is the hot seat exactly once and quizmaster exactly
// once -- the round deals one question per player, and a correct answer never keeps the
// seat, so the two rings walk the table exactly once each and never repeat.
func TestRoundTwoGivesEverySeatOneTurnEachWay(t *testing.T) {
	store := &verdictStore{session: newChoiceSession(0, 1, 0, 4)}

	var hotSeats, quizMasters []int
	for i := 0; i < 4; i++ {
		hotSeats = append(hotSeats, store.session.HotSeat)
		quizMasters = append(quizMasters, store.session.QuizMasterSeat)

		store.attempts = 0
		rule(t, store, true)
	}

	sort.Ints(hotSeats)
	sort.Ints(quizMasters)

	want := []int{0, 1, 2, 3}
	if !slices.Equal(hotSeats, want) {
		t.Errorf("hot seats over the round = %v, want each seat exactly once: %v", hotSeats, want)
	}
	if !slices.Equal(quizMasters, want) {
		t.Errorf("quizmasters over the round = %v, want each seat exactly once: %v", quizMasters, want)
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

package pubquizr

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

// settleAt writes one question's attempts as settled at a given moment: the missed seats, then the taker if there is one.
func settleAt(t *testing.T, store *GormStore, session *Session, position int, at time.Time, missed []int, correct *int) {
	t.Helper()

	question := session.QuestionAt(RoundOpen, position)
	question.Status = QuestionDone

	out := TurnOutcome{Questions: []*SessionQuestion{question}}
	for _, seat := range missed {
		out.Answers = append(out.Answers, &SessionAnswer{
			ID: uuid.New(), SessionID: session.ID, SessionQuestionID: question.ID, Seat: &seat, CreatedAt: at,
		})
	}
	if correct != nil {
		out.Answers = append(out.Answers, &SessionAnswer{
			ID: uuid.New(), SessionID: session.ID, SessionQuestionID: question.ID, Seat: correct, Correct: true, CreatedAt: at,
		})
	}

	if err := store.RecordTurn(context.Background(), session, out); err != nil {
		t.Fatalf("record turn: %v", err)
	}
}

func TestLastRulingIsNothingBeforeTheRoundHasSettledAQuestion(t *testing.T) {
	store, _ := newHotSeatStore(t)
	session := seedHotSeatSession(t, store)

	_, _, found, err := store.LastRulingIn(context.Background(), session.ID, RoundOpen)
	if err != nil {
		t.Fatalf("last ruling: %v", err)
	}
	if found {
		t.Error("found = true on a round nothing has been settled in")
	}
}

func TestLastRulingNamesTheSeatThatTookIt(t *testing.T) {
	store, _ := newHotSeatStore(t)
	session := seedHotSeatSession(t, store)

	taker := 2
	settleAt(t, store, session, 0, time.Now().UTC(), []int{1}, &taker)

	questionID, seat, found, err := store.LastRulingIn(context.Background(), session.ID, RoundOpen)
	if err != nil {
		t.Fatalf("last ruling: %v", err)
	}
	if !found || questionID != session.QuestionAt(RoundOpen, 0).ID {
		t.Fatalf("last ruling = %v (found %v), want the first question", questionID, found)
	}
	if seat != taker {
		t.Errorf("seat = %d, want %d", seat, taker)
	}
}

func TestLastRulingIsNobodyWhenTheQuestionBeatTheTable(t *testing.T) {
	store, _ := newHotSeatStore(t)
	session := seedHotSeatSession(t, store)

	settleAt(t, store, session, 0, time.Now().UTC(), []int{1, 2, 3}, nil)

	_, seat, found, err := store.LastRulingIn(context.Background(), session.ID, RoundOpen)
	if err != nil {
		t.Fatalf("last ruling: %v", err)
	}
	if !found || seat != -1 {
		t.Errorf("last ruling = seat %d (found %v), want nobody", seat, found)
	}
}

func TestLastRulingFollowsTheClockRatherThanThePosition(t *testing.T) {
	store, _ := newHotSeatStore(t)
	session := seedHotSeatSession(t, store)

	// Round 6 plays its pool in whatever order the players pick, so a later position can be settled first.
	earlier, later := 1, 3
	now := time.Now().UTC()
	settleAt(t, store, session, 3, now, nil, &earlier)
	settleAt(t, store, session, 1, now.Add(time.Second), nil, &later)

	questionID, seat, _, err := store.LastRulingIn(context.Background(), session.ID, RoundOpen)
	if err != nil {
		t.Fatalf("last ruling: %v", err)
	}
	if questionID != session.QuestionAt(RoundOpen, 1).ID || seat != later {
		t.Errorf("last ruling = %v seat %d, want position 1 seat %d", questionID, seat, later)
	}
}

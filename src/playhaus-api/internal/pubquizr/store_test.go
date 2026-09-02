package pubquizr

import (
	"context"
	"testing"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// insertPlayedSession writes a session with one player, one dealt question and one
// answer, so a delete has something at every level below the session to clean up.
func insertPlayedSession(t *testing.T, db *gorm.DB, ownerID string, createdAt time.Time) uuid.UUID {
	t.Helper()

	sessionID := uuid.New()
	questionID := uuid.New()

	session := &Session{
		ID:              sessionID,
		QuizID:          uuid.New(),
		OwnerID:         ownerID,
		Mode:            ModeSingleDevice,
		Locale:          i18n.NL,
		Status:          SessionInProgress,
		CurrentRound:    1,
		CurrentPosition: 0,
		QuizMasterSeat:  0,
		HotSeat:         0,
		FinalistSeatA:   -1,
		FinalistSeatB:   -1,
		Players: []SessionPlayer{{
			SessionID: sessionID,
			Seat:      0,
			Name:      "Alex",
			Color:     "red",
			CreatedAt: createdAt,
		}},
		Questions: []SessionQuestion{{
			ID:         questionID,
			SessionID:  sessionID,
			Round:      1,
			Position:   0,
			QuestionID: uuid.New(),
			Status:     QuestionDone,
			CreatedAt:  createdAt,
		}},
		CreatedAt: createdAt,
		UpdatedAt: createdAt,
	}

	if err := db.Create(session).Error; err != nil {
		t.Fatalf("insert session: %v", err)
	}

	answer := &SessionAnswer{
		ID:                uuid.New(),
		SessionID:         sessionID,
		SessionQuestionID: questionID,
		CreatedAt:         createdAt,
	}
	if err := db.Create(answer).Error; err != nil {
		t.Fatalf("insert answer: %v", err)
	}

	return sessionID
}

// The retention sweep goes by age alone -- an evening abandoned three days ago is
// exactly as stale as one that finished cleanly.
func TestDeleteSessionsOlderThanLeavesRecentSessionsAlone(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()
	cutoff := now.Add(-72 * time.Hour)

	old := insertPlayedSession(t, db, "owner", now.Add(-73*time.Hour))
	recent := insertPlayedSession(t, db, "owner", now.Add(-1*time.Hour))

	deleted, err := store.DeleteSessionsOlderThan(context.Background(), cutoff)
	if err != nil {
		t.Fatalf("delete sessions older than cutoff: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("deleted = %d, want 1", deleted)
	}

	var sessionIDs []uuid.UUID
	if err := db.Model(&Session{}).Pluck("id", &sessionIDs).Error; err != nil {
		t.Fatalf("read sessions: %v", err)
	}
	if len(sessionIDs) != 1 || sessionIDs[0] != recent {
		t.Fatalf("sessions left = %v, want only %v", sessionIDs, recent)
	}

	assertRowCount(t, db, "pq_session_players", 1)
	assertRowCount(t, db, "pq_session_questions", 1)
	assertRowCount(t, db, "pq_session_answers", 1)

	var remainingSessionIDs []uuid.UUID
	if err := db.Model(&SessionAnswer{}).Pluck("session_id", &remainingSessionIDs).Error; err != nil {
		t.Fatalf("read answers: %v", err)
	}
	if len(remainingSessionIDs) != 1 || remainingSessionIDs[0] != recent {
		t.Fatalf("answer belongs to %v, want %v", remainingSessionIDs, recent)
	}

	_ = old
}

func assertRowCount(t *testing.T, db *gorm.DB, table string, want int64) {
	t.Helper()

	var got int64
	if err := db.Table(table).Count(&got).Error; err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	if got != want {
		t.Errorf("%s has %d rows, want %d", table, got, want)
	}
}

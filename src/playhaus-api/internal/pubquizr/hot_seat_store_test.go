package pubquizr

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/platform/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// The hot seat only works if it survives the round trip. Everything else about the
// round is arithmetic that verdict_test.go covers without a database, but "the seat
// you kept is still yours on the next request" is a claim about a column, and a
// missing key in the RecordTurn updates map would leave every one of those tests
// passing while the game quietly reset the seat between questions.

func newHotSeatStore(t *testing.T) (*GormStore, *gorm.DB) {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "hotseat.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open.
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	models := Models()
	if err := database.Migrate(db, models[0], models[1:]...); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	return NewGormStore(db), db
}

func seedHotSeatSession(t *testing.T, store *GormStore) *Session {
	t.Helper()

	now := time.Now().UTC()
	session := &Session{
		ID:              uuid.New(),
		QuizID:          uuid.New(),
		OwnerID:         "owner",
		Mode:            ModeSingleDevice,
		Locale:          i18n.Default,
		Status:          SessionInProgress,
		CurrentRound:    RoundOpen,
		CurrentPosition: 0,
		QuizMasterSeat:  0,
		HotSeat:         1,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	for seat, name := range []string{"Niels", "Sanne", "Tim", "Ada"} {
		session.Players = append(session.Players, SessionPlayer{
			SessionID: session.ID,
			Seat:      seat,
			Name:      name,
			Color:     "sun",
			CreatedAt: now,
		})
	}

	for position := 0; position < 4; position++ {
		session.Questions = append(session.Questions, SessionQuestion{
			ID:         uuid.New(),
			SessionID:  session.ID,
			Round:      RoundOpen,
			Position:   position,
			QuestionID: uuid.New(),
			Status:     QuestionPending,
			CreatedAt:  now,
		})
	}

	if err := store.CreateSession(context.Background(), session); err != nil {
		t.Fatalf("create session: %v", err)
	}

	return session
}

func TestHotSeatSurvivesTheRoundTrip(t *testing.T) {
	ctx := context.Background()
	store, _ := newHotSeatStore(t)
	service := NewService(store)

	session := seedHotSeatSession(t, store)

	// Question 1 has already been missed by seats 1 and 2; seat 3 takes it.
	question := session.QuestionAt(RoundOpen, 0)
	for _, seat := range []int{1, 2} {
		missed := seat
		attempt := &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &missed,
			Correct:           false,
			CreatedAt:         time.Now().UTC(),
		}
		if err := store.RecordTurn(ctx, session, TurnOutcome{Answers: []*SessionAnswer{attempt}}); err != nil {
			t.Fatalf("record miss: %v", err)
		}
	}

	moved, err := service.RecordHotSeatVerdict(ctx, VerdictInput{
		SessionID:         session.ID,
		OwnerID:           "owner",
		SessionQuestionID: question.ID,
		Correct:           true,
	})
	if err != nil {
		t.Fatalf("RecordHotSeatVerdict: %v", err)
	}

	// Read back off the database, not out of the pointer we just mutated.
	if got, want := moved.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d -- the seat that took it did not stick", got, want)
	}
	if got, want := moved.QuizMasterSeat, 2; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- the reading did not follow the seat round", got, want)
	}
	if got, want := moved.HotSeatRun, 1; got != want {
		t.Errorf("HotSeatRun = %d, want %d -- the run did not survive the round trip", got, want)
	}
	if got, want := moved.CurrentPosition, 1; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}

	// And the seat is where the next question actually opens.
	seat, err := service.AnsweringSeatFor(ctx, moved)
	if err != nil {
		t.Fatalf("AnsweringSeatFor: %v", err)
	}
	if want := 3; seat != want {
		t.Errorf("next question opens on seat %d, want %d", seat, want)
	}
}

// A session dealt before the column existed carries -1, and has to keep playing as if
// nothing had changed rather than asking whoever happens to sit in seat 0.
func TestSessionFromBeforeTheHotSeatColumnStillPlays(t *testing.T) {
	ctx := context.Background()
	store, db := newHotSeatStore(t)
	service := NewService(store)

	session := seedHotSeatSession(t, store)

	// What AutoMigrate leaves behind on a row that predates the column.
	err := db.Model(&Session{}).
		Where("id = ?", session.ID).
		Updates(map[string]any{"quiz_master_seat": 2, "hot_seat": -1}).Error
	if err != nil {
		t.Fatalf("age the row: %v", err)
	}

	stale, err := service.SessionForOwner(ctx, session.ID, "owner")
	if err != nil {
		t.Fatalf("SessionForOwner: %v", err)
	}

	seat, err := service.AnsweringSeatFor(ctx, stale)
	if err != nil {
		t.Fatalf("AnsweringSeatFor: %v", err)
	}
	// The old rule: the seat on the reader's left.
	if want := 3; seat != want {
		t.Errorf("answering seat = %d, want %d", seat, want)
	}

	// And a verdict on it repairs the column rather than tripping over it.
	moved, err := service.RecordHotSeatVerdict(ctx, VerdictInput{
		SessionID:         session.ID,
		OwnerID:           "owner",
		SessionQuestionID: stale.QuestionAt(RoundOpen, 0).ID,
		Correct:           true,
	})
	if err != nil {
		t.Fatalf("RecordHotSeatVerdict: %v", err)
	}
	if got, want := moved.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d", got, want)
	}
}

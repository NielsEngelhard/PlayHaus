package oneofus

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

func newTestStore(t *testing.T) (*GormStore, *gorm.DB) {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open, so close
	// it explicitly before cleanup runs.
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

// insertOneOfUsGame writes a game with one player, so a delete has something below
// the game to clean up.
func insertOneOfUsGame(t *testing.T, db *gorm.DB, ownerID string, createdAt time.Time) uuid.UUID {
	t.Helper()

	game := &OneOfUsSingleDeviceGame{
		ID:               uuid.New(),
		OwnerID:          ownerID,
		Locale:           i18n.NL,
		CreatedAt:        createdAt,
		ActualQuestion:   "real",
		ImposterQuestion: "fake",
		Players: []OneOfUsLocalPlayer{{
			PlayerID:  uuid.New(),
			Name:      "Alex",
			Role:      Civilian,
			CreatedAt: createdAt,
		}},
	}

	if err := db.Create(game).Error; err != nil {
		t.Fatalf("insert game: %v", err)
	}

	return game.ID
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

// The retention sweep goes by age alone, finished or not -- a table nobody came back
// to is exactly as stale as one that played all the way through.
func TestDeleteGamesOlderThanLeavesRecentGamesAlone(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()
	cutoff := now.Add(-12 * time.Hour)

	insertOneOfUsGame(t, db, "owner", now.Add(-13*time.Hour))
	recent := insertOneOfUsGame(t, db, "owner", now.Add(-1*time.Hour))

	deleted, err := store.DeleteGamesOlderThan(context.Background(), cutoff)
	if err != nil {
		t.Fatalf("delete games older than cutoff: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("deleted = %d, want 1", deleted)
	}

	var gameIDs []uuid.UUID
	if err := db.Model(&OneOfUsSingleDeviceGame{}).Pluck("id", &gameIDs).Error; err != nil {
		t.Fatalf("read games: %v", err)
	}
	if len(gameIDs) != 1 || gameIDs[0] != recent {
		t.Fatalf("games left = %v, want only %v", gameIDs, recent)
	}

	assertRowCount(t, db, "oou_local_players", 1)

	var remaining []OneOfUsLocalPlayer
	if err := db.Find(&remaining).Error; err != nil {
		t.Fatalf("read players: %v", err)
	}
	if len(remaining) != 1 || remaining[0].SessionID != recent {
		t.Fatalf("player belongs to %v, want %v", remaining, recent)
	}
}

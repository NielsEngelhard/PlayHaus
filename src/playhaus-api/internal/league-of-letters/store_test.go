package league_of_letters

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

func insertGame(t *testing.T, db *gorm.DB, ownerID string, status GameStatus, createdAt time.Time) uuid.UUID {
	t.Helper()

	game := &SoloLeagueOfLettersGame{
		ID:           uuid.New(),
		OwnerID:      ownerID,
		Locale:       i18n.NL,
		WordLength:   5,
		CurrentRound: 1,
		Status:       status,
		CreatedAt:    createdAt,
	}

	if err := db.Create(game).Error; err != nil {
		t.Fatalf("insert game: %v", err)
	}

	return game.ID
}

// The list this feeds is the reconnect screen, so a game that is over must not
// be in it: its row would offer a way back into a finished board.
func TestGetSoloGamesByUserIdOnlyReturnsUnfinishedGames(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()

	older := insertGame(t, db, "owner", GameInProgress, now.Add(-2*time.Hour))
	newer := insertGame(t, db, "owner", GameInProgress, now.Add(-1*time.Hour))
	insertGame(t, db, "owner", GameCompleted, now)
	insertGame(t, db, "owner", GameAbandoned, now)
	insertGame(t, db, "somebody-else", GameInProgress, now)

	games, err := store.GetSoloGamesByUserId(context.Background(), "owner")
	if err != nil {
		t.Fatalf("get solo games: %v", err)
	}

	if len(games) != 2 {
		t.Fatalf("got %d games, want 2", len(games))
	}

	// Newest first, so the game most likely to be picked up again is at the top.
	if games[0].ID != newer || games[1].ID != older {
		t.Errorf("got order %v, %v; want %v, %v", games[0].ID, games[1].ID, newer, older)
	}
}

func TestGetSoloGamesByUserIdWithNoGames(t *testing.T) {
	store, db := newTestStore(t)

	insertGame(t, db, "somebody-else", GameInProgress, time.Now().UTC())

	games, err := store.GetSoloGamesByUserId(context.Background(), "owner")
	if err != nil {
		t.Fatalf("get solo games: %v", err)
	}

	if len(games) != 0 {
		t.Fatalf("got %d games, want none", len(games))
	}
}

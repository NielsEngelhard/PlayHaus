package lol

import (
	"path/filepath"
	"testing"

	"playhaus-api/internal/platform/database"
)

// A solo game already in flight when the modes shipped has to migrate into a zen game
// rather than into a competitive one with a clock that started days ago.
func TestMigrateTurnsExistingSoloGamesIntoZenGames(t *testing.T) {
	db, err := database.Open(filepath.Join(t.TempDir(), "old.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	// The table as it stood before zen and competitive existed.
	if err := db.Exec(`CREATE TABLE solo_lol_games (
		id text PRIMARY KEY,
		owner_id text NOT NULL,
		locale text NOT NULL,
		word_length integer NOT NULL,
		seconds_per_guess integer,
		current_round integer NOT NULL,
		score integer NOT NULL,
		status text NOT NULL,
		created_at datetime NOT NULL
	)`).Error; err != nil {
		t.Fatalf("create old table: %v", err)
	}
	if err := db.Exec(`INSERT INTO solo_lol_games
		(id, owner_id, locale, word_length, current_round, score, status, created_at)
		VALUES ('11111111-1111-4111-8111-111111111111', 'u1', 'nl', 5, 2, 14, 'in_progress', '2026-01-01 00:00:00')`).Error; err != nil {
		t.Fatalf("seed old row: %v", err)
	}

	models := Models()
	if err := database.Migrate(db, models[0], models[1:]...); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	var got SoloLeagueOfLettersGame
	if err := db.First(&got, "id = ?", "11111111-1111-4111-8111-111111111111").Error; err != nil {
		t.Fatalf("read back: %v", err)
	}
	if got.Competitive {
		t.Error("an existing game migrated into a competitive one")
	}
	if got.TimeBonus != 0 {
		t.Errorf("TimeBonus = %d, want 0", got.TimeBonus)
	}
	if got.FinishedAt != nil {
		t.Errorf("FinishedAt = %v, want nil on a game still in progress", got.FinishedAt)
	}
}

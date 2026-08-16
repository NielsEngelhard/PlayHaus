package user

import (
	"path/filepath"
	"testing"

	"playhaus-api/internal/platform/database"
)

// An account that predates these columns still has to migrate, and has to come
// out of it with a swatch and its sound on rather than a blank and an off.
func TestMigrateBackfillsExistingRows(t *testing.T) {
	db, err := database.Open(filepath.Join(t.TempDir(), "old.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	// The users table as it stood before the profile fields existed.
	if err := db.Exec(`CREATE TABLE users (
		id text PRIMARY KEY,
		email text NOT NULL,
		name text NOT NULL,
		password_hash text,
		is_guest numeric NOT NULL,
		locale text NOT NULL,
		created_at datetime NOT NULL,
		updated_at datetime
	)`).Error; err != nil {
		t.Fatalf("create old table: %v", err)
	}
	if err := db.Exec(`INSERT INTO users (id, email, name, is_guest, locale, created_at)
		VALUES ('u1', 'a@b.com', 'A', 0, 'nl', '2026-01-01 00:00:00')`).Error; err != nil {
		t.Fatalf("seed old row: %v", err)
	}

	if err := database.Migrate(db, &User{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	var got User
	if err := db.First(&got, "id = ?", "u1").Error; err != nil {
		t.Fatalf("read back: %v", err)
	}
	if got.Color != DefaultColor {
		t.Errorf("Color = %q, want %q", got.Color, DefaultColor)
	}
	if !got.EnableSounds || !got.EnableMusic || !got.EnableVibration {
		t.Errorf("toggles = sounds:%t music:%t vibration:%t, want all true",
			got.EnableSounds, got.EnableMusic, got.EnableVibration)
	}
}

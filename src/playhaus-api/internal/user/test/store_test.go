package user

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/platform/database"

	"gorm.io/gorm"
)

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open.
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	if err := database.Migrate(db, &User{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func testUser(locale i18n.Locale) *User {
	hash := "x"
	return &User{
		ID:           "u1",
		Email:        "a@b.com",
		Name:         "A",
		PasswordHash: &hash,
		Locale:       locale,
		CreatedAt:    time.Now().UTC(),
	}
}

func TestLocaleRoundTrip(t *testing.T) {
	for _, want := range []i18n.Locale{i18n.EN, i18n.NL} {
		t.Run(want.String(), func(t *testing.T) {
			db := newTestDB(t)

			if err := NewGormStore(db).Create(context.Background(), testUser(want)); err != nil {
				t.Fatalf("create: %v", err)
			}

			var got User
			if err := db.First(&got, "id = ?", "u1").Error; err != nil {
				t.Fatalf("read back: %v", err)
			}
			if got.Locale != want {
				t.Errorf("Locale = %q, want %q", got.Locale, want)
			}
			if !got.Locale.Valid() {
				t.Errorf("Locale %q came back invalid", got.Locale)
			}
		})
	}
}

// The column holds the plain locale text, not a Go-specific encoding.
func TestLocaleStoredAsPlainText(t *testing.T) {
	db := newTestDB(t)

	if err := NewGormStore(db).Create(context.Background(), testUser(i18n.NL)); err != nil {
		t.Fatalf("create: %v", err)
	}

	var raw string
	if err := db.Raw("SELECT locale FROM users WHERE id = ?", "u1").Scan(&raw).Error; err != nil {
		t.Fatalf("raw read: %v", err)
	}
	if raw != "nl" {
		t.Errorf("stored value = %q, want %q", raw, "nl")
	}
}

// Value() guards the write path, so bad data never reaches the table.
func TestUnsupportedLocaleRejectedOnWrite(t *testing.T) {
	tests := map[string]i18n.Locale{
		"unsupported": i18n.Locale("de"),
		"zero value":  i18n.Locale(""),
	}

	for name, locale := range tests {
		t.Run(name, func(t *testing.T) {
			db := newTestDB(t)

			if err := NewGormStore(db).Create(context.Background(), testUser(locale)); err == nil {
				t.Fatalf("stored unsupported locale %q without an error", locale)
			}
		})
	}
}

// Scan() guards the read path, so a hand-edited row is caught rather than
// silently producing a User with a locale the app does not support.
func TestUnsupportedLocaleRejectedOnRead(t *testing.T) {
	db := newTestDB(t)

	if err := NewGormStore(db).Create(context.Background(), testUser(i18n.EN)); err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := db.Exec(`UPDATE users SET locale = 'de' WHERE id = ?`, "u1").Error; err != nil {
		t.Fatalf("corrupt row: %v", err)
	}

	var got User
	if err := db.First(&got, "id = ?", "u1").Error; err == nil {
		t.Fatalf("read unsupported locale without an error, got %q", got.Locale)
	}
}

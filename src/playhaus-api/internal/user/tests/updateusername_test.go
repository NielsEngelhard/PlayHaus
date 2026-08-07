package user_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/database"
	"playhaus-api/internal/user"
)

// newDB returns a migrated database in a file of its own, so tests never see
// each other's rows.
func newDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate database: %v", err)
	}

	// Windows won't let TempDir delete a file that is still open, so the
	// connection has to go before the cleanup that removes the directory.
	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err != nil {
			t.Fatalf("unwrap database: %v", err)
		}

		if err := sqlDB.Close(); err != nil {
			t.Fatalf("close database: %v", err)
		}
	})

	return db
}

func newUser(t *testing.T, db *gorm.DB, name string) user.User {
	t.Helper()

	u := user.User{Name: name, Color: "#ff0000"}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user %q: %v", name, err)
	}

	return u
}

func TestUpdateUsername(t *testing.T) {
	db := newDB(t)
	svc := user.NewService(db)
	u := newUser(t, db, "old-name")

	got, err := svc.UpdateUsername(context.Background(), u.ID, "  new-name  ")
	if err != nil {
		t.Fatalf("UpdateUsername: %v", err)
	}

	if got.Name != "new-name" {
		t.Errorf("returned name = %q, want %q", got.Name, "new-name")
	}

	var stored user.User
	if err := db.First(&stored, "id = ?", u.ID).Error; err != nil {
		t.Fatalf("reload user: %v", err)
	}

	if stored.Name != "new-name" {
		t.Errorf("stored name = %q, want %q", stored.Name, "new-name")
	}
}

func TestUpdateUsernameRejectsInvalid(t *testing.T) {
	db := newDB(t)
	svc := user.NewService(db)
	u := newUser(t, db, "old-name")

	tests := map[string]string{
		"empty":       "",
		"whitespace":  "   ",
		"too short":   "ab",
		"too long":    strings.Repeat("a", 21),
		"has space":   "two words",
		"punctuation": "drop;table",
	}

	for name, username := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := svc.UpdateUsername(context.Background(), u.ID, username); !errors.Is(err, user.ErrInvalidUsername) {
				t.Fatalf("err = %v, want ErrInvalidUsername", err)
			}

			var stored user.User
			if err := db.First(&stored, "id = ?", u.ID).Error; err != nil {
				t.Fatalf("reload user: %v", err)
			}

			if stored.Name != "old-name" {
				t.Errorf("stored name = %q, want it left alone", stored.Name)
			}
		})
	}
}

func TestUpdateUsernameRejectsTaken(t *testing.T) {
	db := newDB(t)
	svc := user.NewService(db)

	newUser(t, db, "taken")
	u := newUser(t, db, "mine")

	if _, err := svc.UpdateUsername(context.Background(), u.ID, "taken"); !errors.Is(err, user.ErrUsernameTaken) {
		t.Fatalf("err = %v, want ErrUsernameTaken", err)
	}
}

func TestUpdateUsernameUnknownUser(t *testing.T) {
	svc := user.NewService(newDB(t))

	if _, err := svc.UpdateUsername(context.Background(), uuid.New(), "nobody"); !errors.Is(err, user.ErrNotFound) {
		t.Fatalf("err = %v, want ErrNotFound", err)
	}
}

// do sends body to PUT /me/username as id. A zero id stands for a request
// that never authenticated.
func do(t *testing.T, db *gorm.DB, id uuid.UUID, body string) *http.Response {
	t.Helper()

	r := httptest.NewRequest(http.MethodPut, "/me/username", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")

	if id != uuid.Nil {
		r = r.WithContext(auth.WithUserID(r.Context(), id))
	}

	w := httptest.NewRecorder()
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	user.NewHandlers(db, logger).Routes().ServeHTTP(w, r)

	return w.Result()
}

func TestUpdateUsernameHandler(t *testing.T) {
	db := newDB(t)
	newUser(t, db, "taken")
	u := newUser(t, db, "mine")

	tests := []struct {
		name   string
		id     uuid.UUID
		body   string
		status int
	}{
		{"ok", u.ID, `{"username":"renamed"}`, http.StatusOK},
		{"unauthenticated", uuid.Nil, `{"username":"renamed"}`, http.StatusUnauthorized},
		{"invalid name", u.ID, `{"username":"no"}`, http.StatusBadRequest},
		{"taken name", u.ID, `{"username":"taken"}`, http.StatusConflict},
		{"unknown user", uuid.New(), `{"username":"ghost"}`, http.StatusNotFound},
		{"malformed body", u.ID, `{"username":`, http.StatusBadRequest},
		{"empty body", u.ID, ``, http.StatusBadRequest},
		{"unknown field", u.ID, `{"nickname":"renamed"}`, http.StatusBadRequest},
		{"wrong type", u.ID, `{"username":42}`, http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			res := do(t, db, tc.id, tc.body)
			defer res.Body.Close()

			if res.StatusCode != tc.status {
				body, _ := io.ReadAll(res.Body)
				t.Fatalf("status = %d, want %d (body %s)", res.StatusCode, tc.status, body)
			}

			if tc.status == http.StatusOK {
				var got user.User
				if err := json.NewDecoder(res.Body).Decode(&got); err != nil {
					t.Fatalf("decode response: %v", err)
				}

				if got.Name != "renamed" {
					t.Errorf("response name = %q, want %q", got.Name, "renamed")
				}
			}
		})
	}
}

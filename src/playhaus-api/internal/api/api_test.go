package api

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"playhaus-api/internal/platform/database"
	"playhaus-api/internal/user"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open,
	// so close it explicitly before cleanup runs.
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	if err := database.Migrate(db, &user.User{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	svc := user.NewService(user.NewGormStore(db))
	return NewServer(svc, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func post(t *testing.T, h http.Handler, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

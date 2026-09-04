package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/oneofus"
	"playhaus-api/internal/platform/database"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/realtime"
	"playhaus-api/internal/user"

	"gorm.io/gorm"
)

func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	h, _ := newTestServerWithDB(t)
	return h
}

// newTestServerWithDB also hands back the database, for the few tests that
// assert on what was actually written rather than on the response.
func newTestServerWithDB(t *testing.T) (http.Handler, *gorm.DB) {
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

	models := append([]any{&user.User{}, &auth.Session{}}, lol.Models()...)
	models = append(models, pubquizr.Models()...)
	models = append(models, oneofus.Models()...)
	models = append(models, fakefiller.Models()...)
	if err := database.Migrate(db, models[0], models[1:]...); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	users := user.NewService(user.NewGormStore(db))
	authSvc := auth.NewService(auth.NewGormStore(db), users)
	lol := lol.NewService(lol.NewGormStore(db), lol.Options{})
	quizzes := pubquizr.NewService(pubquizr.NewGormStore(db))
	oneOfUs := oneofus.NewService(oneofus.NewGormStore(db))
	fakeFiller := fakefiller.NewService(fakefiller.NewGormStore(db))

	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	hub := realtime.NewHub(log)
	t.Cleanup(hub.Close)

	handler := NewServer(users, authSvc, lol, quizzes, oneOfUs, fakeFiller, hub, log, testOrigins)
	return handler, db
}

func newRequest(t *testing.T, method, path, body string) *http.Request {
	t.Helper()

	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func serve(h http.Handler, req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

// do drives one request through the whole handler, middleware included.
// token may be empty, which is how the unauthenticated cases are written.
func do(t *testing.T, h http.Handler, method, path, body, token string) *httptest.ResponseRecorder {
	t.Helper()

	req := newRequest(t, method, path, body)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return serve(h, req)
}

func post(t *testing.T, h http.Handler, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, path, body, "")
}

// decodeBody unmarshals a recorded response, failing the test if it is not the
// JSON the handler is supposed to produce.
func decodeBody[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode response: %v (body: %s)", err, rec.Body)
	}
	return v
}

// newGuestSession creates a guest and returns its token. Guests are the
// cheapest way to get an authenticated caller: no password, one request.
func newGuestSession(t *testing.T, h http.Handler) sessionResponse {
	t.Helper()

	rec := post(t, h, "/api/v1/user/guest", `{}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create guest: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	session := decodeBody[sessionResponse](t, rec)
	if session.Token == "" {
		t.Fatal("create guest returned an empty token")
	}
	return session
}

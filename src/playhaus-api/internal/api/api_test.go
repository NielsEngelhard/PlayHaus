package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/wittywars"
	"playhaus-api/internal/friend"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/oneofus"
	"playhaus-api/internal/platform/database/databasetest"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/push"
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
	return newTestServerWithStatsToken(t, "")
}

// newTestServerWithStatsToken is the same server with the operator stats route
// switched on. An empty token leaves it unregistered, which is the default.
func newTestServerWithStatsToken(t *testing.T, statsToken string) (http.Handler, *gorm.DB) {
	t.Helper()

	db := databasetest.Open(t)

	users := user.NewService(user.NewGormStore(db))
	authSvc := auth.NewService(auth.NewGormStore(db), users)
	lol := lol.NewService(lol.NewGormStore(db), lol.Options{})
	quizzes := pubquizr.NewService(pubquizr.NewGormStore(db))
	oneOfUsStore := oneofus.NewGormStore(db)
	oneOfUs := oneofus.NewService(oneOfUsStore, oneOfUsStore)
	fakeFiller := fakefiller.NewService(fakefiller.NewGormStore(db))
	wittyWars := wittywars.NewService(wittywars.NewGormStore(db))
	friends := friend.NewService(friend.NewGormStore(db))

	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	// Push is off, so it only ever logs the delivery it did not make.
	pushes := push.NewService(push.NewGormStore(db), false, log)

	hub := realtime.NewHub(log)
	t.Cleanup(hub.Close)

	handler := NewServer(users, authSvc, lol, quizzes, oneOfUs, fakeFiller, wittyWars, friends, pushes, hub, log, testOrigins, statsToken)
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

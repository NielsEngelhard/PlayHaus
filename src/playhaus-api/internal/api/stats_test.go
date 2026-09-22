package api

import (
	"net/http"
	"testing"
)

func statsRequest(t *testing.T, h http.Handler, token string) *http.Request {
	t.Helper()

	req := newRequest(t, http.MethodGet, "/api/v1/admin/stats", "")
	if token != "" {
		req.Header.Set(statsHeader, token)
	}
	return req
}

// Unset is the default everywhere but production, and it has to mean the route is
// absent rather than merely closed -- nothing should be able to tell it apart from
// a build that never had it.
func TestStatsDoesNotExistWithoutAToken(t *testing.T) {
	h := newTestServer(t)

	rec := serve(h, statsRequest(t, h, "anything"))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestStatsRefusesTheWrongToken(t *testing.T) {
	h, _ := newTestServerWithStatsToken(t, "the-real-token")

	for _, token := range []string{"", "the-real-toke", "the-real-tokenn", "wrong"} {
		rec := serve(h, statsRequest(t, h, token))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("token %q: status = %d, want %d", token, rec.Code, http.StatusUnauthorized)
		}
	}
}

// A guest session is not an operator: requireAuth would have let this through, which
// is the whole reason the route carries its own secret.
func TestStatsIgnoresASessionToken(t *testing.T) {
	h, _ := newTestServerWithStatsToken(t, "the-real-token")
	session := newGuestSession(t, h)

	rec := do(t, h, http.MethodGet, "/api/v1/admin/stats", "", session.Token)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestStatsReportsTheRuntime(t *testing.T) {
	h, _ := newTestServerWithStatsToken(t, "the-real-token")

	rec := serve(h, statsRequest(t, h, "the-real-token"))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	body := decodeBody[statsResponse](t, rec)
	if body.Goroutines < 1 {
		t.Errorf("goroutines = %d, want at least 1", body.Goroutines)
	}
	if body.HeapInUseBytes == 0 {
		t.Error("heapInUseBytes = 0, want the live heap")
	}
	// Nobody has connected, and an empty hub is {} rather than null so the dashboard
	// does not have to special-case a quiet server.
	if body.Rooms == nil {
		t.Error("rooms = null, want an empty object")
	}
	if body.Connections != 0 {
		t.Errorf("connections = %d, want 0", body.Connections)
	}
}

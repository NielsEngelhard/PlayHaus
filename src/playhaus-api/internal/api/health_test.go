package api

import (
	"net/http"
	"testing"
)

// The container healthcheck and the deploy pipeline both call this with nothing
// attached, so "answers without a session" is the whole contract.
func TestHealthAnswersWithoutASession(t *testing.T) {
	h := newTestServer(t)

	rec := do(t, h, http.MethodGet, "/api/v1/health", "", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	body := decodeBody[healthResponse](t, rec)
	if body.Status != "ok" {
		t.Errorf("status = %q, want %q", body.Status, "ok")
	}
}

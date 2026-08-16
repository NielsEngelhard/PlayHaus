package api

import (
	"net/http"
	"testing"
)

// testOrigins is what the test server answers to. One allowed origin is enough
// to tell "allowed" from "refused", which is the whole of the decision.
var testOrigins = []string{"http://localhost:8081"}

func TestCORSAllowsTheWebBuildsOrigin(t *testing.T) {
	srv := newTestServer(t)

	req := newRequest(t, http.MethodPost, "/api/v1/user/guest", `{}`)
	req.Header.Set("Origin", testOrigins[0])
	rec := serve(srv, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigins[0] {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, testOrigins[0])
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Errorf("Vary = %q, want %q", got, "Origin")
	}
}

// A preflight has to be answered by the middleware itself: no route is
// registered for OPTIONS, so reaching the mux would fail the very request that
// asks whether the real call is allowed.
func TestCORSAnswersPreflight(t *testing.T) {
	srv := newTestServer(t)

	req := newRequest(t, http.MethodOptions, "/api/v1/auth/login", "")
	req.Header.Set("Origin", testOrigins[0])
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	rec := serve(srv, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigins[0] {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, testOrigins[0])
	}
	for _, header := range []string{"Access-Control-Allow-Methods", "Access-Control-Allow-Headers"} {
		if rec.Header().Get(header) == "" {
			t.Errorf("%s is empty, want the preflight to say what is allowed", header)
		}
	}
}

// An origin we do not answer to still gets its response -- CORS is enforced by
// the browser, not by us. What it must not get is the header that would let the
// page read it.
func TestCORSRefusesAnUnknownOrigin(t *testing.T) {
	srv := newTestServer(t)

	req := newRequest(t, http.MethodPost, "/api/v1/user/guest", `{}`)
	req.Header.Set("Origin", "http://evil.example.com")
	rec := serve(srv, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Access-Control-Allow-Origin = %q, want it absent", got)
	}
}

// The native app sends no Origin at all, and must be untouched by any of this.
func TestCORSLeavesOriginlessRequestsAlone(t *testing.T) {
	srv := newTestServer(t)

	rec := post(t, srv, "/api/v1/user/guest", `{}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Access-Control-Allow-Origin = %q, want it absent", got)
	}
}

func TestCORSAnyOriginEchoesWhateverAsks(t *testing.T) {
	const origin = "http://192.168.1.20:8081"

	handler := cors([]string{AnyOrigin})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := newRequest(t, http.MethodGet, "/api/v1/auth/me", "")
	req.Header.Set("Origin", origin)
	rec := serve(handler, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != origin {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, origin)
	}
}

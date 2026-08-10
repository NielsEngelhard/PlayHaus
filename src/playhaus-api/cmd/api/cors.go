package main

import (
	"log/slog"
	"net/http"
	"slices"
)

// withCORS lets a browser call this API from a different origin.
//
// It exists for the Expo web build: `expo start --web` serves the app from
// localhost:8081 while the API listens on :8080, and without these headers the
// browser blocks every request before it is sent. Native iOS and Android are
// unaffected either way — the same-origin policy is a browser rule.
//
// With allowed set, only those origins are answered. With it empty — the
// development default, and something config.Validate refuses in production —
// any origin is reflected, because the dev server's port moves and LAN testing
// hits the machine's IP.
//
// Reflecting is survivable only because Access-Control-Allow-Credentials is
// deliberately absent: without it a browser will not attach the session cookie
// cross-origin, so a hostile page cannot ride a logged-in user's ambient
// credentials. The app authenticates with a bearer token it holds itself, which
// no other origin can read. Adding that header later without also pinning the
// origin list would turn this into a hole.
func withCORS(allowed []string, next http.Handler) http.Handler {
	if len(allowed) == 0 {
		slog.Warn("CORS is reflecting any origin; set ALLOWED_ORIGINS before deploying")
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// The response varies by origin whether or not this one is allowed, so
		// caches must be told before any early return.
		if origin != "" {
			w.Header().Add("Vary", "Origin")
		}

		if origin != "" && (len(allowed) == 0 || slices.Contains(allowed, origin)) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Max-Age", "600")
		}

		// Answered here rather than in the mux: ServeMux routes on method, so a
		// preflight would match no pattern and come back 405 with the headers
		// above stripped by the error path.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

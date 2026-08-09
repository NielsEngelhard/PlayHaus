package main

import "net/http"

// withCORS lets a browser call this API from a different origin.
//
// It exists for the Expo web build: `expo start --web` serves the app from
// localhost:8081 while the API listens on :8080, and without these headers the
// browser blocks every request before it is sent. Native iOS and Android are
// unaffected either way — the same-origin policy is a browser rule.
//
// The allowed origin is reflected rather than pinned to a list, because the dev
// server's port moves and LAN testing hits the machine's IP. That is safe here
// only because Access-Control-Allow-Credentials is deliberately absent: without
// it a browser will not attach the session cookie cross-origin, so a hostile
// page cannot ride a logged-in user's ambient credentials. The app authenticates
// with a bearer token it holds itself, which no other origin can read.
//
// Pin this to the real web origin before this runs anywhere public.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			// The response body differs per origin, so caches must not share it.
			w.Header().Add("Vary", "Origin")
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

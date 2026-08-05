package auth

import "net/http"

// RequireUser rejects unauthenticated requests. Other domains wrap the
// routes that need a logged-in user:
//
//	mux.Handle("/games/", auth.RequireUser(gamesHandler))
//
// Not implemented yet -- it currently passes every request through.
func RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

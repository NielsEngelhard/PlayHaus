package auth

import "net/http"

// RequireUser rejects unauthenticated requests. Other domains wrap the
// routes that need a logged-in user:
//
//	mux.Handle("/games/", auth.RequireUser(gamesHandler))
//
// Not implemented yet -- it currently passes every request through without
// an identity, so handlers downstream answer 401. Once login exists this is
// where the token is verified and the request continues with:
//
//	next.ServeHTTP(w, r.WithContext(WithUserID(r.Context(), id)))
func RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

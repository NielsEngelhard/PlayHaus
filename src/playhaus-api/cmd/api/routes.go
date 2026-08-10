package main

import (
	"net/http"

	"playhausapi/internal/auth"
	"playhausapi/internal/leagueofletters"
	"playhausapi/internal/user"
)

// routes is the whole public surface of the API in one readable list, so that
// "what is reachable, and what does it require" is answered by reading a screen
// rather than by grepping for handlers.
func routes(a *auth.Handler, u *user.Handler, l *leagueofletters.Handler) http.Handler {
	mux := http.NewServeMux()

	// Public: these are how a caller gets a session in the first place.
	mux.HandleFunc("POST /api/v1/login", a.Login)
	mux.HandleFunc("POST /api/v1/guest", a.Guest)
	mux.HandleFunc("POST /api/v1/logout", a.Logout)
	mux.HandleFunc("POST /api/v1/user", u.CreateUser)

	// Authenticated. GET /me is read here and written by the user handler
	// beside it: same resource, two owners.
	mux.HandleFunc("GET /api/v1/me", a.RequireAuth(a.Me))
	mux.HandleFunc("PUT /api/v1/me", a.RequireAuth(u.UpdateProfile))
	mux.HandleFunc("GET /api/v1/users", a.RequireAuth(u.ListUsers))

	mux.HandleFunc("POST /api/v1/league-of-letters/games", a.RequireAuth(l.CreateGame))
	mux.HandleFunc("GET /api/v1/league-of-letters/games/{id}", a.RequireAuth(l.GetGame))
	mux.HandleFunc("POST /api/v1/league-of-letters/games/{id}/guesses", a.RequireAuth(l.CreateGuess))

	return mux
}

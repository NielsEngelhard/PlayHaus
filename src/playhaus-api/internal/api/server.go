package api

import (
	"log/slog"
	"net/http"
	"playhaus-api/internal/user"
)

type Server struct {
	mux   *http.ServeMux
	users *user.Service
	log   *slog.Logger
}

func NewServer(users *user.Service, log *slog.Logger) http.Handler {
	s := &Server{mux: http.NewServeMux(), users: users, log: log}

	// User endpoints
	s.mux.HandleFunc("POST /v1/user", s.handleCreateUser)
	s.mux.HandleFunc("POST /v1/user/guest", s.handleCreateGuestUser)

	// League of letters endpoints

	// requestID goes first so the id is in the context for the two below it.
	return chain(s.mux, requestID, recoverPanic(log), logRequests(log))
}

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
	s.mux.HandleFunc("POST /v1/users", s.handleCreateUser)
	return chain(s.mux, recoverPanic(log), requestID, logRequests(log))
}

package api

import (
	"log/slog"
	"net/http"
	league_of_letters "playhaus-api/internal/league-of-letters"
	"playhaus-api/internal/user"
)

type Server struct {
	mux             *http.ServeMux
	users           *user.Service
	leagueOfLetters *league_of_letters.Service
	log             *slog.Logger
}

func NewServer(users *user.Service, log *slog.Logger) http.Handler {
	s := &Server{mux: http.NewServeMux(), users: users, log: log}

	s.AddUserHandlers()
	s.AddLeagueOfLettersHandlers()

	return chain(s.mux, requestID, recoverPanic(log), logRequests(log))
}

func (s *Server) AddLeagueOfLettersHandlers() {
	// General

	// Solo specific
	s.mux.HandleFunc("POST /api/v1/league-of-letters/solo", s.handleCreateSoloGame)
	s.mux.HandleFunc("GET /api/v1/league-of-letters/solo/{gameID}", s.handleGetSoloGame)

	// Multiplayer specific
	s.mux.HandleFunc("POST /api/v1/league-of-letters/create-multiplayer-lobby", s.handleCreateMultiplayerLobby)
	s.mux.HandleFunc("POST /api/v1/league-of-letters/join-multiplayer-lobby", s.handleJoinMultiplayerLobby)
}

func (s *Server) AddUserHandlers() {
	s.mux.HandleFunc("POST /api/v1/user", s.handleCreateUser)
	s.mux.HandleFunc("POST /api/v1/user/guest", s.handleCreateGuestUser)
}

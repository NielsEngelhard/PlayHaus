package api

import (
	"log/slog"
	"net/http"

	"playhaus-api/internal/auth"
	league_of_letters "playhaus-api/internal/league-of-letters"
	"playhaus-api/internal/user"
)

type Server struct {
	mux             *http.ServeMux
	users           *user.Service
	auth            *auth.Service
	leagueOfLetters *league_of_letters.Service
	log             *slog.Logger
}

func NewServer(
	users *user.Service,
	authSvc *auth.Service,
	leagueOfLetters *league_of_letters.Service,
	log *slog.Logger,
	allowedOrigins []string,
) http.Handler {
	s := &Server{
		mux:             http.NewServeMux(),
		users:           users,
		auth:            authSvc,
		leagueOfLetters: leagueOfLetters,
		log:             log,
	}

	s.AddAuthHandlers()
	s.AddUserHandlers()
	s.AddLeagueOfLettersHandlers()

	// cors sits innermost so a preflight -- which it answers itself, without
	// reaching the mux -- still gets a request id and still shows up in the log.
	return chain(s.mux, requestID, recoverPanic(log), logRequests(log), cors(allowedOrigins))
}

// AddAuthHandlers registers the routes that hand out or revoke a session.
// These are the only ones a caller can reach without a token.
func (s *Server) AddAuthHandlers() {
	s.mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)
	s.mux.HandleFunc("POST /api/v1/auth/logout", s.handleLogout)
	s.mux.HandleFunc("GET /api/v1/auth/me", s.requireAuth(s.handleMe))
}

func (s *Server) AddLeagueOfLettersHandlers() {
	// Solo specific
	s.mux.HandleFunc("POST /api/v1/league-of-letters/solo", s.requireAuth(s.handleCreateSoloGame))
	s.mux.HandleFunc("GET /api/v1/league-of-letters/solo/{gameID}", s.requireAuth(s.handleGetSoloGame))

	// Multiplayer specific
	s.mux.HandleFunc("POST /api/v1/league-of-letters/create-multiplayer-lobby", s.requireAuth(s.handleCreateMultiplayerLobby))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/join-multiplayer-lobby", s.requireAuth(s.handleJoinMultiplayerLobby))
}

func (s *Server) AddUserHandlers() {
	s.mux.HandleFunc("POST /api/v1/user", s.handleCreateUser)
	s.mux.HandleFunc("POST /api/v1/user/guest", s.handleCreateGuestUser)
	s.mux.HandleFunc("PUT /api/v1/user/username", s.requireAuth(s.handleUpdateUserUsername))
	s.mux.HandleFunc("PUT /api/v1/user/color", s.requireAuth(s.handleUpdateUserColor))
	s.mux.HandleFunc("PUT /api/v1/user/enable-sounds", s.requireAuth(s.handleUpdateUserEnableSounds))
	s.mux.HandleFunc("PUT /api/v1/user/enable-music", s.requireAuth(s.handleUpdateUserEnableMusic))
	s.mux.HandleFunc("PUT /api/v1/user/enable-vibration", s.requireAuth(s.handleUpdateUserEnableVibration))
}

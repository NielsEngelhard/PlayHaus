package api

import (
	"log/slog"
	"net/http"
	"slices"

	"playhaus-api/internal/auth"
	league_of_letters "playhaus-api/internal/league-of-letters"
	"playhaus-api/internal/realtime"
	"playhaus-api/internal/user"
)

type Server struct {
	mux             *http.ServeMux
	users           *user.Service
	auth            *auth.Service
	leagueOfLetters *league_of_letters.Service
	// rt is every live socket room. Handlers publish into it after a write; they
	// never read game state out of it.
	rt  *realtime.Hub
	log *slog.Logger

	// Kept for the socket handshake, which has to answer the same origin question
	// CORS does but cannot go through the CORS middleware to do it.
	allowedOrigins   []string
	anyOriginAllowed bool
}

func NewServer(
	users *user.Service,
	authSvc *auth.Service,
	leagueOfLetters *league_of_letters.Service,
	hub *realtime.Hub,
	log *slog.Logger,
	allowedOrigins []string,
) http.Handler {
	s := &Server{
		mux:              http.NewServeMux(),
		users:            users,
		auth:             authSvc,
		leagueOfLetters:  leagueOfLetters,
		rt:               hub,
		log:              log,
		allowedOrigins:   allowedOrigins,
		anyOriginAllowed: slices.Contains(allowedOrigins, AnyOrigin),
	}

	// The socket layer knows nothing about any game; this is where League of
	// Letters claims its namespace. PubquizR registers its own here later.
	hub.Register(lolNamespace, lolRealtime{server: s})

	s.AddAuthHandlers()
	s.AddUserHandlers()
	s.AddLeagueOfLettersHandlers()
	s.AddReconnectHandlers()
	s.AddRealtimeHandlers()

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
	s.mux.HandleFunc("GET /api/v1/league-of-letters/solo/current", s.requireAuth(s.handleGetCurrentSoloGame))
	s.mux.HandleFunc("GET /api/v1/league-of-letters/solo/{gameID}", s.requireAuth(s.handleGetSoloGame))
	s.mux.HandleFunc("DELETE /api/v1/league-of-letters/solo/{gameID}", s.requireAuth(s.handleDeleteSoloGame))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/solo/{gameID}/guesses", s.requireAuth(s.handleSubmitGuess))

	// The room a multiplayer game is set up in. Keyed by the join code throughout
	// -- there is nothing else anybody ever looks a lobby up by.
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby", s.requireAuth(s.handleCreateLobby))
	s.mux.HandleFunc("GET /api/v1/league-of-letters/lobby/{code}", s.requireAuth(s.handleGetLobby))
	s.mux.HandleFunc("PATCH /api/v1/league-of-letters/lobby/{code}", s.requireAuth(s.handleUpdateLobbySettings))
	s.mux.HandleFunc("DELETE /api/v1/league-of-letters/lobby/{code}", s.requireAuth(s.handleDeleteLobby))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby/{code}/players", s.requireAuth(s.handleJoinLobby))
	s.mux.HandleFunc("DELETE /api/v1/league-of-letters/lobby/{code}/players/me", s.requireAuth(s.handleLeaveLobby))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby/{code}/start", s.requireAuth(s.handleStartLobby))

	// The game the room became.
	s.mux.HandleFunc("GET /api/v1/league-of-letters/multiplayer/{gameID}", s.requireAuth(s.handleGetMultiplayerGame))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/multiplayer/{gameID}/guesses", s.requireAuth(s.handleSubmitMultiplayerGuess))
}

// AddRealtimeHandlers registers the one socket route every game shares. It is not
// wrapped in requireAuth: a browser cannot put a header on a WebSocket, so the
// handler authenticates the query string itself.
func (s *Server) AddRealtimeHandlers() {
	s.mux.HandleFunc("GET /api/v1/ws", s.handleWebSocket)
}

func (s *Server) AddUserHandlers() {
	s.mux.HandleFunc("POST /api/v1/user", s.handleCreateUser)
	s.mux.HandleFunc("POST /api/v1/user/guest", s.handleCreateGuestUser)
	s.mux.HandleFunc("PUT /api/v1/user/username", s.requireAuth(s.handleUpdateUserUsername))
	s.mux.HandleFunc("PUT /api/v1/user/color", s.requireAuth(s.handleUpdateUserColor))
	s.mux.HandleFunc("PUT /api/v1/user/locale", s.requireAuth(s.handleUpdateUserLocale))
	s.mux.HandleFunc("PUT /api/v1/user/enable-sounds", s.requireAuth(s.handleUpdateUserEnableSounds))
	s.mux.HandleFunc("PUT /api/v1/user/enable-music", s.requireAuth(s.handleUpdateUserEnableMusic))
	s.mux.HandleFunc("PUT /api/v1/user/enable-vibration", s.requireAuth(s.handleUpdateUserEnableVibration))
}

func (s *Server) AddReconnectHandlers() {
	s.mux.HandleFunc("GET /api/v1/reconnect-games", s.requireAuth(s.handleGetReconnectableGames))
}

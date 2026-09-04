package api

import (
	"log/slog"
	"net/http"
	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/oneofus"
	"slices"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/joincode"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/realtime"
	"playhaus-api/internal/user"
)

type Server struct {
	mux             *http.ServeMux
	users           *user.Service
	auth            *auth.Service
	leagueOfLetters *lol.Service
	pubquizr        *pubquizr.Service
	oneOfUs         *oneofus.Service
	fakeFiller      *fakefiller.Service

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
	leagueOfLetters *lol.Service,
	pubquizrSvc *pubquizr.Service,
	oneOfUsSvc *oneofus.Service,
	hub *realtime.Hub,
	log *slog.Logger,
	allowedOrigins []string,
) http.Handler {
	s := &Server{
		mux:              http.NewServeMux(),
		users:            users,
		auth:             authSvc,
		leagueOfLetters:  leagueOfLetters,
		pubquizr:         pubquizrSvc,
		oneOfUs:          oneOfUsSvc,
		rt:               hub,
		log:              log,
		allowedOrigins:   allowedOrigins,
		anyOriginAllowed: slices.Contains(allowedOrigins, AnyOrigin),
	}

	// The socket layer knows nothing about any game; this is where League of
	// Letters claims its namespace. PubquizR claims one when it learns to play
	// across several phones -- a table sharing one device has nobody to notify.
	hub.Register(joincode.LeagueOfLetters.Namespace(), lolRealtime{server: s})

	s.AddHealthHandlers()
	s.AddAuthHandlers()
	s.AddUserHandlers()
	s.AddLeagueOfLettersHandlers()
	s.AddPubquizRHandlers()
	s.AddOneOfUsHandlers()
	s.AddReconnectHandlers()
	s.AddRealtimeHandlers()

	// cors sits innermost so a preflight -- which it answers itself, without
	// reaching the mux -- still gets a request id and still shows up in the log.
	return chain(s.mux, requestID, recoverPanic(log), logRequests(log), cors(allowedOrigins))
}

// AddHealthHandlers registers the one route that asks for nothing at all -- no
// token, no join code, no body. The deploy pipeline and any uptime monitor need a
// cheap 200 to point at, and every other route in this file would answer them with
// a 401.
func (s *Server) AddHealthHandlers() {
	s.mux.HandleFunc("GET /api/v1/health", s.handleHealth)
}

// AddAuthHandlers registers the routes that hand out or revoke a session.
// Apart from the health route above, these are the only ones a caller can reach
// without a token -- necessarily, since they are how a caller gets one.
func (s *Server) AddAuthHandlers() {
	s.mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)
	s.mux.HandleFunc("POST /api/v1/auth/logout", s.handleLogout)
	s.mux.HandleFunc("GET /api/v1/auth/me", s.requireAuth(s.handleMe))
}

func (s *Server) AddLeagueOfLettersHandlers() {
	// Solo
	s.mux.HandleFunc("POST /api/v1/league-of-letters/solo", s.requireAuth(s.handleCreateSoloGame))
	s.mux.HandleFunc("GET /api/v1/league-of-letters/solo/current", s.requireAuth(s.handleGetCurrentSoloGame))
	s.mux.HandleFunc("GET /api/v1/league-of-letters/solo/{gameID}", s.requireAuth(s.handleGetSoloGame))
	s.mux.HandleFunc("DELETE /api/v1/league-of-letters/solo/{gameID}", s.requireAuth(s.handleDeleteSoloGame))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/solo/{gameID}/guesses", s.requireAuth(s.handleSubmitGuess))

	// Multiplayer
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby", s.requireAuth(s.handleCreateLobby))
	// Before {code}, so the literal wins: this is the room you are already in, not a
	// room called "current".
	s.mux.HandleFunc("GET /api/v1/league-of-letters/lobby/current", s.requireAuth(s.handleGetCurrentLobby))

	// room is what every route addressed by a join code is wrapped in: signed in, and
	// carrying a code that is a League of Letters code rather than merely five
	// characters. Named because it is the same two wrappers eight times, and eight
	// nested pairs is a place for one of them to go missing unnoticed.
	room := func(next http.HandlerFunc) http.HandlerFunc {
		return s.requireAuth(s.requireGameCode(joincode.LeagueOfLetters, next))
	}

	s.mux.HandleFunc("GET /api/v1/league-of-letters/lobby/{code}", room(s.handleGetLobby))
	// PATCH rather than PUT: the settings card sends the knobs it has, and a room
	// carries more than the two of them.
	s.mux.HandleFunc("PATCH /api/v1/league-of-letters/lobby/{code}", room(s.handleUpdateLobbySettings))
	s.mux.HandleFunc("DELETE /api/v1/league-of-letters/lobby/{code}", room(s.handleDeleteLobby))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby/{code}/players", room(s.handleJoinLobby))
	s.mux.HandleFunc("DELETE /api/v1/league-of-letters/lobby/{code}/players/me", room(s.handleLeaveLobby))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby/{code}/start", room(s.handleStartLobby))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby/{code}/rematch", room(s.handleRematchLobby))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/lobby/{code}/abandon", room(s.handleAbandonLobby))
	s.mux.HandleFunc("GET /api/v1/league-of-letters/multiplayer/{gameID}", s.requireAuth(s.handleGetMultiplayerGame))
	s.mux.HandleFunc("POST /api/v1/league-of-letters/multiplayer/{gameID}/guesses", s.requireAuth(s.handleSubmitMultiplayerGuess))
}

func (s *Server) AddPubquizRHandlers() {
	// Quizzes
	s.mux.HandleFunc("GET /api/v1/pubquizr/quizzes", s.requireAuth(s.handleListQuizzes))
	s.mux.HandleFunc("GET /api/v1/pubquizr/quizzes/{quizID}", s.requireAuth(s.handleGetQuiz))

	// Single device -- one phone passed round the table
	s.mux.HandleFunc("POST /api/v1/pubquizr/single-device", s.requireAuth(s.handleStartSingleDeviceQuiz))
	// Before {sessionID}, so the literal wins: this is the game you left running, not
	// a session called "current".
	s.mux.HandleFunc("GET /api/v1/pubquizr/single-device/current", s.requireAuth(s.handleGetCurrentSingleDeviceSession))
	s.mux.HandleFunc("GET /api/v1/pubquizr/single-device/{sessionID}", s.requireAuth(s.handleGetSingleDeviceSession))
	s.mux.HandleFunc("DELETE /api/v1/pubquizr/single-device/{sessionID}", s.requireAuth(s.handleDeleteSingleDeviceSession))
	// One endpoint for rounds 1 and 2: the body never named the round, and the two are
	// the same game with different sums.
	s.mux.HandleFunc("POST /api/v1/pubquizr/single-device/{sessionID}/verdict", s.requireAuth(s.handleHotSeatVerdict))
	// A round that settles in one piece gets an endpoint of its own, because what it
	// has to be told is nothing like a verdict.
	s.mux.HandleFunc("POST /api/v1/pubquizr/single-device/{sessionID}/closest", s.requireAuth(s.handleClosestGuesses))
	s.mux.HandleFunc("POST /api/v1/pubquizr/single-device/{sessionID}/describe", s.requireAuth(s.handleDescribeAwards))
	s.mux.HandleFunc("POST /api/v1/pubquizr/single-device/{sessionID}/list", s.requireAuth(s.handleListAwards))
	// The finale is not one of the hot seat rounds' rounds -- see the note on
	// RecordFinaleVerdict -- so it gets an endpoint of its own rather than sharing
	// /verdict with rounds 1 and 2.
	s.mux.HandleFunc("POST /api/v1/pubquizr/single-device/{sessionID}/finale", s.requireAuth(s.handleFinaleVerdict))
}

func (s *Server) AddOneOfUsHandlers() {
	// Single device game
	s.mux.HandleFunc("POST /api/v1/one-of-us/single-device", s.requireAuth(s.handleCreateOneOfUsOneDeviceGame))
	s.mux.HandleFunc("GET /api/v1/one-of-us/single-device/{gameID}", s.requireAuth(s.handleGetSingleDeviceOneOfUsGame))
	s.mux.HandleFunc("POST /api/v1/one-of-us/single-device/{gameID}/vote/{playerID}", s.requireAuth(s.handleVotePlayerOutOfSingleDeviceOneOfUsGame))

	// Multi device game
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
	s.mux.HandleFunc("POST /api/v1/user/upgrade", s.requireAuth(s.handleUpgradeGuestUser))
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

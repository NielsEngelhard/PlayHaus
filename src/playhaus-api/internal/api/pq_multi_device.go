package api

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"strings"

	"github.com/google/uuid"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/user"
)

// PubquizR on more than one device: one shared screen everybody looks at, and a phone per player. The screen holds no seat.

// pqNewLobbyRequest is what opens a room.
type pqNewLobbyRequest struct {
	Locale *string `json:"locale"`
}

func (pqNewLobbyRequest) Validate() map[string]string { return nil }

// pqLobbySetupRequest is what the host gets to decide before the deal.
type pqLobbySetupRequest struct {
	QuizID     *string `json:"quizId"`
	Locale     *string `json:"locale"`
	ZenMode    *bool   `json:"zenMode"`
	TriviaMode *bool   `json:"triviaMode"`
}

func (req pqLobbySetupRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.QuizID != nil && *req.QuizID != "" {
		if _, err := uuid.Parse(*req.QuizID); err != nil {
			problems["quizId"] = "is not a valid id"
		}
	}
	return problems
}

// pqJoinLobbyRequest lets a phone say what it wants to be called, and falls back to the account name.
type pqJoinLobbyRequest struct {
	Name *string `json:"name"`
}

func (pqJoinLobbyRequest) Validate() map[string]string { return nil }

// pqLobbyPlayerResponse is one phone in the room. avatarColorId is seat-derived rather than the account's: two accounts can share a swatch, a scoreboard cannot.
type pqLobbyPlayerResponse struct {
	UserID        string `json:"userId"`
	Seat          int    `json:"seat"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	JoinedAt      string `json:"joinedAt"`
}

type pqLobbySetupResponse struct {
	QuizID     string `json:"quizId,omitempty"`
	Locale     string `json:"locale"`
	ZenMode    bool   `json:"zenMode"`
	TriviaMode bool   `json:"triviaMode"`
}

type pqLobbyResponse struct {
	ID string `json:"id"`
	// Code is what players type in to get here, and is the same string as ID.
	Code string `json:"code"`
	// HostID is whose room it is. The app hides the controls; the server enforces it.
	HostID     string                  `json:"hostId"`
	Status     string                  `json:"status"`
	Setup      pqLobbySetupResponse    `json:"setup"`
	Players    []pqLobbyPlayerResponse `json:"players"`
	MinPlayers int                     `json:"minPlayers"`
	MaxPlayers int                     `json:"maxPlayers"`
	CreatedAt  string                  `json:"createdAt"`
	// SessionID is the evening to open, set only once the host has started the room.
	SessionID string `json:"sessionId,omitempty"`
}

func newPQLobbyResponse(lobby *pubquizr.PQLobby) pqLobbyResponse {
	// By seat, which is the order people walked in -- so the host is the top row.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b pubquizr.PQLobbyPlayer) int { return a.Seat - b.Seat })

	players := make([]pqLobbyPlayerResponse, 0, len(seated))
	for _, player := range seated {
		players = append(players, pqLobbyPlayerResponse{
			UserID: player.UserID,
			Seat:   player.Seat,
			Name:   player.Name,
			// The palette repeats past six, which only happens at a table of seven or eight.
			AvatarColorID: user.Colors[player.Seat%len(user.Colors)],
			JoinedAt:      player.JoinedAt.Format(timeFormat),
		})
	}

	body := pqLobbyResponse{
		ID:     lobby.ID,
		Code:   lobby.ID,
		HostID: lobby.OwnerID,
		Status: string(lobby.Status),
		Setup: pqLobbySetupResponse{
			Locale:     lobby.Locale.String(),
			ZenMode:    lobby.ZenMode,
			TriviaMode: lobby.TriviaMode,
		},
		Players: players,
		// Carried rather than hardcoded in the app.
		MinPlayers: pubquizr.MinPlayers,
		MaxPlayers: pubquizr.MaxPlayers,
		CreatedAt:  lobby.CreatedAt.Format(timeFormat),
	}
	if lobby.QuizID != nil {
		body.Setup.QuizID = lobby.QuizID.String()
	}
	if lobby.SessionID != nil {
		body.SessionID = lobby.SessionID.String()
	}

	return body
}

func (s *Server) AddPubquizRMultiDeviceHandlers() {
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/lobby", s.requireAuth(s.handleCreatePQLobby))
	// Before {code}, so the literal wins: this is the room you already opened, not a room called "current".
	s.mux.HandleFunc("GET /api/v1/pubquizr/multi-device/lobby/current", s.requireAuth(s.handleGetCurrentPQLobby))

	// room is what every route addressed by a join code is wrapped in.
	room := func(next http.HandlerFunc) http.HandlerFunc {
		return s.requireAuth(s.requireGameCode(joincode.PubquizR, next))
	}

	s.mux.HandleFunc("GET /api/v1/pubquizr/multi-device/lobby/{code}", room(s.handleGetPQLobby))
	s.mux.HandleFunc("PATCH /api/v1/pubquizr/multi-device/lobby/{code}", room(s.handleUpdatePQLobbySetup))
	s.mux.HandleFunc("DELETE /api/v1/pubquizr/multi-device/lobby/{code}", room(s.handleClosePQLobby))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/lobby/{code}/players", room(s.handleJoinPQLobby))
	s.mux.HandleFunc("DELETE /api/v1/pubquizr/multi-device/lobby/{code}/players/me", room(s.handleLeavePQLobby))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/lobby/{code}/start", room(s.handleStartPQLobby))

	// The evening the room dealt, addressed by the code rather than by its own id, so a phone needs to remember one string.
	s.mux.HandleFunc("GET /api/v1/pubquizr/multi-device/{code}", room(s.handlePQSession))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/verdict", room(s.handlePQHotSeatVerdict))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/closest/guess", room(s.handlePQClosestGuess))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/closest", room(s.handlePQClosestGuesses))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/describe", room(s.handlePQDescribeAwards))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/list", room(s.handlePQListAwards))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/double-down/choice", room(s.handlePQDoubleDownChoice))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/double-down", room(s.handlePQDoubleDownVerdict))
	s.mux.HandleFunc("POST /api/v1/pubquizr/multi-device/{code}/finale", room(s.handlePQFinaleVerdict))
}

func (s *Server) handleCreatePQLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreatePQLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, _, err := decode[pqNewLobbyRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	lobby, err := s.pubquizr.CreateLobby(r.Context(), userID, s.accountName(r, userID), localeFrom(Deref(req.Locale, ""), r))
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	// Nothing is published: the room is one request old and there is nobody connected to it yet to tell.
	writeJSON(w, http.StatusCreated, newPQLobbyResponse(lobby))
}

// handleGetPQLobby is the snapshot the room screen opens on, and the shared screen's too.
func (s *Server) handleGetPQLobby(w http.ResponseWriter, r *http.Request) {
	lobby, err := s.pubquizr.Lobby(r.Context(), lobbyCode(r))
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, newPQLobbyResponse(lobby))
}

// handleGetCurrentPQLobby is what the app asks on launch.
func (s *Server) handleGetCurrentPQLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetCurrentPQLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	lobby, err := s.pubquizr.CurrentLobby(r.Context(), userID)
	if errors.Is(err, pubquizr.ErrLobbyNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, newPQLobbyResponse(lobby))
}

func (s *Server) handleJoinPQLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleJoinPQLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, _, err := decode[pqJoinLobbyRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	code := lobbyCode(r)

	lobby, err := s.pubquizr.JoinLobby(r.Context(), code, userID, Deref(req.Name, s.accountName(r, userID)))
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.linkLobbyFriends(r.Context(), userID, lobbyRoster(lobby.Players, func(p pubquizr.PQLobbyPlayer) string { return p.UserID }))

	body := newPQLobbyResponse(lobby)
	s.publishPQLobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

func (s *Server) handleUpdatePQLobbySetup(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleUpdatePQLobbySetup reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, invalid, err := decode[pqLobbySetupRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(invalid) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": invalid})
		return
	}

	code := lobbyCode(r)

	// The room has to be read before a field the host left out can default to what it is already set to.
	current, err := s.pubquizr.Lobby(r.Context(), code)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	setup := pubquizr.LobbySetup{
		QuizID:     current.QuizID,
		Locale:     localeFrom(Deref(req.Locale, current.Locale.String()), r),
		ZenMode:    Deref(req.ZenMode, current.ZenMode),
		TriviaMode: Deref(req.TriviaMode, current.TriviaMode),
	}
	if req.QuizID != nil {
		// An explicit empty string is how the host puts the quiz back.
		if *req.QuizID == "" {
			setup.QuizID = nil
		} else {
			// Validate has already proved this parses.
			picked, _ := uuid.Parse(*req.QuizID)
			setup.QuizID = &picked
		}
	}

	lobby, problems, err := s.pubquizr.UpdateLobbySetup(r.Context(), code, userID, setup)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	body := newPQLobbyResponse(lobby)
	s.publishPQLobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

// handleLeavePQLobby gives a seat back without closing the room.
func (s *Server) handleLeavePQLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleLeavePQLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.pubquizr.LeaveLobby(r.Context(), code, userID); err != nil {
		s.writePubquizRError(w, err)
		return
	}

	// The room as it stands without them.
	if lobby, err := s.pubquizr.Lobby(r.Context(), code); err == nil {
		s.publishPQLobby(code, newPQLobbyResponse(lobby))
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleClosePQLobby closes a room for good, and the evening it dealt with it. Host only.
func (s *Server) handleClosePQLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleClosePQLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.pubquizr.CloseLobby(r.Context(), code, userID); err != nil {
		s.writePubquizRError(w, err)
		return
	}

	// Told rather than left to be discovered.
	s.publishPQLobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

// handleStartPQLobby deals the evening the room gathered for.
func (s *Server) handleStartPQLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleStartPQLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	session, problems, err := s.pubquizr.StartMultiDeviceSession(r.Context(), code, userID)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	// Re-read so the response carries the session id the deal just set on the room.
	lobby, err := s.pubquizr.Lobby(r.Context(), code)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	body := newPQLobbyResponse(lobby)
	s.publishPQSessionStarted(code, session.ID.String(), body)

	writeJSON(w, http.StatusOK, body)
}

// --- play -----------------------------------------------------------------

// pqTable is the evening a code is playing and whose phone is asking about it, and is where every route below starts. It has already answered when false.
func (s *Server) pqTable(w http.ResponseWriter, r *http.Request) (uuid.UUID, string, bool) {
	actorID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("a multi device play route was reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return uuid.Nil, "", false
	}

	lobby, err := s.pubquizr.Lobby(r.Context(), lobbyCode(r))
	if err != nil {
		s.writePubquizRError(w, err)
		return uuid.Nil, "", false
	}
	// A room that has not dealt yet has no evening to talk about, which is the same answer as a session nobody can find.
	if lobby.SessionID == nil {
		writeError(w, http.StatusNotFound, "session not found")
		return uuid.Nil, "", false
	}

	return *lobby.SessionID, actorID, true
}

// pqSessionBody is one evening drawn for the wire, and is the same body every settle answers with.
func (s *Server) pqSessionBody(ctx context.Context, id uuid.UUID) (quizSessionResponse, error) {
	session, err := s.pubquizr.Session(ctx, id)
	if err != nil {
		return quizSessionResponse{}, err
	}

	answering, err := s.pubquizr.AnsweringSeatFor(ctx, session)
	if err != nil {
		return quizSessionResponse{}, err
	}

	return newQuizSessionResponse(session, answering), nil
}

// settlePQTurn answers the phone that settled and tells the room the same thing, so nobody at the table sees a different evening.
func (s *Server) settlePQTurn(w http.ResponseWriter, r *http.Request, session *pubquizr.Session) {
	answering, err := s.pubquizr.AnsweringSeatFor(r.Context(), session)
	if err != nil {
		s.log.Error("answering seat", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	body := newQuizSessionResponse(session, answering)
	s.publishPQSession(lobbyCode(r), body)

	writeJSON(w, http.StatusOK, body)
}

// handlePQSession is what every device opens on, and what it refetches after a socket it lost.
func (s *Server) handlePQSession(w http.ResponseWriter, r *http.Request) {
	sessionID, _, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	body, err := s.pqSessionBody(r.Context(), sessionID)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, body)
}

// handlePQHotSeatVerdict settles a whole round 1 or round 2 question. Round 1 is posted by the quizmaster's phone and round 2 by the phone that ended the walk.
func (s *Server) handlePQHotSeatVerdict(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	in, parsed := s.pqTurnInput(w, r)
	if !parsed {
		return
	}
	in.SessionID = sessionID
	in.ActorID = actorID

	session, err := s.pubquizr.RecordHotSeatTurn(r.Context(), in)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.settlePQTurn(w, r, session)
}

// pqClosestGuessRequest is one phone's number in round 3.
type pqClosestGuessRequest struct {
	SessionQuestionID string  `json:"sessionQuestionId"`
	Value             float64 `json:"value"`
}

func (req pqClosestGuessRequest) Validate() map[string]string {
	if strings.TrimSpace(req.SessionQuestionID) == "" {
		return map[string]string{"sessionQuestionId": "is required"}
	}

	return nil
}

// pqClosestSettleRequest closes one round 3 question. The numbers are the ones the phones sent, and guesses is the quizmaster typing in for a phone that could not.
type pqClosestSettleRequest struct {
	SessionQuestionID string             `json:"sessionQuestionId"`
	Guesses           []seatGuessRequest `json:"guesses,omitempty"`
}

func (req pqClosestSettleRequest) Validate() map[string]string {
	if strings.TrimSpace(req.SessionQuestionID) == "" {
		return map[string]string{"sessionQuestionId": "is required"}
	}

	return nil
}

// handlePQClosestGuess keeps one phone's number. Everybody round 3 lets guess, and nobody else.
func (s *Server) handlePQClosestGuess(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	req, problems, err := decode[pqClosestGuessRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	questionID, err := uuid.Parse(req.SessionQuestionID)
	if err != nil {
		// An unparseable id cannot name the current question, which is the same answer as naming one the table has moved past.
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	session, seatsIn, err := s.pubquizr.SaveClosestGuess(r.Context(), pubquizr.ClosestGuessInput{
		SessionID:         sessionID,
		ActorID:           actorID,
		SessionQuestionID: questionID,
		Value:             req.Value,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	body := pqClosestProgressPayload{
		SessionQuestionID: questionID.String(),
		SeatsIn:           seatsIn,
		GuessesIn:         len(seatsIn),
		GuessesWanted:     len(session.GuessingSeats()),
	}
	s.publishPQClosestProgress(lobbyCode(r), body)

	writeJSON(w, http.StatusOK, body)
}

// handlePQClosestGuesses closes one round 3 question. The quizmaster's phone only.
func (s *Server) handlePQClosestGuesses(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	req, problems, err := decode[pqClosestSettleRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	questionID, err := uuid.Parse(req.SessionQuestionID)
	if err != nil {
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	// Whatever was typed in by hand rides along and wins its seat, so one dead phone cannot hold the question open.
	byHand := make([]pubquizr.SeatGuess, 0, len(req.Guesses))
	for _, guess := range req.Guesses {
		byHand = append(byHand, pubquizr.SeatGuess{Seat: guess.Seat, Value: guess.Value})
	}

	session, settled, err := s.pubquizr.RecordClosestGuesses(r.Context(), pubquizr.ClosestInput{
		SessionID:         sessionID,
		ActorID:           actorID,
		SessionQuestionID: questionID,
		Guesses:           byHand,
		Staged:            true,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	// The result first, so a screen paints the numbers and then the table they left behind rather than the other way round.
	s.publishPQClosestReveal(lobbyCode(r), pqClosestReveal(settled))
	s.settlePQTurn(w, r, session)
}

// pqClosestReveal draws round 3's result for the wire.
func pqClosestReveal(settled *pubquizr.ClosestSettled) pqClosestRevealPayload {
	body := pqClosestRevealPayload{
		SessionQuestionID: settled.SessionQuestionID.String(),
		Guesses:           make([]pqSeatGuess, 0, len(settled.Guesses)),
		WinningSeats:      settled.WinningSeats,
	}

	for _, guess := range settled.Guesses {
		body.Guesses = append(body.Guesses, pqSeatGuess{Seat: guess.Seat, Value: guess.Value})
	}
	// Never null on the wire: the screen reads a length, and nobody being nearest is a real result.
	if body.WinningSeats == nil {
		body.WinningSeats = []int{}
	}

	return body
}

// handlePQDescribeAwards settles one round 4 turn, posted by the describer's own phone -- the words are their secret, so nobody else can have ticked them.
func (s *Server) handlePQDescribeAwards(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	in, parsed := s.pqDescribeInput(w, r)
	if !parsed {
		return
	}
	in.SessionID = sessionID
	in.ActorID = actorID

	session, err := s.pubquizr.RecordDescribeAwards(r.Context(), in)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.settlePQTurn(w, r, session)
}

// handlePQListAwards settles one round 5 question. The quizmaster's phone only.
func (s *Server) handlePQListAwards(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	in, parsed := s.pqListInput(w, r)
	if !parsed {
		return
	}
	in.SessionID = sessionID
	in.ActorID = actorID

	session, err := s.pubquizr.RecordListAward(r.Context(), in)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.settlePQTurn(w, r, session)
}

// pqDoubleDownChoiceRequest is one player asking for the easy or the hard question in front of them.
type pqDoubleDownChoiceRequest struct {
	SessionQuestionID string `json:"sessionQuestionId"`
}

func (req pqDoubleDownChoiceRequest) Validate() map[string]string {
	if strings.TrimSpace(req.SessionQuestionID) == "" {
		return map[string]string{"sessionQuestionId": "is required"}
	}

	return nil
}

// handlePQDoubleDownChoice pins round 6's question. The phone whose turn it is, and nobody else.
func (s *Server) handlePQDoubleDownChoice(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	req, problems, err := decode[pqDoubleDownChoiceRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	questionID, err := uuid.Parse(req.SessionQuestionID)
	if err != nil {
		// An unparseable id names nothing in the pool, which is the same answer as naming a question that is not in it.
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	session, err := s.pubquizr.ChooseDoubleDown(r.Context(), pubquizr.DoubleDownChoiceInput{
		SessionID:         sessionID,
		ActorID:           actorID,
		SessionQuestionID: questionID,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	// The choice is the session: activeQuestionId and the narrowed pool are what the screen reads, so it needs no frame of its own.
	s.settlePQTurn(w, r, session)
}

// handlePQDoubleDownVerdict settles the round 6 question the player asked for. The quizmaster's phone judges it, as any open question.
func (s *Server) handlePQDoubleDownVerdict(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	in, parsed := s.pqTurnInput(w, r)
	if !parsed {
		return
	}
	in.SessionID = sessionID
	in.ActorID = actorID

	session, err := s.pubquizr.RecordDoubleDownTurn(r.Context(), in)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.settlePQTurn(w, r, session)
}

// handlePQFinaleVerdict settles one round 7 question. At a table of two the quizmaster seat is already the rival finalist, so there is no special case.
func (s *Server) handlePQFinaleVerdict(w http.ResponseWriter, r *http.Request) {
	sessionID, actorID, ok := s.pqTable(w, r)
	if !ok {
		return
	}

	in, parsed := s.pqTurnInput(w, r)
	if !parsed {
		return
	}
	in.SessionID = sessionID
	in.ActorID = actorID

	session, err := s.pubquizr.RecordFinaleTurn(r.Context(), in)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.settlePQTurn(w, r, session)
}

// accountName is what to call a phone that did not say, and empty when the account service does not know either.
func (s *Server) accountName(r *http.Request, userID string) string {
	name, _ := nameAndColor(s.usersByID(r.Context(), []string{userID}), userID)
	return name
}

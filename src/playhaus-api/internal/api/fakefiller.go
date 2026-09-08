package api

import (
	"context"
	"errors"
	"net/http"
	"slices"

	"github.com/google/uuid"

	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/joincode"
)

// Fake Filler on the wire: options are identified by shuffled position, never by author -- one author is the string "__truth__" and must never reach a client.

// ffNewLobbyRequest is what opens a room.
type ffNewLobbyRequest struct {
	Locale *string `json:"locale"`
}

func (ffNewLobbyRequest) Validate() map[string]string { return nil }

// ffLobbySettingsRequest is what the host gets to decide, on the way in.
type ffLobbySettingsRequest struct {
	GameMode *string `json:"gameMode"`
	Locale   *string `json:"locale"`
}

func (ffLobbySettingsRequest) Validate() map[string]string { return nil }

// ffSubmitAnswerRequest is one player's fake for one prompt: a value per blank, in the order the blanks appear.
type ffSubmitAnswerRequest struct {
	RoundNumber int      `json:"roundNumber"`
	Fills       []string `json:"fills"`
}

func (req ffSubmitAnswerRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.RoundNumber < 1 {
		problems["roundNumber"] = "is required"
	}
	if len(req.Fills) == 0 {
		problems["fills"] = "is required"
	}
	return problems
}

// ffCastVoteRequest names a slot rather than an author.
type ffCastVoteRequest struct {
	RoundNumber int `json:"roundNumber"`
	Slot        int `json:"slot"`
}

func (req ffCastVoteRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.RoundNumber < 1 {
		problems["roundNumber"] = "is required"
	}
	if req.Slot < 0 {
		problems["slot"] = "must not be negative"
	}
	return problems
}

type ffLobbySettingsResponse struct {
	GameMode string `json:"gameMode"`
	Locale   string `json:"locale"`
}

// ffLobbyPlayerResponse is somebody in the room, and is deliberately the front half of ffGamePlayerResponse.
type ffLobbyPlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	JoinedAt      string `json:"joinedAt"`
}

type ffLobbyResponse struct {
	ID string `json:"id"`
	// Code is what players type in to get here, and is the same string as ID.
	Code string `json:"code"`
	// HostID is whose room it is. The app hides the controls; the server enforces it.
	HostID     string                  `json:"hostId"`
	Status     string                  `json:"status"`
	Settings   ffLobbySettingsResponse `json:"settings"`
	Players    []ffLobbyPlayerResponse `json:"players"`
	MinPlayers int                     `json:"minPlayers"`
	MaxPlayers int                     `json:"maxPlayers"`
	CreatedAt  string                  `json:"createdAt"`
	// GameID is the game to open, set only once the host has started the room.
	GameID string `json:"gameId,omitempty"`
	// RematchCode is the room this one's table has moved on to.
	RematchCode string `json:"rematchCode,omitempty"`
}

type ffGamePlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	Score         int    `json:"score"`
	JoinedAt      string `json:"joinedAt"`
}

// ffOptionResponse is one thing a voter can pick.
type ffOptionResponse struct {
	Slot  int      `json:"slot"`
	Fills []string `json:"fills"`

	AuthorID string   `json:"authorId,omitempty"`
	IsTruth  bool     `json:"isTruth,omitempty"`
	Voters   []string `json:"voters,omitempty"`
}

// ffRoundResponse is one prompt as it looks to one reader, which is the important part.
type ffRoundResponse struct {
	ID     string `json:"id"`
	Number int    `json:"number"`
	// Line still carries its blanks; the fills are kept apart so one prompt can be rendered three ways without three copies of the sentence.
	Line   string `json:"line"`
	Blanks int    `json:"blanks"`

	// Mine is whether this prompt was dealt to the reader to write for.
	Mine bool `json:"mine"`
	// Answered is whether the reader has written their fake for it.
	Answered bool `json:"answered"`
	// MyFills is the reader's own answer, echoed back so a reconnect can redraw a prompt they had already filled in.
	MyFills []string `json:"myFills,omitempty"`
	// AnswerCount is how many of the two authors have written.
	AnswerCount int `json:"answerCount"`

	// CanVote is whether the reader is eligible to vote on this round at all.
	CanVote bool `json:"canVote"`
	// MyVoteSlot is the slot the reader picked, once they have.
	MyVoteSlot *int `json:"myVoteSlot,omitempty"`
	VoteCount  int  `json:"voteCount"`

	// Options are sent only for the round being voted on and for rounds already revealed.
	Options []ffOptionResponse `json:"options,omitempty"`

	Revealed bool `json:"revealed"`
	// Authors are the two players who wrote for this prompt, told only once the round is revealed.
	Authors []string `json:"authors,omitempty"`
}

// ffGameResponse is the board as one player may see it.
type ffGameResponse struct {
	ID       string `json:"id"`
	LobbyID  string `json:"lobbyId"`
	OwnerID  string `json:"ownerId"`
	Locale   string `json:"locale"`
	GameMode string `json:"gameMode"`

	Phase string `json:"phase"`
	// CurrentRound only means anything once Phase is voting -- during writing every round is open at once.
	CurrentRound int    `json:"currentRound"`
	TotalRounds  int    `json:"totalRounds"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`

	// Score is the reader's own, so the board can show it without picking itself out of Players first.
	Score int `json:"score"`

	AnswersIn     int `json:"answersIn"`
	AnswersNeeded int `json:"answersNeeded"`
	VotesNeeded   int `json:"votesNeeded"`

	Players []ffGamePlayerResponse `json:"players"`
	Rounds  []ffRoundResponse      `json:"rounds"`
}

// ffAnswerResponse is what one answer did: counts, and nothing else.
type ffAnswerResponse struct {
	RoundNumber int    `json:"roundNumber"`
	Phase       string `json:"phase"`
	AnswersIn   int    `json:"answersIn"`
	// AnswersNeeded is how many the whole game is waiting for, not how many this round is.
	AnswersNeeded int `json:"answersNeeded"`
	// VotingOpened is set on the answer that finished the writing phase.
	VotingOpened bool   `json:"votingOpened"`
	GameID       string `json:"gameId"`
}

// ffPublicRoundResponse is a round with nothing reader-specific on it, which is what makes it safe to broadcast.
type ffPublicRoundResponse struct {
	ID      string             `json:"id"`
	Number  int                `json:"number"`
	Line    string             `json:"line"`
	Blanks  int                `json:"blanks"`
	Options []ffOptionResponse `json:"options"`
}

// ffRevealResponse is a finished round with everything told.
type ffRevealResponse struct {
	RoundNumber int                `json:"roundNumber"`
	Line        string             `json:"line"`
	Authors     []string           `json:"authors"`
	Options     []ffOptionResponse `json:"options"`
}

// ffVoteResponse is what one vote did.
type ffVoteResponse struct {
	GameID      string `json:"gameId"`
	RoundNumber int    `json:"roundNumber"`
	Votes       int    `json:"votes"`
	VotesNeeded int    `json:"votesNeeded"`
	RoundOver   bool   `json:"roundOver"`
	GameOver    bool   `json:"gameOver"`
	// CurrentRound is the round the game is on afterwards, which is not RoundNumber if this vote closed it.
	CurrentRound int    `json:"currentRound"`
	Status       string `json:"status"`

	Players []ffGamePlayerResponse `json:"players"`

	Reveal    *ffRevealResponse      `json:"reveal,omitempty"`
	NextRound *ffPublicRoundResponse `json:"nextRound,omitempty"`
}

func (s *Server) newFFLobbyResponse(ctx context.Context, lobby *fakefiller.FFLobby) ffLobbyResponse {
	// By seat, which is the order people walked in -- so the host is the top row.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b fakefiller.FFLobbyPlayer) int { return a.Seat - b.Seat })

	ids := make([]string, 0, len(seated))
	for _, player := range seated {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	players := make([]ffLobbyPlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, ffLobbyPlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			JoinedAt:      player.JoinedAt.Format(timeFormat),
		})
	}

	body := ffLobbyResponse{
		ID:     lobby.ID,
		Code:   lobby.ID,
		HostID: lobby.OwnerID,
		Status: string(lobby.Status),
		Settings: ffLobbySettingsResponse{
			GameMode: string(lobby.GameMode),
			Locale:   lobby.Locale.String(),
		},
		Players: players,
		// Carried rather than hardcoded in the app.
		MinPlayers: fakefiller.MinLobbyPlayers,
		MaxPlayers: fakefiller.MaxLobbyPlayers,
		CreatedAt:  lobby.CreatedAt.Format(timeFormat),
	}
	if lobby.GameID != nil {
		body.GameID = lobby.GameID.String()
	}
	if lobby.RematchCode != nil {
		body.RematchCode = *lobby.RematchCode
	}

	return body
}

func (s *Server) ffPlayers(ctx context.Context, game *fakefiller.FFMultiDeviceGame) []ffGamePlayerResponse {
	seated := slices.Clone(game.Players)
	slices.SortFunc(seated, func(a, b fakefiller.FFGamePlayer) int { return a.TurnOrder - b.TurnOrder })

	ids := make([]string, 0, len(seated))
	for _, player := range seated {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	// A game player has no join time of its own.
	joinedAt := game.CreatedAt.Format(timeFormat)

	players := make([]ffGamePlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, ffGamePlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			Score:         player.Score,
			JoinedAt:      joinedAt,
		})
	}
	return players
}

// ffRoundVisibility answers the two questions every redaction in this file turns on. open is the round being voted on right now.
func ffRoundVisibility(game *fakefiller.FFMultiDeviceGame, number int) (open, revealed bool) {
	if game.Phase != fakefiller.PhaseVoting {
		return false, false
	}
	revealed = number < game.CurrentRound || game.Status == fakefiller.GameCompleted
	open = !revealed && number == game.CurrentRound && game.Status == fakefiller.GameInProgress
	return open, revealed
}

// newFFRoundResponse is one round as userID may see it.
func newFFRoundResponse(game *fakefiller.FFMultiDeviceGame, round fakefiller.FFRound, userID string) ffRoundResponse {
	open, revealed := ffRoundVisibility(game, round.Number)

	body := ffRoundResponse{
		ID:          round.ID.String(),
		Number:      round.Number,
		Line:        round.Line,
		Blanks:      round.Blanks,
		Mine:        round.WrittenBy(userID),
		CanVote:     fakefiller.EligibleVoter(round, userID),
		AnswerCount: ffAnswerCount(round),
		VoteCount:   len(round.Votes),
		Revealed:    revealed,
	}

	// The reader's own answer, and only ever the reader's own.
	if mine := round.Option(userID); mine != nil {
		body.Answered = true
		body.MyFills = mine.Fills
	}

	if vote := round.VoteBy(userID); vote != nil {
		if voted := round.Option(vote.VotedForAuthorID); voted != nil {
			slot := voted.Slot
			body.MyVoteSlot = &slot
		}
	}

	if open || revealed {
		body.Options = newFFOptionResponses(round, revealed)
	}
	if revealed {
		body.Authors = []string{round.AuthorOneUserID, round.AuthorTwoUserID}
	}

	return body
}

// newFFOptionResponses is the line-up, in the order it was shuffled into. revealed is what decides how much of an option is an option.
func newFFOptionResponses(round fakefiller.FFRound, revealed bool) []ffOptionResponse {
	sorted := slices.Clone(round.Options)
	slices.SortFunc(sorted, func(a, b fakefiller.FFOption) int { return a.Slot - b.Slot })

	options := make([]ffOptionResponse, 0, len(sorted))
	for _, option := range sorted {
		body := ffOptionResponse{
			Slot:  option.Slot,
			Fills: option.Fills,
		}
		if revealed {
			body.AuthorID = option.AuthorID
			body.IsTruth = option.IsTruth()
			for _, vote := range round.Votes {
				if vote.VotedForAuthorID == option.AuthorID {
					body.Voters = append(body.Voters, vote.VoterUserID)
				}
			}
		}
		options = append(options, body)
	}

	return options
}

// ffAnswerCount is how many of a round's two authors have written, which is every option on it except the truth.
func ffAnswerCount(round fakefiller.FFRound) int {
	count := 0
	for _, option := range round.Options {
		if !option.IsTruth() {
			count++
		}
	}
	return count
}

func (s *Server) newFFGameResponse(
	ctx context.Context,
	game *fakefiller.FFMultiDeviceGame,
	userID string,
) ffGameResponse {
	rounds := make([]ffRoundResponse, 0, len(game.Rounds))
	answersIn := 0
	for _, round := range game.Rounds {
		rounds = append(rounds, newFFRoundResponse(game, round, userID))
		answersIn += ffAnswerCount(round)
	}

	return ffGameResponse{
		ID:            game.ID.String(),
		LobbyID:       game.LobbyID,
		OwnerID:       game.OwnerID,
		Locale:        game.Locale.String(),
		GameMode:      string(game.GameMode),
		Phase:         string(game.Phase),
		CurrentRound:  game.CurrentRound,
		TotalRounds:   len(game.Rounds),
		Status:        string(game.Status),
		CreatedAt:     game.CreatedAt.Format(timeFormat),
		Score:         game.Score(userID),
		AnswersIn:     answersIn,
		AnswersNeeded: fakefiller.AnswersFor(len(game.Players)),
		VotesNeeded:   fakefiller.VotersFor(len(game.Players)),
		Players:       s.ffPlayers(ctx, game),
		Rounds:        rounds,
	}
}

// newFFAnswerResponse is the progress frame.
func newFFAnswerResponse(outcome *fakefiller.AnswerOutcome, roundNumber int) ffAnswerResponse {
	return ffAnswerResponse{
		GameID:        outcome.Game.ID.String(),
		RoundNumber:   roundNumber,
		Phase:         string(outcome.Game.Phase),
		AnswersIn:     outcome.Answered,
		AnswersNeeded: outcome.Expected,
		VotingOpened:  outcome.VotingOpened,
	}
}

func (s *Server) newFFVoteResponse(ctx context.Context, outcome *fakefiller.VoteOutcome) ffVoteResponse {
	game := outcome.Game

	body := ffVoteResponse{
		GameID:       game.ID.String(),
		RoundNumber:  outcome.RoundNumber,
		Votes:        outcome.Votes,
		VotesNeeded:  outcome.VotesNeeded,
		RoundOver:    outcome.RoundOver,
		GameOver:     outcome.GameOver,
		CurrentRound: game.CurrentRound,
		Status:       string(game.Status),
		Players:      s.ffPlayers(ctx, game),
	}

	if !outcome.RoundOver || outcome.Round == nil {
		return body
	}

	reveal := ffRevealResponse{
		RoundNumber: outcome.Round.Number,
		Line:        outcome.Round.Line,
		Authors:     []string{outcome.Round.AuthorOneUserID, outcome.Round.AuthorTwoUserID},
		Options:     newFFOptionResponses(*outcome.Round, true),
	}
	body.Reveal = &reveal

	// A round that ended and a game that ended look the same from the vote that did it.
	if !outcome.GameOver {
		if next := game.Round(game.CurrentRound); next != nil {
			opened := ffPublicRoundResponse{
				ID:      next.ID.String(),
				Number:  next.Number,
				Line:    next.Line,
				Blanks:  next.Blanks,
				Options: newFFOptionResponses(*next, false),
			}
			body.NextRound = &opened
		}
	}

	return body
}

func (s *Server) AddFakeFillerHandlers() {
	s.mux.HandleFunc("POST /api/v1/fake-filler/lobby", s.requireAuth(s.handleCreateFFLobby))
	// Before {code}, so the literal wins: this is the room you are already in, not a room called "current".
	s.mux.HandleFunc("GET /api/v1/fake-filler/lobby/current", s.requireAuth(s.handleGetCurrentFFLobby))

	// room is what every route addressed by a join code is wrapped in.
	room := func(next http.HandlerFunc) http.HandlerFunc {
		return s.requireAuth(s.requireGameCode(joincode.FakeFiller, next))
	}

	s.mux.HandleFunc("GET /api/v1/fake-filler/lobby/{code}", room(s.handleGetFFLobby))
	s.mux.HandleFunc("PATCH /api/v1/fake-filler/lobby/{code}", room(s.handleUpdateFFLobbySettings))
	s.mux.HandleFunc("DELETE /api/v1/fake-filler/lobby/{code}", room(s.handleDeleteFFLobby))
	s.mux.HandleFunc("POST /api/v1/fake-filler/lobby/{code}/players", room(s.handleJoinFFLobby))
	s.mux.HandleFunc("DELETE /api/v1/fake-filler/lobby/{code}/players/me", room(s.handleLeaveFFLobby))
	s.mux.HandleFunc("POST /api/v1/fake-filler/lobby/{code}/start", room(s.handleStartFFLobby))
	s.mux.HandleFunc("POST /api/v1/fake-filler/lobby/{code}/rematch", room(s.handleRematchFFLobby))
	s.mux.HandleFunc("POST /api/v1/fake-filler/lobby/{code}/abandon", room(s.handleAbandonFFLobby))

	s.mux.HandleFunc("GET /api/v1/fake-filler/game/{gameID}", s.requireAuth(s.handleGetFFGame))
	s.mux.HandleFunc("POST /api/v1/fake-filler/game/{gameID}/answers", s.requireAuth(s.handleSubmitFFAnswer))
	s.mux.HandleFunc("POST /api/v1/fake-filler/game/{gameID}/votes", s.requireAuth(s.handleCastFFVote))
}

func (s *Server) handleCreateFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreateFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, _, err := decode[ffNewLobbyRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	lobby, err := s.fakeFiller.CreateLobby(r.Context(), userID, localeFrom(Deref(req.Locale, ""), r))
	if err != nil {
		s.writeFFLobbyError(w, "create fake filler lobby", err)
		return
	}

	// Nothing is published: the room is one request old and there is nobody connected to it yet to tell.
	writeJSON(w, http.StatusCreated, s.newFFLobbyResponse(r.Context(), lobby))
}

// handleGetFFLobby is the snapshot the room screen opens on.
func (s *Server) handleGetFFLobby(w http.ResponseWriter, r *http.Request) {
	lobby, err := s.fakeFiller.Lobby(r.Context(), lobbyCode(r))
	if err != nil {
		s.writeFFLobbyError(w, "get fake filler lobby", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newFFLobbyResponse(r.Context(), lobby))
}

// handleGetCurrentFFLobby is what the app asks on launch.
func (s *Server) handleGetCurrentFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetCurrentFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	lobby, err := s.fakeFiller.CurrentLobby(r.Context(), userID)
	if errors.Is(err, fakefiller.ErrLobbyNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		s.writeFFLobbyError(w, "current fake filler lobby", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newFFLobbyResponse(r.Context(), lobby))
}

func (s *Server) handleJoinFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleJoinFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	lobby, err := s.fakeFiller.JoinLobby(r.Context(), code, userID)
	if err != nil {
		s.writeFFLobbyError(w, "join fake filler lobby", err)
		return
	}

	body := s.newFFLobbyResponse(r.Context(), lobby)
	s.publishFFLobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

func (s *Server) handleUpdateFFLobbySettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleUpdateFFLobbySettings reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, invalid, err := decode[ffLobbySettingsRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(invalid) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": invalid})
		return
	}

	code := lobbyCode(r)

	// The room has to be read before the mode can default to what it is already playing.
	current, err := s.fakeFiller.Lobby(r.Context(), code)
	if err != nil {
		s.writeFFLobbyError(w, "update fake filler lobby settings", err)
		return
	}

	lobby, problems, err := s.fakeFiller.UpdateLobbySettings(r.Context(), code, userID, fakefiller.LobbySettings{
		GameMode: fakefiller.FFGameMode(Deref(req.GameMode, string(current.GameMode))),
		Locale:   localeFrom(Deref(req.Locale, current.Locale.String()), r),
	})
	if err != nil {
		s.writeFFLobbyError(w, "update fake filler lobby settings", err)
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	body := s.newFFLobbyResponse(r.Context(), lobby)
	s.publishFFLobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

// handleLeaveFFLobby gives a seat back without closing the room.
func (s *Server) handleLeaveFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleLeaveFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.fakeFiller.LeaveLobby(r.Context(), code, userID); err != nil {
		s.writeFFLobbyError(w, "leave fake filler lobby", err)
		return
	}

	// The room as it stands without them.
	if lobby, err := s.fakeFiller.Lobby(r.Context(), code); err == nil {
		s.publishFFLobby(code, s.newFFLobbyResponse(r.Context(), lobby))
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleDeleteFFLobby closes a room for good. Host only.
func (s *Server) handleDeleteFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleDeleteFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.fakeFiller.DeleteLobby(r.Context(), code, userID); err != nil {
		s.writeFFLobbyError(w, "delete fake filler lobby", err)
		return
	}

	// Told rather than left to be discovered.
	s.publishFFLobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

// handleStartFFLobby turns a room into a game.
func (s *Server) handleStartFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleStartFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	lobby, game, err := s.fakeFiller.StartLobby(r.Context(), code, userID)
	if err != nil {
		s.writeFFLobbyError(w, "start fake filler lobby", err)
		return
	}

	body := s.newFFLobbyResponse(r.Context(), lobby)
	s.publishFFGameStarted(code, game.ID.String(), body)

	writeJSON(w, http.StatusOK, body)
}

// handleRematchFFLobby opens the next room for a table that has just finished.
func (s *Server) handleRematchFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleRematchFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	next, err := s.fakeFiller.Rematch(r.Context(), code, userID)
	if err != nil {
		s.writeFFLobbyError(w, "rematch fake filler lobby", err)
		return
	}

	// Announced on the room they are all still sitting in.
	s.publishFFRematch(code, next.ID)

	writeJSON(w, http.StatusCreated, s.newFFLobbyResponse(r.Context(), next))
}

// handleAbandonFFLobby throws a room and its game away for good. Host only.
func (s *Server) handleAbandonFFLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleAbandonFFLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.fakeFiller.AbandonLobby(r.Context(), code, userID); err != nil {
		s.writeFFLobbyError(w, "abandon fake filler lobby", err)
		return
	}

	s.publishFFLobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleGetFFGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetFFGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		// An unparseable id cannot name a game, and saying so is the same answer as "not your table".
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return
	}

	game, err := s.fakeFiller.Game(r.Context(), gameID, userID)
	if err != nil {
		s.writeFFPlayError(w, "get fake filler game", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newFFGameResponse(r.Context(), game, userID))
}

func (s *Server) handleSubmitFFAnswer(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleSubmitFFAnswer reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return
	}

	req, problems, err := decode[ffSubmitAnswerRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.fakeFiller.SubmitAnswer(r.Context(), fakefiller.SubmitAnswerInput{
		GameID:      gameID,
		UserID:      userID,
		RoundNumber: req.RoundNumber,
		Fills:       fakefiller.Fills(req.Fills),
	})
	if err != nil {
		s.writeFFPlayError(w, "submit fake filler answer", err)
		return
	}

	body := newFFAnswerResponse(outcome, req.RoundNumber)
	// Counts only, so the same body goes to the table as to the writer.
	s.publishFFAnswerProgress(outcome.Game.LobbyID, body)

	if outcome.VotingOpened {
		// The options are different for nobody.
		s.publishFFVotingStarted(outcome.Game.LobbyID, outcome.Game.ID.String())
	}

	writeJSON(w, http.StatusCreated, body)
}

func (s *Server) handleCastFFVote(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCastFFVote reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return
	}

	req, problems, err := decode[ffCastVoteRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.fakeFiller.CastVote(r.Context(), fakefiller.CastVoteInput{
		GameID:      gameID,
		UserID:      userID,
		RoundNumber: req.RoundNumber,
		Slot:        req.Slot,
	})
	if err != nil {
		s.writeFFPlayError(w, "cast fake filler vote", err)
		return
	}

	body := s.newFFVoteResponse(r.Context(), outcome)
	// Everybody watching gets exactly what the voter got back.
	s.publishFFVote(outcome.Game.LobbyID, body)

	writeJSON(w, http.StatusCreated, body)
}

// writeFFLobbyError turns a room error into a status and a machine-readable tag.
func (s *Server) writeFFLobbyError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, fakefiller.ErrLobbyNotFound):
		writeErrorCode(w, http.StatusNotFound, "lobby_not_found", "that room does not exist")
	case errors.Is(err, fakefiller.ErrNotHost):
		writeErrorCode(w, http.StatusForbidden, "not_host", "only the host may do that")
	case errors.Is(err, fakefiller.ErrLobbyFull):
		writeErrorCode(w, http.StatusConflict, "lobby_full", "that room is full")
	case errors.Is(err, fakefiller.ErrLobbyStarted):
		writeErrorCode(w, http.StatusConflict, "lobby_started", "that game has already started")
	case errors.Is(err, fakefiller.ErrNotEnoughPlayers):
		writeErrorCode(w, http.StatusConflict, "not_enough_players", "you need more players to start")
	case errors.Is(err, fakefiller.ErrTooManyPlayers):
		writeErrorCode(w, http.StatusConflict, "too_many_players", "that is too many players to start")
	case errors.Is(err, fakefiller.ErrGameNotOver):
		writeErrorCode(w, http.StatusConflict, "game_not_over", "that game is still being played")
	case errors.Is(err, fakefiller.ErrNotEnoughContent):
		// A short data file, which is a broken build rather than a broken request.
		s.log.Error(what, "err", err)
		writeErrorCode(w, http.StatusInternalServerError, "no_content", "there are not enough prompts to play")
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

// writeFFPlayError is the refusals a board produces: reading it, writing into it, voting on it.
func (s *Server) writeFFPlayError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, fakefiller.ErrGameNotFound):
		// Not at the table reads the same as not a game.
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
	case errors.Is(err, fakefiller.ErrRoundNotFound):
		writeErrorCode(w, http.StatusNotFound, "round_not_found", "that prompt is not in this game")
	case errors.Is(err, fakefiller.ErrGameFinished):
		writeErrorCode(w, http.StatusConflict, "game_finished", "this game is over")
	case errors.Is(err, fakefiller.ErrWrongPhase):
		writeErrorCode(w, http.StatusConflict, "wrong_phase", "the table is not doing that yet")
	case errors.Is(err, fakefiller.ErrWrongRound):
		writeErrorCode(w, http.StatusConflict, "wrong_round", "the table has moved on")
	case errors.Is(err, fakefiller.ErrNotYourPrompt):
		writeErrorCode(w, http.StatusForbidden, "not_your_prompt", "that prompt was not dealt to you")
	case errors.Is(err, fakefiller.ErrAlreadyAnswered):
		writeErrorCode(w, http.StatusConflict, "already_answered", "you have already filled that one in")
	case errors.Is(err, fakefiller.ErrAlreadyVoted):
		writeErrorCode(w, http.StatusConflict, "already_voted", "you have already voted on that one")
	case errors.Is(err, fakefiller.ErrCannotVoteOwnPrompt):
		writeErrorCode(w, http.StatusForbidden, "cannot_vote_own_prompt", "you wrote for that one, so you cannot vote on it")
	case errors.Is(err, fakefiller.ErrOptionNotFound):
		writeErrorCode(w, http.StatusNotFound, "option_not_found", "there is nothing in that slot")
	case errors.Is(err, fakefiller.ErrInvalidInput):
		writeErrorCode(w, http.StatusUnprocessableEntity, "invalid_answer", err.Error())
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

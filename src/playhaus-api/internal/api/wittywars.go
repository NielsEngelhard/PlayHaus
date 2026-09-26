package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"

	"github.com/google/uuid"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/user"
	"playhaus-api/internal/wittywars"
)

// Witty Wars on the wire: answers are identified by shuffled position, and who wrote which is only told on the reveal.

type wwNewLobbyRequest struct {
	Locale   *string `json:"locale"`
	GameMode *string `json:"gameMode"`
}

func (req wwNewLobbyRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.GameMode != nil && !wittywars.WWGameMode(*req.GameMode).Valid() {
		problems["gameMode"] = fmt.Sprintf("must be %q, %q or %q", wittywars.GameModeFamily, wittywars.GameModeRude, wittywars.GameModeCaliente)
	}
	return problems
}

type wwLobbySettingsRequest struct {
	GameMode         *string `json:"gameMode"`
	Locale           *string `json:"locale"`
	AnswersPerPlayer *int    `json:"answersPerPlayer"`
}

func (wwLobbySettingsRequest) Validate() map[string]string { return nil }

type wwRoundAnswerRequest struct {
	RoundNumber int    `json:"roundNumber"`
	Answer      string `json:"answer"`
}

// wwSubmitAnswersRequest is every answer a player owes, in one body.
type wwSubmitAnswersRequest struct {
	Answers []wwRoundAnswerRequest `json:"answers"`
}

func (req wwSubmitAnswersRequest) Validate() map[string]string {
	problems := map[string]string{}
	if len(req.Answers) == 0 {
		problems["answers"] = "is required"
	}
	for _, answer := range req.Answers {
		if answer.RoundNumber < 1 {
			problems["answers"] = "every answer needs a roundNumber"
		}
	}
	return problems
}

type wwCastVoteRequest struct {
	RoundNumber int `json:"roundNumber"`
	Slot        int `json:"slot"`
}

func (req wwCastVoteRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.RoundNumber < 1 {
		problems["roundNumber"] = "is required"
	}
	if req.Slot < 0 {
		problems["slot"] = "must not be negative"
	}
	return problems
}

type wwAdvanceRequest struct {
	RoundNumber int `json:"roundNumber"`
}

func (req wwAdvanceRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.RoundNumber < 1 {
		problems["roundNumber"] = "is required"
	}
	return problems
}

type wwLobbySettingsResponse struct {
	GameMode         string `json:"gameMode"`
	Locale           string `json:"locale"`
	AnswersPerPlayer int    `json:"answersPerPlayer"`
}

type wwLobbyPlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	JoinedAt      string `json:"joinedAt"`
}

type wwLobbyResponse struct {
	ID                  string                  `json:"id"`
	Code                string                  `json:"code"`
	HostID              string                  `json:"hostId"`
	Status              string                  `json:"status"`
	Settings            wwLobbySettingsResponse `json:"settings"`
	Players             []wwLobbyPlayerResponse `json:"players"`
	MinPlayers          int                     `json:"minPlayers"`
	MaxPlayers          int                     `json:"maxPlayers"`
	MinAnswersPerPlayer int                     `json:"minAnswersPerPlayer"`
	MaxAnswersPerPlayer int                     `json:"maxAnswersPerPlayer"`
	MaxAnswerLength     int                     `json:"maxAnswerLength"`
	CreatedAt           string                  `json:"createdAt"`
	GameID              string                  `json:"gameId,omitempty"`
	RematchCode         string                  `json:"rematchCode,omitempty"`
}

type wwGamePlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	Score         int    `json:"score"`
	JoinedAt      string `json:"joinedAt"`
}

// wwOptionResponse is one answer a voter can pick.
type wwOptionResponse struct {
	Slot   int    `json:"slot"`
	Answer string `json:"answer"`

	AuthorID string `json:"authorId,omitempty"`
	// AuthorIDs is both writers when they wrote the same thing and the two answers were merged.
	AuthorIDs []string `json:"authorIds,omitempty"`
	Voters    []string `json:"voters,omitempty"`
	// Points is what this answer earned on the round, sweep bonus included.
	Points int  `json:"points,omitempty"`
	Sweep  bool `json:"sweep,omitempty"`
}

// wwRoundResponse is one prompt as it looks to one reader.
type wwRoundResponse struct {
	ID     string `json:"id"`
	Number int    `json:"number"`
	// Line has its placeholder already filled with the subject's name.
	Line      string `json:"line"`
	SubjectID string `json:"subjectId,omitempty"`

	Mine        bool   `json:"mine"`
	Answered    bool   `json:"answered"`
	MyAnswer    string `json:"myAnswer,omitempty"`
	AnswerCount int    `json:"answerCount"`

	CanVote    bool `json:"canVote"`
	MyVoteSlot *int `json:"myVoteSlot,omitempty"`
	VoteCount  int  `json:"voteCount"`

	// Options are sent only for the round being voted on and for rounds already revealed.
	Options []wwOptionResponse `json:"options,omitempty"`

	Revealed bool     `json:"revealed"`
	Authors  []string `json:"authors,omitempty"`
}

type wwGameResponse struct {
	ID       string `json:"id"`
	LobbyID  string `json:"lobbyId"`
	OwnerID  string `json:"ownerId"`
	Locale   string `json:"locale"`
	GameMode string `json:"gameMode"`

	Phase        string `json:"phase"`
	CurrentRound int    `json:"currentRound"`
	TotalRounds  int    `json:"totalRounds"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`

	Score int `json:"score"`

	AnswersIn       int `json:"answersIn"`
	AnswersNeeded   int `json:"answersNeeded"`
	VotesNeeded     int `json:"votesNeeded"`
	MaxAnswerLength int `json:"maxAnswerLength"`

	Players []wwGamePlayerResponse `json:"players"`
	Rounds  []wwRoundResponse      `json:"rounds"`
}

// wwAnswerResponse is what one batch did: counts, and nothing else.
type wwAnswerResponse struct {
	GameID        string `json:"gameId"`
	Phase         string `json:"phase"`
	AnswersIn     int    `json:"answersIn"`
	AnswersNeeded int    `json:"answersNeeded"`
	VotingOpened  bool   `json:"votingOpened"`
}

// wwPublicRoundResponse is a round with nothing reader-specific on it, which is what makes it safe to broadcast.
type wwPublicRoundResponse struct {
	ID        string             `json:"id"`
	Number    int                `json:"number"`
	Line      string             `json:"line"`
	SubjectID string             `json:"subjectId,omitempty"`
	Options   []wwOptionResponse `json:"options"`
}

type wwRevealResponse struct {
	RoundNumber int                `json:"roundNumber"`
	Line        string             `json:"line"`
	Authors     []string           `json:"authors"`
	Options     []wwOptionResponse `json:"options"`
}

type wwVoteResponse struct {
	GameID       string                 `json:"gameId"`
	RoundNumber  int                    `json:"roundNumber"`
	Votes        int                    `json:"votes"`
	VotesNeeded  int                    `json:"votesNeeded"`
	RoundOver    bool                   `json:"roundOver"`
	LastRound    bool                   `json:"lastRound"`
	CurrentRound int                    `json:"currentRound"`
	Phase        string                 `json:"phase"`
	Status       string                 `json:"status"`
	Players      []wwGamePlayerResponse `json:"players"`
	Reveal       *wwRevealResponse      `json:"reveal,omitempty"`
}

type wwAdvanceResponse struct {
	GameID       string                 `json:"gameId"`
	Phase        string                 `json:"phase"`
	CurrentRound int                    `json:"currentRound"`
	Status       string                 `json:"status"`
	Players      []wwGamePlayerResponse `json:"players"`
	NextRound    *wwPublicRoundResponse `json:"nextRound,omitempty"`
}

func (s *Server) newWWLobbyResponse(ctx context.Context, lobby *wittywars.WWLobby) wwLobbyResponse {
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b wittywars.WWLobbyPlayer) int { return a.Seat - b.Seat })

	ids := make([]string, 0, len(seated))
	for _, player := range seated {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	players := make([]wwLobbyPlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, wwLobbyPlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			JoinedAt:      player.JoinedAt.Format(timeFormat),
		})
	}

	body := wwLobbyResponse{
		ID:     lobby.ID,
		Code:   lobby.ID,
		HostID: lobby.OwnerID,
		Status: string(lobby.Status),
		Settings: wwLobbySettingsResponse{
			GameMode:         string(lobby.GameMode),
			Locale:           lobby.Locale.String(),
			AnswersPerPlayer: lobby.AnswersPerPlayer,
		},
		Players:             players,
		MinPlayers:          wittywars.MinLobbyPlayers,
		MaxPlayers:          wittywars.MaxLobbyPlayers,
		MinAnswersPerPlayer: wittywars.MinAnswersPerPlayer,
		MaxAnswersPerPlayer: wittywars.MaxAnswersPerPlayer,
		MaxAnswerLength:     wittywars.MaxAnswerLength,
		CreatedAt:           lobby.CreatedAt.Format(timeFormat),
	}
	if lobby.GameID != nil {
		body.GameID = lobby.GameID.String()
	}
	if lobby.RematchCode != nil {
		body.RematchCode = *lobby.RematchCode
	}
	return body
}

// wwUsers is everybody at a game's table, looked up once for the names and the colours.
func (s *Server) wwUsers(ctx context.Context, game *wittywars.WWMultiDeviceGame) map[string]*user.User {
	ids := make([]string, 0, len(game.Players))
	for _, player := range game.Players {
		ids = append(ids, player.UserID)
	}
	return s.usersByID(ctx, ids)
}

func wwPlayers(game *wittywars.WWMultiDeviceGame, users map[string]*user.User) []wwGamePlayerResponse {
	seated := slices.Clone(game.Players)
	slices.SortFunc(seated, func(a, b wittywars.WWGamePlayer) int { return a.TurnOrder - b.TurnOrder })

	joinedAt := game.CreatedAt.Format(timeFormat)

	players := make([]wwGamePlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, wwGamePlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			Score:         player.Score,
			JoinedAt:      joinedAt,
		})
	}
	return players
}

// wwLine is a round's prompt with the subject's name put in.
func wwLine(round wittywars.WWRound, users map[string]*user.User) string {
	if round.SubjectUserID == "" {
		return round.Line
	}
	name, _ := nameAndColor(users, round.SubjectUserID)
	return wittywars.ResolveLine(round.Line, name)
}

// wwRoundVisibility answers the two questions every redaction in this file turns on. open is the round being voted on right now.
func wwRoundVisibility(game *wittywars.WWMultiDeviceGame, number int) (open, revealed bool) {
	if game.Phase == wittywars.PhaseWriting {
		return false, false
	}
	told := game.Phase == wittywars.PhaseReveal && number == game.CurrentRound
	revealed = told || number < game.CurrentRound || game.Status == wittywars.GameCompleted
	open = !revealed && number == game.CurrentRound && game.Status == wittywars.GameInProgress
	return open, revealed
}

func newWWRoundResponse(game *wittywars.WWMultiDeviceGame, round wittywars.WWRound, userID string, users map[string]*user.User) wwRoundResponse {
	open, revealed := wwRoundVisibility(game, round.Number)

	body := wwRoundResponse{
		ID:          round.ID.String(),
		Number:      round.Number,
		Line:        wwLine(round, users),
		SubjectID:   round.SubjectUserID,
		Mine:        round.WrittenBy(userID),
		CanVote:     wittywars.EligibleVoter(round, userID),
		AnswerCount: len(round.Options),
		VoteCount:   len(round.Votes),
		Revealed:    revealed,
	}

	if mine := round.Option(userID); mine != nil {
		body.Answered = true
		body.MyAnswer = mine.Answer
	}

	if vote := round.VoteBy(userID); vote != nil {
		if voted := round.Option(vote.VotedForAuthorID); voted != nil {
			slot := voted.Slot
			body.MyVoteSlot = &slot
		}
	}

	if open || revealed {
		body.Options = newWWOptionResponses(round, revealed)
	}
	if revealed {
		body.Authors = round.Authors()
	}
	return body
}

// newWWOptionResponses is the pair, in the order it was shuffled into. Authors, voters and points only once revealed.
func newWWOptionResponses(round wittywars.WWRound, revealed bool) []wwOptionResponse {
	sorted := slices.Clone(round.Options)
	slices.SortFunc(sorted, func(a, b wittywars.WWOption) int { return a.Slot - b.Slot })

	sweep := wittywars.SweepSlot(round)

	options := make([]wwOptionResponse, 0, len(sorted))
	for i, option := range sorted {
		// Merged answers share a slot and are sorted together, so only the first of them makes an entry.
		if i > 0 && sorted[i-1].Slot == option.Slot {
			continue
		}
		body := wwOptionResponse{Slot: option.Slot, Answer: option.Answer}
		if revealed {
			shared := round.OptionsInSlot(option.Slot)
			authors := make([]string, 0, len(shared))
			for _, o := range shared {
				authors = append(authors, o.AuthorID)
			}
			body.AuthorID = option.AuthorID
			body.AuthorIDs = authors
			for _, vote := range round.Votes {
				if slices.Contains(authors, vote.VotedForAuthorID) {
					body.Voters = append(body.Voters, vote.VoterUserID)
				}
			}
			body.Points = wittywars.PointsFor(round, option.Slot)
			body.Sweep = sweep == option.Slot
		}
		options = append(options, body)
	}
	return options
}

func (s *Server) newWWGameResponse(ctx context.Context, game *wittywars.WWMultiDeviceGame, userID string) wwGameResponse {
	users := s.wwUsers(ctx, game)

	rounds := make([]wwRoundResponse, 0, len(game.Rounds))
	answersIn := 0
	for _, round := range game.Rounds {
		rounds = append(rounds, newWWRoundResponse(game, round, userID, users))
		answersIn += len(round.Options)
	}

	return wwGameResponse{
		ID:              game.ID.String(),
		LobbyID:         game.LobbyID,
		OwnerID:         game.OwnerID,
		Locale:          game.Locale.String(),
		GameMode:        string(game.GameMode),
		Phase:           string(game.Phase),
		CurrentRound:    game.CurrentRound,
		TotalRounds:     len(game.Rounds),
		Status:          string(game.Status),
		CreatedAt:       game.CreatedAt.Format(timeFormat),
		Score:           game.Score(userID),
		AnswersIn:       answersIn,
		AnswersNeeded:   wittywars.AnswersFor(len(game.Players), game.AnswersPerPlayer),
		VotesNeeded:     wittywars.VotersFor(len(game.Players)),
		MaxAnswerLength: wittywars.MaxAnswerLength,
		Players:         wwPlayers(game, users),
		Rounds:          rounds,
	}
}

func newWWAnswerResponse(outcome *wittywars.AnswerOutcome) wwAnswerResponse {
	return wwAnswerResponse{
		GameID:        outcome.Game.ID.String(),
		Phase:         string(outcome.Game.Phase),
		AnswersIn:     outcome.Answered,
		AnswersNeeded: outcome.Expected,
		VotingOpened:  outcome.VotingOpened,
	}
}

func (s *Server) newWWVoteResponse(ctx context.Context, outcome *wittywars.VoteOutcome) wwVoteResponse {
	game := outcome.Game
	users := s.wwUsers(ctx, game)

	body := wwVoteResponse{
		GameID:       game.ID.String(),
		RoundNumber:  outcome.RoundNumber,
		Votes:        outcome.Votes,
		VotesNeeded:  outcome.VotesNeeded,
		RoundOver:    outcome.RoundOver,
		LastRound:    outcome.LastRound,
		CurrentRound: game.CurrentRound,
		Phase:        string(game.Phase),
		Status:       string(game.Status),
		Players:      wwPlayers(game, users),
	}

	if !outcome.RoundOver || outcome.Round == nil {
		return body
	}

	body.Reveal = &wwRevealResponse{
		RoundNumber: outcome.Round.Number,
		Line:        wwLine(*outcome.Round, users),
		Authors:     outcome.Round.Authors(),
		Options:     newWWOptionResponses(*outcome.Round, true),
	}
	return body
}

func (s *Server) newWWAdvanceResponse(ctx context.Context, outcome *wittywars.AdvanceOutcome) wwAdvanceResponse {
	game := outcome.Game
	users := s.wwUsers(ctx, game)

	body := wwAdvanceResponse{
		GameID:       game.ID.String(),
		Phase:        string(game.Phase),
		CurrentRound: game.CurrentRound,
		Status:       string(game.Status),
		Players:      wwPlayers(game, users),
	}

	if outcome.GameOver {
		return body
	}

	if next := game.Round(game.CurrentRound); next != nil {
		body.NextRound = &wwPublicRoundResponse{
			ID:        next.ID.String(),
			Number:    next.Number,
			Line:      wwLine(*next, users),
			SubjectID: next.SubjectUserID,
			Options:   newWWOptionResponses(*next, false),
		}
	}
	return body
}

func (s *Server) AddWittyWarsHandlers() {
	s.mux.HandleFunc("POST /api/v1/witty-wars/lobby", s.requireAuth(s.handleCreateWWLobby))
	// Before {code}, so the literal wins.
	s.mux.HandleFunc("GET /api/v1/witty-wars/lobby/current", s.requireAuth(s.handleGetCurrentWWLobby))

	room := func(next http.HandlerFunc) http.HandlerFunc {
		return s.requireAuth(s.requireGameCode(joincode.WittyWars, next))
	}

	s.mux.HandleFunc("GET /api/v1/witty-wars/lobby/{code}", room(s.handleGetWWLobby))
	s.mux.HandleFunc("PATCH /api/v1/witty-wars/lobby/{code}", room(s.handleUpdateWWLobbySettings))
	s.mux.HandleFunc("DELETE /api/v1/witty-wars/lobby/{code}", room(s.handleDeleteWWLobby))
	s.mux.HandleFunc("POST /api/v1/witty-wars/lobby/{code}/players", room(s.handleJoinWWLobby))
	s.mux.HandleFunc("DELETE /api/v1/witty-wars/lobby/{code}/players/me", room(s.handleLeaveWWLobby))
	s.mux.HandleFunc("POST /api/v1/witty-wars/lobby/{code}/start", room(s.handleStartWWLobby))
	s.mux.HandleFunc("POST /api/v1/witty-wars/lobby/{code}/rematch", room(s.handleRematchWWLobby))
	s.mux.HandleFunc("POST /api/v1/witty-wars/lobby/{code}/abandon", room(s.handleAbandonWWLobby))

	s.mux.HandleFunc("GET /api/v1/witty-wars/game/{gameID}", s.requireAuth(s.handleGetWWGame))
	s.mux.HandleFunc("POST /api/v1/witty-wars/game/{gameID}/answers", s.requireAuth(s.handleSubmitWWAnswers))
	s.mux.HandleFunc("POST /api/v1/witty-wars/game/{gameID}/votes", s.requireAuth(s.handleCastWWVote))
	s.mux.HandleFunc("POST /api/v1/witty-wars/game/{gameID}/advance", s.requireAuth(s.handleAdvanceWWRound))
}

// wwCaller is the authenticated user, or a 500 written for a route that was reached without one.
func (s *Server) wwCaller(w http.ResponseWriter, r *http.Request, handler string) (string, bool) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error(handler + " reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
	return userID, ok
}

// wwGameID is the path's game id, or a 404 written for one that cannot name a game.
func wwGameID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return uuid.Nil, false
	}
	return gameID, true
}

func (s *Server) handleCreateWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleCreateWWLobby")
	if !ok {
		return
	}

	req, problems, err := decode[wwNewLobbyRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	lobby, err := s.wittyWars.CreateLobby(r.Context(), userID, localeFrom(Deref(req.Locale, ""), r), wittywars.WWGameMode(Deref(req.GameMode, "")))
	if err != nil {
		s.writeWWLobbyError(w, "create witty wars lobby", err)
		return
	}

	writeJSON(w, http.StatusCreated, s.newWWLobbyResponse(r.Context(), lobby))
}

func (s *Server) handleGetWWLobby(w http.ResponseWriter, r *http.Request) {
	lobby, err := s.wittyWars.Lobby(r.Context(), lobbyCode(r))
	if err != nil {
		s.writeWWLobbyError(w, "get witty wars lobby", err)
		return
	}
	writeJSON(w, http.StatusOK, s.newWWLobbyResponse(r.Context(), lobby))
}

func (s *Server) handleGetCurrentWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleGetCurrentWWLobby")
	if !ok {
		return
	}

	lobby, err := s.wittyWars.CurrentLobby(r.Context(), userID)
	if errors.Is(err, wittywars.ErrLobbyNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		s.writeWWLobbyError(w, "current witty wars lobby", err)
		return
	}
	writeJSON(w, http.StatusOK, s.newWWLobbyResponse(r.Context(), lobby))
}

func (s *Server) handleJoinWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleJoinWWLobby")
	if !ok {
		return
	}
	code := lobbyCode(r)

	lobby, err := s.wittyWars.JoinLobby(r.Context(), code, userID)
	if err != nil {
		s.writeWWLobbyError(w, "join witty wars lobby", err)
		return
	}

	s.linkLobbyFriends(r.Context(), userID, lobbyRoster(lobby.Players, func(p wittywars.WWLobbyPlayer) string { return p.UserID }))

	body := s.newWWLobbyResponse(r.Context(), lobby)
	s.publishWWLobby(code, body)
	writeJSON(w, http.StatusOK, body)
}

func (s *Server) handleUpdateWWLobbySettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleUpdateWWLobbySettings")
	if !ok {
		return
	}

	req, invalid, err := decode[wwLobbySettingsRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(invalid) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": invalid})
		return
	}

	code := lobbyCode(r)

	current, err := s.wittyWars.Lobby(r.Context(), code)
	if err != nil {
		s.writeWWLobbyError(w, "update witty wars lobby settings", err)
		return
	}

	lobby, problems, err := s.wittyWars.UpdateLobbySettings(r.Context(), code, userID, wittywars.LobbySettings{
		GameMode:         wittywars.WWGameMode(Deref(req.GameMode, string(current.GameMode))),
		Locale:           localeFrom(Deref(req.Locale, current.Locale.String()), r),
		AnswersPerPlayer: Deref(req.AnswersPerPlayer, current.AnswersPerPlayer),
	})
	if err != nil {
		s.writeWWLobbyError(w, "update witty wars lobby settings", err)
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	body := s.newWWLobbyResponse(r.Context(), lobby)
	s.publishWWLobby(code, body)
	writeJSON(w, http.StatusOK, body)
}

func (s *Server) handleLeaveWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleLeaveWWLobby")
	if !ok {
		return
	}
	code := lobbyCode(r)

	if err := s.wittyWars.LeaveLobby(r.Context(), code, userID); err != nil {
		s.writeWWLobbyError(w, "leave witty wars lobby", err)
		return
	}

	if lobby, err := s.wittyWars.Lobby(r.Context(), code); err == nil {
		s.publishWWLobby(code, s.newWWLobbyResponse(r.Context(), lobby))
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleDeleteWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleDeleteWWLobby")
	if !ok {
		return
	}
	code := lobbyCode(r)

	if err := s.wittyWars.DeleteLobby(r.Context(), code, userID); err != nil {
		s.writeWWLobbyError(w, "delete witty wars lobby", err)
		return
	}

	s.publishWWLobbyClosed(code)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleStartWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleStartWWLobby")
	if !ok {
		return
	}
	code := lobbyCode(r)

	lobby, game, err := s.wittyWars.StartLobby(r.Context(), code, userID)
	if err != nil {
		s.writeWWLobbyError(w, "start witty wars lobby", err)
		return
	}

	body := s.newWWLobbyResponse(r.Context(), lobby)
	s.publishWWGameStarted(code, game.ID.String(), body)
	writeJSON(w, http.StatusOK, body)
}

func (s *Server) handleRematchWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleRematchWWLobby")
	if !ok {
		return
	}
	code := lobbyCode(r)

	next, err := s.wittyWars.Rematch(r.Context(), code, userID)
	if err != nil {
		s.writeWWLobbyError(w, "rematch witty wars lobby", err)
		return
	}

	s.publishWWRematch(code, next.ID)
	writeJSON(w, http.StatusCreated, s.newWWLobbyResponse(r.Context(), next))
}

func (s *Server) handleAbandonWWLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleAbandonWWLobby")
	if !ok {
		return
	}
	code := lobbyCode(r)

	if err := s.wittyWars.AbandonLobby(r.Context(), code, userID); err != nil {
		s.writeWWLobbyError(w, "abandon witty wars lobby", err)
		return
	}

	s.publishWWLobbyClosed(code)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleGetWWGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleGetWWGame")
	if !ok {
		return
	}
	gameID, ok := wwGameID(w, r)
	if !ok {
		return
	}

	game, err := s.wittyWars.Game(r.Context(), gameID, userID)
	if err != nil {
		s.writeWWPlayError(w, "get witty wars game", err)
		return
	}
	writeJSON(w, http.StatusOK, s.newWWGameResponse(r.Context(), game, userID))
}

// handleSubmitWWAnswers takes every answer a player owes in one request, and files all of them or none.
func (s *Server) handleSubmitWWAnswers(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleSubmitWWAnswers")
	if !ok {
		return
	}
	gameID, ok := wwGameID(w, r)
	if !ok {
		return
	}

	req, problems, err := decode[wwSubmitAnswersRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	answers := make([]wittywars.RoundAnswer, 0, len(req.Answers))
	for _, answer := range req.Answers {
		answers = append(answers, wittywars.RoundAnswer{RoundNumber: answer.RoundNumber, Answer: answer.Answer})
	}

	outcome, err := s.wittyWars.SubmitAnswers(r.Context(), wittywars.SubmitAnswersInput{
		GameID:  gameID,
		UserID:  userID,
		Answers: answers,
	})
	if err != nil {
		s.writeWWPlayError(w, "submit witty wars answers", err)
		return
	}

	body := newWWAnswerResponse(outcome)
	s.publishWWAnswerProgress(outcome.Game.LobbyID, body)
	if outcome.VotingOpened {
		s.publishWWVotingStarted(outcome.Game.LobbyID, outcome.Game.ID.String())
	}

	writeJSON(w, http.StatusCreated, body)
}

func (s *Server) handleCastWWVote(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleCastWWVote")
	if !ok {
		return
	}
	gameID, ok := wwGameID(w, r)
	if !ok {
		return
	}

	req, problems, err := decode[wwCastVoteRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.wittyWars.CastVote(r.Context(), wittywars.CastVoteInput{
		GameID:      gameID,
		UserID:      userID,
		RoundNumber: req.RoundNumber,
		Slot:        req.Slot,
	})
	if err != nil {
		s.writeWWPlayError(w, "cast witty wars vote", err)
		return
	}

	body := s.newWWVoteResponse(r.Context(), outcome)
	s.publishWWVote(outcome.Game.LobbyID, body)
	writeJSON(w, http.StatusCreated, body)
}

func (s *Server) handleAdvanceWWRound(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.wwCaller(w, r, "handleAdvanceWWRound")
	if !ok {
		return
	}
	gameID, ok := wwGameID(w, r)
	if !ok {
		return
	}

	req, problems, err := decode[wwAdvanceRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.wittyWars.Advance(r.Context(), wittywars.AdvanceInput{
		GameID:      gameID,
		UserID:      userID,
		RoundNumber: req.RoundNumber,
	})
	if err != nil {
		s.writeWWPlayError(w, "advance witty wars round", err)
		return
	}

	body := s.newWWAdvanceResponse(r.Context(), outcome)
	// Only the tap that actually moved the table tells the room.
	if outcome.Advanced {
		s.publishWWRoundAdvanced(outcome.Game.LobbyID, body)
	}
	writeJSON(w, http.StatusCreated, body)
}

func (s *Server) writeWWLobbyError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, wittywars.ErrLobbyNotFound):
		writeErrorCode(w, http.StatusNotFound, "lobby_not_found", "that room does not exist")
	case errors.Is(err, wittywars.ErrNotHost):
		writeErrorCode(w, http.StatusForbidden, "not_host", "only the host may do that")
	case errors.Is(err, wittywars.ErrLobbyFull):
		writeErrorCode(w, http.StatusConflict, "lobby_full", "that room is full")
	case errors.Is(err, wittywars.ErrLobbyStarted):
		writeErrorCode(w, http.StatusConflict, "lobby_started", "that game has already started")
	case errors.Is(err, wittywars.ErrNotEnoughPlayers):
		writeErrorCode(w, http.StatusConflict, "not_enough_players", "you need more players to start")
	case errors.Is(err, wittywars.ErrTooManyPlayers):
		writeErrorCode(w, http.StatusConflict, "too_many_players", "that is too many players to start")
	case errors.Is(err, wittywars.ErrGameNotOver):
		writeErrorCode(w, http.StatusConflict, "game_not_over", "that game is still being played")
	case errors.Is(err, wittywars.ErrNotEnoughContent):
		s.log.Error(what, "err", err)
		writeErrorCode(w, http.StatusInternalServerError, "no_content", "there are not enough prompts to play")
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

func (s *Server) writeWWPlayError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, wittywars.ErrGameNotFound):
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
	case errors.Is(err, wittywars.ErrRoundNotFound):
		writeErrorCode(w, http.StatusNotFound, "round_not_found", "that prompt is not in this game")
	case errors.Is(err, wittywars.ErrGameFinished):
		writeErrorCode(w, http.StatusConflict, "game_finished", "this game is over")
	case errors.Is(err, wittywars.ErrNotHost):
		writeErrorCode(w, http.StatusForbidden, "not_host", "only the host may do that")
	case errors.Is(err, wittywars.ErrWrongPhase):
		writeErrorCode(w, http.StatusConflict, "wrong_phase", "the table is not doing that yet")
	case errors.Is(err, wittywars.ErrWrongRound):
		writeErrorCode(w, http.StatusConflict, "wrong_round", "the table has moved on")
	case errors.Is(err, wittywars.ErrNotYourPrompt):
		writeErrorCode(w, http.StatusForbidden, "not_your_prompt", "that prompt was not dealt to you")
	case errors.Is(err, wittywars.ErrAlreadyAnswered):
		writeErrorCode(w, http.StatusConflict, "already_answered", "you have already sent your answers")
	case errors.Is(err, wittywars.ErrIncompleteAnswers):
		writeErrorCode(w, http.StatusUnprocessableEntity, "incomplete_answers", "send one answer for every prompt dealt to you")
	case errors.Is(err, wittywars.ErrAnswerTooLong):
		writeErrorCode(w, http.StatusUnprocessableEntity, "answer_too_long", fmt.Sprintf("an answer can be at most %d characters", wittywars.MaxAnswerLength))
	case errors.Is(err, wittywars.ErrAlreadyVoted):
		writeErrorCode(w, http.StatusConflict, "already_voted", "you have already voted on that one")
	case errors.Is(err, wittywars.ErrCannotVoteOwnPrompt):
		writeErrorCode(w, http.StatusForbidden, "cannot_vote_own_prompt", "you wrote for that one, so you cannot vote on it")
	case errors.Is(err, wittywars.ErrOptionNotFound):
		writeErrorCode(w, http.StatusNotFound, "option_not_found", "there is nothing in that slot")
	case errors.Is(err, wittywars.ErrInvalidInput):
		writeErrorCode(w, http.StatusUnprocessableEntity, "invalid_answer", err.Error())
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

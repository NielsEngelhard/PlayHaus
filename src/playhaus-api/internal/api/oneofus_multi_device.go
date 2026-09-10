package api

import (
	"context"
	"errors"
	"net/http"
	"slices"

	"github.com/google/uuid"

	"playhaus-api/internal/oneofus"
)

// One of Us on the wire: answers are identified by shuffled slot until the round is revealed, and a living player is never told which side of the table they are on.

// oouNewLobbyRequest is what opens a room.
type oouNewLobbyRequest struct {
	Locale *string `json:"locale"`
}

func (oouNewLobbyRequest) Validate() map[string]string { return nil }

// oouLobbySettingsRequest is what the host gets to decide, in the same vocabulary the single-device setup screen already sends.
type oouLobbySettingsRequest struct {
	WordOnly *bool `json:"wordOnly"`
	// EnabledRoles left out means "leave it as it is", which is why it cannot go through imposterRolesFrom unchecked.
	EnabledRoles []int   `json:"enabledRoles"`
	Locale       *string `json:"locale"`
}

func (oouLobbySettingsRequest) Validate() map[string]string { return nil }

// oouSubmitAnswerRequest is one player's clue for this round.
type oouSubmitAnswerRequest struct {
	RoundNumber int    `json:"roundNumber"`
	Text        string `json:"text"`
}

func (req oouSubmitAnswerRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.RoundNumber < 1 {
		problems["roundNumber"] = "is required"
	}
	if oneofus.NormaliseAnswer(req.Text) == "" {
		problems["text"] = "is required"
	}
	return problems
}

// oouCastVoteRequest names a slot rather than a player.
type oouCastVoteRequest struct {
	RoundNumber int `json:"roundNumber"`
	Slot        int `json:"slot"`
}

func (req oouCastVoteRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.RoundNumber < 1 {
		problems["roundNumber"] = "is required"
	}
	if req.Slot < 0 {
		problems["slot"] = "must not be negative"
	}
	return problems
}

// oouContinueRequest is the round being left behind, not the one being opened.
type oouContinueRequest struct {
	RoundNumber int `json:"roundNumber"`
}

func (req oouContinueRequest) Validate() map[string]string {
	problems := map[string]string{}
	if req.RoundNumber < 1 {
		problems["roundNumber"] = "is required"
	}
	return problems
}

type oouLobbySettingsResponse struct {
	WordOnly     bool   `json:"wordOnly"`
	EnabledRoles []int  `json:"enabledRoles"`
	Locale       string `json:"locale"`
}

// oouLobbyPlayerResponse is somebody in the room, before any role exists to hide.
type oouLobbyPlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	JoinedAt      string `json:"joinedAt"`
}

type oouLobbyResponse struct {
	ID string `json:"id"`
	// Code is what players type in to get here, and is the same string as ID.
	Code string `json:"code"`
	// HostID is whose room it is. The app hides the controls; the server enforces it.
	HostID     string                   `json:"hostId"`
	Status     string                   `json:"status"`
	Settings   oouLobbySettingsResponse `json:"settings"`
	Players    []oouLobbyPlayerResponse `json:"players"`
	MinPlayers int                      `json:"minPlayers"`
	MaxPlayers int                      `json:"maxPlayers"`
	CreatedAt  string                   `json:"createdAt"`
	// GameID is the game to open, set only once the host has started the room.
	GameID string `json:"gameId,omitempty"`
	// RematchCode is the room this one's table has moved on to.
	RematchCode string `json:"rematchCode,omitempty"`
}

// oouGamePlayerResponse is a seat at the table, and carries nothing that depends on who is reading it.
type oouGamePlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	Seat          int    `json:"seat"`
	IsVotedOut    bool   `json:"isVotedOut"`
	IsMayor       bool   `json:"isMayor"`
	VotedOutRound *int   `json:"votedOutRound,omitempty"`
	// Role is omitted rather than nulled while it is still a secret: Civilian is zero, so a present-but-empty field would read as one.
	Role *oneofus.Role `json:"role,omitempty"`
}

// oouAnswerResponse is one thing a voter can pick. Who wrote it arrives only with the reveal.
type oouAnswerResponse struct {
	Slot int    `json:"slot"`
	Text string `json:"text"`

	AuthorID string   `json:"authorId,omitempty"`
	Voters   []string `json:"voters,omitempty"`
}

// oouEliminationResponse is who the round cost, told once it is closed.
type oouEliminationResponse struct {
	UserID           string       `json:"userId"`
	Role             oneofus.Role `json:"role"`
	Votes            int          `json:"votes"`
	TieBrokenByMayor bool         `json:"tieBrokenByMayor"`
}

// oouRoundResponse is the round the table is on, with as much of it told as the phase allows.
type oouRoundResponse struct {
	ID     string `json:"id"`
	Number int    `json:"number"`

	AnswersIn     int `json:"answersIn"`
	AnswersNeeded int `json:"answersNeeded"`
	VotesIn       int `json:"votesIn"`
	VotesNeeded   int `json:"votesNeeded"`

	// Answers are sent once voting has opened, and carry their authors only once the round is revealed.
	Answers []oouAnswerResponse `json:"answers,omitempty"`

	Revealed bool                    `json:"revealed"`
	VotedOut *oouEliminationResponse `json:"votedOut,omitempty"`
}

// oouGameResponse is the board as one player may see it.
type oouGameResponse struct {
	ID       string `json:"id"`
	LobbyID  string `json:"lobbyId"`
	OwnerID  string `json:"ownerId"`
	Locale   string `json:"locale"`
	WordOnly bool   `json:"wordOnly"`

	Phase        string `json:"phase"`
	CurrentRound int    `json:"currentRound"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	CiviliansWon *bool  `json:"civiliansWon,omitempty"`

	// Word and ImposterWord are the pair the whole game was played on, and only a finished game carries them: while it runs they are the secret.
	Word         string `json:"word,omitempty"`
	ImposterWord string `json:"imposterWord,omitempty"`

	// MyPrompt is the reader's own line: the real one, the imposters' one, or nothing at all. It cannot be compared with anybody else's.
	MyPrompt string `json:"myPrompt"`
	// AmNitwit is the whole of what a living player is told about their own role, and matches what the app can already render.
	AmNitwit bool `json:"amNitwit"`
	AmOut    bool `json:"amOut"`
	// MyAnswer and MyVoteSlot are echoed so a reconnect redraws a box the reader had already filled in.
	MyAnswer   string `json:"myAnswer,omitempty"`
	MyVoteSlot *int   `json:"myVoteSlot,omitempty"`

	// MayorID is whoever is wearing the chain now, which is not who was wearing it last round.
	MayorID    string `json:"mayorId,omitempty"`
	MinPlayers int    `json:"minPlayers"`
	MaxPlayers int    `json:"maxPlayers"`

	Players []oouGamePlayerResponse `json:"players"`
	// Round is the one live round. There is no fixed total and nothing reads history.
	Round *oouRoundResponse `json:"round,omitempty"`
}

// oouAnswerProgressResponse is what one answer did: counts, and nothing else. Naming who has written would leak the writing order.
type oouAnswerProgressResponse struct {
	GameID        string `json:"gameId"`
	RoundNumber   int    `json:"roundNumber"`
	Phase         string `json:"phase"`
	AnswersIn     int    `json:"answersIn"`
	AnswersNeeded int    `json:"answersNeeded"`
	// VotingOpened is set on the answer that finished the round's writing.
	VotingOpened bool `json:"votingOpened"`
}

// oouRevealResponse is a closed round with everything told.
type oouRevealResponse struct {
	RoundNumber int                    `json:"roundNumber"`
	Answers     []oouAnswerResponse    `json:"answers"`
	VotedOut    oouEliminationResponse `json:"votedOut"`
}

// oouVoteResponse is what one vote did, and is the same for everybody, which is what lets the voter's own body be the broadcast frame.
type oouVoteResponse struct {
	GameID      string `json:"gameId"`
	RoundNumber int    `json:"roundNumber"`
	VotesIn     int    `json:"votesIn"`
	VotesNeeded int    `json:"votesNeeded"`
	RoundClosed bool   `json:"roundClosed"`
	GameOver    bool   `json:"gameOver"`

	Phase        string `json:"phase"`
	Status       string `json:"status"`
	CiviliansWon *bool  `json:"civiliansWon,omitempty"`
	MayorID      string `json:"mayorId,omitempty"`

	Players []oouGamePlayerResponse `json:"players"`
	Reveal  *oouRevealResponse      `json:"reveal,omitempty"`
}

// oouRoundOpenedResponse is the next round starting, which is the one beat Fake Filler does not have.
type oouRoundOpenedResponse struct {
	GameID        string `json:"gameId"`
	RoundNumber   int    `json:"roundNumber"`
	Phase         string `json:"phase"`
	AnswersNeeded int    `json:"answersNeeded"`
	// Opened is false for everybody who tapped after the first one.
	Opened bool `json:"opened"`
}

func (s *Server) newOOULobbyResponse(ctx context.Context, lobby *oneofus.OOULobby) oouLobbyResponse {
	// By seat, which is the order people walked in -- so the host is the top row.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b oneofus.OOULobbyPlayer) int { return a.Seat - b.Seat })

	ids := make([]string, 0, len(seated))
	for _, player := range seated {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	players := make([]oouLobbyPlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, oouLobbyPlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			JoinedAt:      player.JoinedAt.Format(timeFormat),
		})
	}

	body := oouLobbyResponse{
		ID:     lobby.ID,
		Code:   lobby.ID,
		HostID: lobby.OwnerID,
		Status: string(lobby.Status),
		Settings: oouLobbySettingsResponse{
			WordOnly:     lobby.GameMode == oneofus.Word,
			EnabledRoles: roleNumbers(lobby.EnabledRoles),
			Locale:       lobby.Locale.String(),
		},
		Players: players,
		// Carried rather than hardcoded in the app.
		MinPlayers: oneofus.MinPlayers,
		MaxPlayers: oneofus.MaxPlayers,
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

// roleNumbers is imposterRolesFrom the other way round.
func roleNumbers(roles oneofus.RoleSet) []int {
	values := make([]int, 0, len(roles))
	for _, role := range roles {
		values = append(values, int(role))
	}

	return values
}

// oouRoundVisibility answers the two questions every redaction in this file turns on, and is the only place they are decided.
func oouRoundVisibility(game *oneofus.OOUMultiDeviceGame, number int) (open, revealed bool) {
	// Only the round the table is on is ever sent, so anything else is neither.
	if number != game.CurrentRound {
		return false, false
	}

	switch game.Phase {
	case oneofus.PhaseVote:
		return game.Status == oneofus.GameInProgress, false
	case oneofus.PhaseReveal:
		return false, true
	default:
		// While the table is still writing, nobody's answer has left this process.
		return false, false
	}
}

// newOOUAnswerResponses is the line-up in the order it was shuffled into. revealed is what decides how much of an answer is an answer.
func newOOUAnswerResponses(round *oneofus.OOURound, revealed bool) []oouAnswerResponse {
	sorted := slices.Clone(round.Answers)
	slices.SortFunc(sorted, func(a, b oneofus.OOUAnswer) int { return a.Slot - b.Slot })

	answers := make([]oouAnswerResponse, 0, len(sorted))
	for _, answer := range sorted {
		body := oouAnswerResponse{
			Slot: answer.Slot,
			Text: answer.Text,
		}
		if revealed {
			body.AuthorID = answer.UserID
			body.Voters = round.VotersFor(answer.UserID)
		}
		answers = append(answers, body)
	}

	return answers
}

// newOOUElimination is the round's verdict, or nil for a round still being played.
func newOOUElimination(round *oneofus.OOURound) *oouEliminationResponse {
	if round.EliminatedUserID == nil || round.EliminatedRole == nil {
		return nil
	}

	return &oouEliminationResponse{
		UserID:           *round.EliminatedUserID,
		Role:             *round.EliminatedRole,
		Votes:            round.EliminatedVotes,
		TieBrokenByMayor: round.TieBrokenByMayor,
	}
}

// newOOURoundResponse is the live round, redacted by phase rather than by reader.
func newOOURoundResponse(game *oneofus.OOUMultiDeviceGame, round *oneofus.OOURound) oouRoundResponse {
	open, revealed := oouRoundVisibility(game, round.Number)

	body := oouRoundResponse{
		ID:     round.ID.String(),
		Number: round.Number,
		// The frozen count, so the eliminated are never waited for.
		AnswersIn:     len(round.Answers),
		AnswersNeeded: round.LivingCount,
		VotesIn:       len(round.Votes),
		VotesNeeded:   round.LivingCount,
		Revealed:      revealed,
	}

	if open || revealed {
		body.Answers = newOOUAnswerResponses(round, revealed)
	}
	if revealed {
		body.VotedOut = newOOUElimination(round)
	}

	return body
}

func (s *Server) oouPlayers(ctx context.Context, game *oneofus.OOUMultiDeviceGame) []oouGamePlayerResponse {
	seated := slices.Clone(game.Players)
	slices.SortFunc(seated, func(a, b oneofus.OOUGamePlayer) int { return a.Seat - b.Seat })

	ids := make([]string, 0, len(seated))
	for _, player := range seated {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	// A role is public once its owner is out of the game, or once the game itself is done.
	finished := game.Status == oneofus.GameCompleted

	players := make([]oouGamePlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)

		body := oouGamePlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			Seat:          player.Seat,
			IsVotedOut:    player.IsVotedOut,
			IsMayor:       player.IsMayor,
			VotedOutRound: player.VotedOutRound,
		}
		if player.IsVotedOut || finished {
			role := player.Role
			body.Role = &role
		}

		players = append(players, body)
	}

	return players
}

// oouMayorID is whoever is wearing the chain, or the empty string for a table that has nobody wearing it.
func oouMayorID(game *oneofus.OOUMultiDeviceGame) string {
	for _, player := range game.Players {
		if player.IsMayor && !player.IsVotedOut {
			return player.UserID
		}
	}

	return ""
}

func (s *Server) newOOUGameResponse(ctx context.Context, game *oneofus.OOUMultiDeviceGame, userID string) oouGameResponse {
	body := oouGameResponse{
		ID:           game.ID.String(),
		LobbyID:      game.LobbyID,
		OwnerID:      game.OwnerID,
		Locale:       game.Locale.String(),
		WordOnly:     game.GameMode == oneofus.Word,
		Phase:        string(game.Phase),
		CurrentRound: game.CurrentRound,
		Status:       string(game.Status),
		CreatedAt:    game.CreatedAt.Format(timeFormat),
		CiviliansWon: game.CiviliansWon,
		MayorID:      oouMayorID(game),
		MinPlayers:   oneofus.MinPlayers,
		MaxPlayers:   oneofus.MaxPlayers,
		Players:      s.oouPlayers(ctx, game),
	}

	// The pair is public once the game is over, exactly as the single-device result screen shows it.
	if game.Status == oneofus.GameCompleted {
		body.Word = game.ActualQuestion
		body.ImposterWord = game.ImposterQuestion
	}

	if me := game.Player(userID); me != nil {
		body.MyPrompt = oneofus.PromptFor(me.Role, game.ActualQuestion, game.ImposterQuestion)
		body.AmNitwit = !me.Role.KnowsAWord()
		body.AmOut = me.IsVotedOut
	}

	round := game.Round(game.CurrentRound)
	if round == nil {
		return body
	}

	live := newOOURoundResponse(game, round)
	body.Round = &live

	// The reader's own answer, and only ever the reader's own.
	if mine := round.AnswerBy(userID); mine != nil {
		body.MyAnswer = mine.Text
	}
	if vote := round.VoteBy(userID); vote != nil {
		if voted := round.AnswerBy(vote.AccusedUserID); voted != nil && voted.Slot != oneofus.UnassignedSlot {
			slot := voted.Slot
			body.MyVoteSlot = &slot
		}
	}

	return body
}

func newOOUAnswerProgressResponse(outcome *oneofus.AnswerOutcome) oouAnswerProgressResponse {
	return oouAnswerProgressResponse{
		GameID:        outcome.Game.ID.String(),
		RoundNumber:   outcome.RoundNumber,
		Phase:         string(outcome.Game.Phase),
		AnswersIn:     outcome.Answered,
		AnswersNeeded: outcome.Expected,
		VotingOpened:  outcome.VotingOpened,
	}
}

func (s *Server) newOOUVoteResponse(ctx context.Context, outcome *oneofus.VoteOutcome) oouVoteResponse {
	game := outcome.Game

	body := oouVoteResponse{
		GameID:       game.ID.String(),
		RoundNumber:  outcome.RoundNumber,
		VotesIn:      outcome.Votes,
		VotesNeeded:  outcome.VotesNeeded,
		RoundClosed:  outcome.RoundClosed,
		GameOver:     outcome.GameOver,
		Phase:        string(game.Phase),
		Status:       string(game.Status),
		CiviliansWon: game.CiviliansWon,
		MayorID:      oouMayorID(game),
		Players:      s.oouPlayers(ctx, game),
	}

	if !outcome.RoundClosed || outcome.Round == nil {
		return body
	}

	verdict := newOOUElimination(outcome.Round)
	if verdict == nil {
		return body
	}

	body.Reveal = &oouRevealResponse{
		RoundNumber: outcome.Round.Number,
		Answers:     newOOUAnswerResponses(outcome.Round, true),
		VotedOut:    *verdict,
	}

	return body
}

func newOOURoundOpenedResponse(outcome *oneofus.ContinueOutcome) oouRoundOpenedResponse {
	body := oouRoundOpenedResponse{
		GameID:      outcome.Game.ID.String(),
		RoundNumber: outcome.Game.CurrentRound,
		Phase:       string(outcome.Game.Phase),
		Opened:      outcome.Opened,
	}

	if round := outcome.Game.Round(outcome.Game.CurrentRound); round != nil {
		body.AnswersNeeded = round.LivingCount
	}

	return body
}

func (s *Server) handleCreateOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreateOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, _, err := decode[oouNewLobbyRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	lobby, err := s.oneOfUs.CreateLobby(r.Context(), userID, localeFrom(Deref(req.Locale, ""), r))
	if err != nil {
		s.writeOOULobbyError(w, "create one of us lobby", err)
		return
	}

	// Nothing is published: the room is one request old and there is nobody connected to it yet to tell.
	writeJSON(w, http.StatusCreated, s.newOOULobbyResponse(r.Context(), lobby))
}

func (s *Server) handleGetCurrentOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetCurrentOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	lobby, err := s.oneOfUs.CurrentLobby(r.Context(), userID)
	if errors.Is(err, oneofus.ErrLobbyNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		s.writeOOULobbyError(w, "current one of us lobby", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newOOULobbyResponse(r.Context(), lobby))
}

// handleGetOOULobby is the snapshot the room screen opens on.
func (s *Server) handleGetOOULobby(w http.ResponseWriter, r *http.Request) {
	lobby, err := s.oneOfUs.Lobby(r.Context(), lobbyCode(r))
	if err != nil {
		s.writeOOULobbyError(w, "get one of us lobby", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newOOULobbyResponse(r.Context(), lobby))
}

func (s *Server) handleJoinOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleJoinOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	lobby, err := s.oneOfUs.JoinLobby(r.Context(), code, userID)
	if err != nil {
		s.writeOOULobbyError(w, "join one of us lobby", err)
		return
	}

	body := s.newOOULobbyResponse(r.Context(), lobby)
	s.publishOOULobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

func (s *Server) handleUpdateOOULobbySettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleUpdateOOULobbySettings reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, invalid, err := decode[oouLobbySettingsRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(invalid) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": invalid})
		return
	}

	code := lobbyCode(r)

	// The room has to be read before a knob the card left out can default to what it is already playing.
	current, err := s.oneOfUs.Lobby(r.Context(), code)
	if err != nil {
		s.writeOOULobbyError(w, "update one of us lobby settings", err)
		return
	}

	settings := oneofus.LobbySettings{
		GameMode:     current.GameMode,
		Locale:       localeFrom(Deref(req.Locale, current.Locale.String()), r),
		EnabledRoles: current.EnabledRoles,
	}
	if req.WordOnly != nil {
		settings.GameMode = oneofus.ModeFor(*req.WordOnly)
	}
	if req.EnabledRoles != nil {
		settings.EnabledRoles = imposterRolesFrom(req.EnabledRoles)
	}

	lobby, problems, err := s.oneOfUs.UpdateLobbySettings(r.Context(), code, userID, settings)
	if err != nil {
		s.writeOOULobbyError(w, "update one of us lobby settings", err)
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	body := s.newOOULobbyResponse(r.Context(), lobby)
	s.publishOOULobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

// handleLeaveOOULobby gives a seat back without closing the room.
func (s *Server) handleLeaveOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleLeaveOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.oneOfUs.LeaveLobby(r.Context(), code, userID); err != nil {
		s.writeOOULobbyError(w, "leave one of us lobby", err)
		return
	}

	// The room as it stands without them.
	if lobby, err := s.oneOfUs.Lobby(r.Context(), code); err == nil {
		s.publishOOULobby(code, s.newOOULobbyResponse(r.Context(), lobby))
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleDeleteOOULobby closes a room for good. Host only.
func (s *Server) handleDeleteOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleDeleteOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.oneOfUs.DeleteLobby(r.Context(), code, userID); err != nil {
		s.writeOOULobbyError(w, "delete one of us lobby", err)
		return
	}

	// Told rather than left to be discovered.
	s.publishOOULobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

// handleStartOOULobby deals the table.
func (s *Server) handleStartOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleStartOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	lobby, game, err := s.oneOfUs.StartLobby(r.Context(), code, userID)
	if err != nil {
		s.writeOOULobbyError(w, "start one of us lobby", err)
		return
	}

	body := s.newOOULobbyResponse(r.Context(), lobby)
	// The id only: every device has to fetch its own board, because no two of them are the same.
	s.publishOOUGameStarted(code, game.ID.String(), body)

	writeJSON(w, http.StatusOK, body)
}

// handleRematchOOULobby opens the next room for a table that has just finished.
func (s *Server) handleRematchOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleRematchOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	next, err := s.oneOfUs.Rematch(r.Context(), code, userID)
	if err != nil {
		s.writeOOULobbyError(w, "rematch one of us lobby", err)
		return
	}

	// Announced on the room they are all still sitting in.
	s.publishOOURematch(code, next.ID)

	writeJSON(w, http.StatusCreated, s.newOOULobbyResponse(r.Context(), next))
}

// handleAbandonOOULobby throws a room and its game away for good. Host only.
func (s *Server) handleAbandonOOULobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleAbandonOOULobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.oneOfUs.AbandonLobby(r.Context(), code, userID); err != nil {
		s.writeOOULobbyError(w, "abandon one of us lobby", err)
		return
	}

	s.publishOOULobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleGetOOUGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetOOUGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		// An unparseable id cannot name a game, and saying so is the same answer as "not your table".
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return
	}

	game, err := s.oneOfUs.MultiDeviceGame(r.Context(), gameID, userID)
	if err != nil {
		s.writeOOUPlayError(w, "get one of us game", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newOOUGameResponse(r.Context(), game, userID))
}

func (s *Server) handleSubmitOOUAnswer(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleSubmitOOUAnswer reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return
	}

	req, problems, err := decode[oouSubmitAnswerRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.oneOfUs.SubmitAnswer(r.Context(), oneofus.SubmitAnswerInput{
		GameID:      gameID,
		UserID:      userID,
		RoundNumber: req.RoundNumber,
		Text:        req.Text,
	})
	if err != nil {
		s.writeOOUPlayError(w, "submit one of us answer", err)
		return
	}

	body := newOOUAnswerProgressResponse(outcome)
	// Counts only, so the same body goes to the table as to the writer.
	s.publishOOUAnswerProgress(outcome.Game.LobbyID, body)

	if outcome.VotingOpened {
		// The id only: myVoteSlot and the reader's own answer make a round payload unbroadcastable.
		s.publishOOUVotingStarted(outcome.Game.LobbyID, outcome.Game.ID.String(), outcome.RoundNumber)
	}

	writeJSON(w, http.StatusCreated, body)
}

func (s *Server) handleCastOOUVote(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCastOOUVote reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return
	}

	req, problems, err := decode[oouCastVoteRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.oneOfUs.CastVote(r.Context(), oneofus.CastVoteInput{
		GameID:      gameID,
		UserID:      userID,
		RoundNumber: req.RoundNumber,
		Slot:        req.Slot,
	})
	if err != nil {
		s.writeOOUPlayError(w, "cast one of us vote", err)
		return
	}

	body := s.newOOUVoteResponse(r.Context(), outcome)
	// Everybody watching gets exactly what the voter got back.
	s.publishOOUVote(outcome.Game.LobbyID, body)

	writeJSON(w, http.StatusCreated, body)
}

func (s *Server) handleContinueOOURound(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleContinueOOURound reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
		return
	}

	req, problems, err := decode[oouContinueRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.oneOfUs.ContinueToNextRound(r.Context(), oneofus.ContinueInput{
		GameID:      gameID,
		UserID:      userID,
		RoundNumber: req.RoundNumber,
	})
	if err != nil {
		s.writeOOUPlayError(w, "continue one of us game", err)
		return
	}

	body := newOOURoundOpenedResponse(outcome)
	if outcome.Opened {
		// Only the caller who actually moved the game tells the room, so nobody gets the frame twice.
		s.publishOOURoundOpened(outcome.Game.LobbyID, body)
	}

	writeJSON(w, http.StatusCreated, body)
}

// writeOOULobbyError turns a room error into a status and a machine-readable tag.
func (s *Server) writeOOULobbyError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, oneofus.ErrLobbyNotFound):
		writeErrorCode(w, http.StatusNotFound, "lobby_not_found", "that room does not exist")
	case errors.Is(err, oneofus.ErrNotHost):
		writeErrorCode(w, http.StatusForbidden, "not_host", "only the host may do that")
	case errors.Is(err, oneofus.ErrLobbyFull):
		writeErrorCode(w, http.StatusConflict, "lobby_full", "that room is full")
	case errors.Is(err, oneofus.ErrLobbyStarted):
		writeErrorCode(w, http.StatusConflict, "lobby_started", "that game has already started")
	case errors.Is(err, oneofus.ErrNotEnoughPlayers):
		writeErrorCode(w, http.StatusConflict, "not_enough_players", "you need more players to start")
	case errors.Is(err, oneofus.ErrTooManyPlayers):
		writeErrorCode(w, http.StatusConflict, "too_many_players", "that is too many players to start")
	case errors.Is(err, oneofus.ErrGameNotOver):
		writeErrorCode(w, http.StatusConflict, "game_not_over", "that game is still being played")
	case errors.Is(err, oneofus.ErrInvalidInput):
		writeErrorCode(w, http.StatusUnprocessableEntity, "invalid_settings", err.Error())
	case errors.Is(err, oneofus.ErrNoContent):
		// A short data file, which is a broken build rather than a broken request.
		s.log.Error(what, "err", err)
		writeErrorCode(w, http.StatusInternalServerError, "no_content", "there are not enough prompts to play")
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

// writeOOUPlayError is the refusals a board produces: reading it, writing into it, voting on it.
func (s *Server) writeOOUPlayError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, oneofus.ErrGameNotFound):
		// Not at the table reads the same as not a game.
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
	case errors.Is(err, oneofus.ErrRoundNotFound):
		writeErrorCode(w, http.StatusNotFound, "round_not_found", "that round is not in this game")
	case errors.Is(err, oneofus.ErrGameFinished):
		writeErrorCode(w, http.StatusConflict, "game_finished", "this game is over")
	case errors.Is(err, oneofus.ErrWrongPhase):
		writeErrorCode(w, http.StatusConflict, "wrong_phase", "the table is not doing that yet")
	case errors.Is(err, oneofus.ErrWrongRound):
		writeErrorCode(w, http.StatusConflict, "wrong_round", "the table has moved on")
	case errors.Is(err, oneofus.ErrVotedOut):
		writeErrorCode(w, http.StatusForbidden, "voted_out", "you have been voted out")
	case errors.Is(err, oneofus.ErrAlreadyAnswered):
		writeErrorCode(w, http.StatusConflict, "already_answered", "you have already answered this round")
	case errors.Is(err, oneofus.ErrAlreadyVoted):
		writeErrorCode(w, http.StatusConflict, "already_voted", "you have already voted this round")
	case errors.Is(err, oneofus.ErrCannotVoteSelf):
		writeErrorCode(w, http.StatusForbidden, "cannot_vote_self", "you wrote that one, so you cannot vote for it")
	case errors.Is(err, oneofus.ErrAnswerNotFound):
		writeErrorCode(w, http.StatusNotFound, "answer_not_found", "there is nothing in that slot")
	case errors.Is(err, oneofus.ErrInvalidInput):
		writeErrorCode(w, http.StatusUnprocessableEntity, "invalid_answer", err.Error())
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

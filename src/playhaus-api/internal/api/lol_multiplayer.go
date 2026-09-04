package api

import (
	"context"
	"errors"
	"net/http"
	"slices"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/user"

	"github.com/google/uuid"
)

// The multiplayer half of League of Letters on the wire: the room a game is set up
// in, the game it becomes, and one row landing on the shared board.
//
// The response shapes live here rather than next to the solo ones because the
// socket sends the same structs -- a lobby in a frame and a lobby in a response body
// have to be the same lobby -- and lol_realtime.go is where the frames
// are. The app mirrors all of this in api/calls/league-of-letters-lobby.ts and
// api/calls/league-of-letters.ts; keep the three in step.

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

// lobbySettingsRequest is what the host gets to decide, on the way in.
//
// Validate says nothing about the word length: those bounds are the game's rules rather
// than the wire's, and the service already owns them. Checking them twice would be two
// places to change one rule -- there is exactly one, lol.ValidWordLength, and both
// LobbySettings.validate and the solo path ask it.
//
// The clock is a pointer because this is a PATCH and a plain int cannot tell "leave it
// alone" from "ten seconds a turn": absent means the room keeps the default, and a
// number that is present is held to the same bounds the picker offers.
type lobbySettingsRequest struct {
	WordLength      int     `json:"wordLength"`
	Locale          *string `json:"locale"`
	SecondsPerGuess *int    `json:"secondsPerGuess"`
}

func (req lobbySettingsRequest) Validate() map[string]string {
	if req.SecondsPerGuess == nil {
		return nil
	}

	if *req.SecondsPerGuess < lol.MinSecondsPerTurn || *req.SecondsPerGuess > lol.MaxSecondsPerTurn {
		return map[string]string{"SecondsPerGuess": "Exceeds min or max value"}
	}

	return nil
}

// newLobbyRequest is what opens a room: a language, and deliberately nowhere to put
// a word length. decode rejects unknown fields, so a client still sending settings
// here -- one written against the old contract -- is refused rather than quietly
// having them dropped and believing the room is set up the way it asked.
type newLobbyRequest struct {
	Locale *string `json:"locale"`
}

func (newLobbyRequest) Validate() map[string]string { return nil }

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

type lobbySettingsResponse struct {
	Locale         string `json:"locale"`
	WordLength     int    `json:"wordLength"`
	SecondsPerTurn int    `json:"secondsPerTurn"`
}

// lobbyPlayerResponse is somebody in the room, and is deliberately the front half of
// gamePlayerResponse -- same ids, same swatch -- so a player waiting and the
// scoreboard row they turn into are the same person to whatever draws one.
type lobbyPlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	JoinedAt      string `json:"joinedAt"`
}

type lobbyResponse struct {
	ID string `json:"id"`
	// Code is what players type in to get here, and is the same string as ID: a room
	// has nothing anybody looks it up by except its code.
	Code string `json:"code"`
	// HostID is whose room it is. The app hides the controls; the server is what
	// enforces it.
	HostID    string                `json:"hostId"`
	Status    string                `json:"status"`
	Settings  lobbySettingsResponse `json:"settings"`
	Players   []lobbyPlayerResponse `json:"players"`
	CreatedAt string                `json:"createdAt"`
	// GameID is the game to open, and is only set once the host has started the
	// room. Its appearing is how everybody else finds out.
	GameID string `json:"gameId,omitempty"`
	// RematchCode is the room this one's table has moved on to, once the game was
	// over and the host pressed play again. Carried on the snapshot as well as
	// announced over the socket, so a player whose connection blipped over the
	// announcement is still taken across by the next read.
	RematchCode string `json:"rematchCode,omitempty"`
}

type gamePlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	Score         int    `json:"score"`
	JoinedAt      string `json:"joinedAt"`
}

// multiplayerGameResponse is the board, the table and the clock.
//
// Every field the solo response has, in the same place, plus the three a solo game
// has no use for: which sort of game this is, who else is at it, and who is up. The
// app draws both from one Game type, so a field that moved here would be a field
// that moved for solo too.
type multiplayerGameResponse struct {
	ID         string `json:"id"`
	Mode       string `json:"mode"`
	OwnerID    string `json:"ownerId"`
	Locale     string `json:"locale"`
	WordLength int    `json:"wordLength"`
	MaxGuesses int    `json:"maxGuesses"`
	// CurrentRound is the round being played, counting from 1.
	CurrentRound int `json:"currentRound"`
	TotalRounds  int `json:"totalRounds"`
	// Score is the reader's own, so the board can show it without picking itself out
	// of Players first.
	Score     int                  `json:"score"`
	Status    string               `json:"status"`
	CreatedAt string               `json:"createdAt"`
	Rounds    []roundResponse      `json:"rounds"`
	Players   []gamePlayerResponse `json:"players"`
	// Turn is the same shape the socket's turn frame carries, because it is the same
	// turn: a board that has just been fetched and a board that has just been told
	// must not disagree about who is up.
	Turn turnPayload `json:"turn"`
}

// multiplayerGuessResponse is what one row did.
//
// Not the whole game, for the same reason the solo guess response is not: every
// client already holds the board, and resending it on every word would make the
// answer grow with the game. What a client cannot work out for itself is what this
// row revealed, what it did to the scores, and whose turn it is now.
//
// The same struct goes back to the player who guessed and out to everybody watching,
// so the two apply the same update from the same numbers.
type multiplayerGuessResponse struct {
	Guess guessResponse `json:"guess"`
	// RoundNumber is the round the row was played into, which is not the round the
	// game is on afterwards if this row ended it.
	RoundNumber int  `json:"roundNumber"`
	Solved      bool `json:"solved"`
	RoundOver   bool `json:"roundOver"`
	GameOver    bool `json:"gameOver"`
	// Word is the answer, told only once the round it belonged to is over.
	Word         string               `json:"word,omitempty"`
	CurrentRound int                  `json:"currentRound"`
	Players      []gamePlayerResponse `json:"players"`
	Turn         turnPayload          `json:"turn"`
	// NextRound is the board this row opened, when it ended the one before it. Sent
	// with the row so nobody has to refetch the game to draw the next hint.
	NextRound *roundResponse `json:"nextRound,omitempty"`
}

// ---------------------------------------------------------------------------
// Building them
// ---------------------------------------------------------------------------

// usersByID looks up the names and swatches a roster is drawn with.
//
// A failure here is logged rather than returned: the room is what was asked for, and
// a player list with a name missing is a better answer than a lobby screen that will
// not open because the account service hiccuped.
func (s *Server) usersByID(ctx context.Context, ids []string) map[string]*user.User {
	if len(ids) == 0 {
		return nil
	}

	found, err := s.users.ByIDs(ctx, ids)
	if err != nil {
		s.log.Error("look up player names", "err", err)
		return nil
	}
	return found
}

// nameAndColor is one roster row's half of a user, or empty for an id the account
// service did not know.
func nameAndColor(users map[string]*user.User, userID string) (string, string) {
	if u, ok := users[userID]; ok {
		return u.Name, u.Color
	}
	return "", ""
}

func (s *Server) newLobbyResponse(ctx context.Context, lobby *lol.MultiplayerLeagueOfLettersLobby) lobbyResponse {
	// By seat, which is the order people walked in -- so the host is the top row
	// before the game starts and plays first once it has.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b lol.MultiplayerLobbyPlayer) int { return a.Seat - b.Seat })

	ids := make([]string, 0, len(seated))
	for _, player := range seated {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	players := make([]lobbyPlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, lobbyPlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			JoinedAt:      player.JoinedAt.Format(timeFormat),
		})
	}

	body := lobbyResponse{
		ID:     lobby.ID,
		Code:   lobby.ID,
		HostID: lobby.OwnerID,
		Status: string(lobby.Status),
		Settings: lobbySettingsResponse{
			Locale:         lobby.Locale.String(),
			WordLength:     lobby.WordLength,
			SecondsPerTurn: lobby.SecondsPerTurn,
		},
		Players:   players,
		CreatedAt: lobby.CreatedAt.Format(timeFormat),
	}
	if lobby.GameID != nil {
		body.GameID = lobby.GameID.String()
	}
	if lobby.RematchCode != nil {
		body.RematchCode = *lobby.RematchCode
	}

	return body
}

func (s *Server) newMultiplayerGameResponse(
	ctx context.Context,
	game *lol.MultiplayerLeagueOfLettersGame,
	userID string,
) multiplayerGameResponse {
	// In turn order, which is the order the scoreboard is drawn in and the order the
	// turn passes around.
	seated := slices.Clone(game.Players)
	slices.SortFunc(seated, func(a, b lol.MultiplayerGamePlayer) int { return a.TurnOrder - b.TurnOrder })

	ids := make([]string, 0, len(seated))
	for _, player := range seated {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	// A game player has no join time of its own -- the table was settled at kickoff
	// -- so the game's own is the honest answer for all of them.
	joinedAt := game.CreatedAt.Format(timeFormat)

	players := make([]gamePlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, gamePlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			Score:         player.Score,
			JoinedAt:      joinedAt,
		})
	}

	turn := newTurnPayload(game)

	rounds := make([]roundResponse, 0, len(game.Rounds))
	for _, round := range game.Rounds {
		// The deadline goes on the round being played and on no other, so the board's
		// countdown can read the round it is drawing without knowing about turns.
		endsAt := ""
		if game.Status == lol.GameInProgress && round.RoundNumber == game.CurrentRound {
			endsAt = turn.EndsAt
		}
		rounds = append(rounds, newRoundResponse(round, endsAt))
	}

	return multiplayerGameResponse{
		ID:           game.ID.String(),
		Mode:         "multiplayer",
		OwnerID:      game.OwnerID,
		Locale:       game.Locale.String(),
		WordLength:   game.WordLength,
		MaxGuesses:   lol.MaxGuesses,
		CurrentRound: game.CurrentRound,
		TotalRounds:  len(game.Rounds),
		Score:        game.Score(userID),
		Status:       string(game.Status),
		CreatedAt:    game.CreatedAt.Format(timeFormat),
		Rounds:       rounds,
		Players:      players,
		Turn:         turn,
	}
}

func (s *Server) newMultiplayerGuessResponse(
	ctx context.Context,
	outcome *lol.MultiplayerGuessOutcome,
) multiplayerGuessResponse {
	game := outcome.Game

	// Straight off the game rather than looked up separately: the scores in this
	// answer have to be the ones this row produced.
	ids := make([]string, 0, len(game.Players))
	for _, player := range game.Players {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	seated := slices.Clone(game.Players)
	slices.SortFunc(seated, func(a, b lol.MultiplayerGamePlayer) int { return a.TurnOrder - b.TurnOrder })

	joinedAt := game.CreatedAt.Format(timeFormat)

	players := make([]gamePlayerResponse, 0, len(seated))
	for _, player := range seated {
		name, color := nameAndColor(users, player.UserID)
		players = append(players, gamePlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			Score:         player.Score,
			JoinedAt:      joinedAt,
		})
	}

	turn := newTurnPayload(game)

	body := multiplayerGuessResponse{
		Guess:        newGuessResponse(*outcome.Guess),
		RoundNumber:  outcome.RoundNumber,
		Solved:       outcome.Solved,
		RoundOver:    outcome.RoundOver,
		GameOver:     outcome.GameOver,
		Word:         outcome.Word,
		CurrentRound: game.CurrentRound,
		Players:      players,
		Turn:         turn,
	}

	// A round that ended and a game that ended look the same from the row that did
	// it; only the first of the two has a next board to send.
	if outcome.RoundOver && !outcome.GameOver {
		if next := game.Round(game.CurrentRound); next != nil {
			opened := newRoundResponse(*next, turn.EndsAt)
			body.NextRound = &opened
		}
	}

	return body
}

// newTurnPayload is who is up and until when, in the one shape both the socket and
// the HTTP responses use.
func newTurnPayload(game *lol.MultiplayerLeagueOfLettersGame) turnPayload {
	return turnPayload{
		UserID:      game.TurnUserID,
		EndsAt:      game.TurnEndsAt.Format(timeFormat),
		RoundNumber: game.CurrentRound,
	}
}

// newRoundResponse is one round of a shared board. endsAt is empty on every round
// but the one being played.
func newRoundResponse(round lol.LeagueOfLettersRound, endsAt string) roundResponse {
	guesses := make([]guessResponse, 0, len(round.Guesses))
	for _, guess := range round.Guesses {
		guesses = append(guesses, newGuessResponse(guess))
	}

	body := roundResponse{
		ID:          round.ID.String(),
		RoundNumber: round.RoundNumber,
		FirstLetter: round.FirstLetter(),
		Guesses:     guesses,
		EndsAt:      endsAt,
	}
	// Told only once there is nothing left to spoil.
	if round.IsOver() {
		body.Word = round.Word
	}

	return body
}

// ---------------------------------------------------------------------------
// Lobby handlers
// ---------------------------------------------------------------------------

// lobbyCode reads the join code off the path.
//
// Normalised rather than taken as typed, because the code is stored uppercase and
// looked up exactly: a player typing their code in lower case is not a player at the
// wrong door. joincode.Normalize is also what reads a leading zero as the O it can only
// have meant, and the socket room key normalises through the same function.
//
// The shape of the code is not checked here. Every route that takes one wears
// requireGameCode, so by the time a handler asks, the answer is a code for this game.
func lobbyCode(r *http.Request) string {
	return joincode.Normalize(r.PathValue("code"))
}

// requireGameCode is the guard every route addressed by a join code wears: it refuses
// anything that is not a code for g before the handler behind it runs.
//
// Answers 404 rather than 400, and the distinction matters. A code for another game is
// not a malformed request -- it is a perfectly good code for a room that is not at this
// address, and "there is no such room here" is both true and the thing the player needs
// to hear. The app already draws a 404 on this path as "that room is gone"; a 400 would
// be a new branch saying something less useful.
//
// Parameterised by game rather than hardcoded to League of Letters so that PubquizR and
// One of Us wear it unchanged on the day they grow rooms of their own.
func (s *Server) requireGameCode(g joincode.Game, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		game, ok := joincode.GameFor(joincode.Normalize(r.PathValue("code")))
		if !ok || game != g {
			writeErrorCode(w, http.StatusNotFound, "lobby_not_found", "that room does not exist")
			return
		}
		next(w, r)
	}
}

func (s *Server) handleCreateLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreateLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, _, err := decode[newLobbyRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	lobby, err := s.leagueOfLetters.CreateLobby(r.Context(), userID, localeFrom(Deref(req.Locale, ""), r))
	if err != nil {
		s.writeLobbyError(w, "create lobby", err)
		return
	}

	// Nothing is published: the room is one request old and there is nobody
	// connected to it yet to tell.
	writeJSON(w, http.StatusCreated, s.newLobbyResponse(r.Context(), lobby))
}

// handleGetLobby is the snapshot the room screen opens on. Everything after it
// arrives over the socket, so there is nothing here to poll.
//
// Knowing the code is what gets you in, so knowing the code is also what lets you
// read it -- the checks that matter are on the calls that change something.
func (s *Server) handleGetLobby(w http.ResponseWriter, r *http.Request) {
	lobby, err := s.leagueOfLetters.Lobby(r.Context(), lobbyCode(r))
	if err != nil {
		s.writeLobbyError(w, "get lobby", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newLobbyResponse(r.Context(), lobby))
}

// handleGetCurrentLobby is what the app asks on launch: the room this player is host
// of, whether it ever started or not, so a host who shut the app mid-game is offered
// their way back into it.
//
// Nothing to come back to is 204 rather than 404 -- having no room open is the
// ordinary state, not a failed lookup.
func (s *Server) handleGetCurrentLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetCurrentLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	lobby, err := s.leagueOfLetters.CurrentLobby(r.Context(), userID)
	if errors.Is(err, lol.ErrLobbyNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		s.writeLobbyError(w, "current lobby", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newLobbyResponse(r.Context(), lobby))
}

func (s *Server) handleJoinLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleJoinLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	lobby, err := s.leagueOfLetters.JoinLobby(r.Context(), code, userID)
	if err != nil {
		s.writeLobbyError(w, "join lobby", err)
		return
	}

	body := s.newLobbyResponse(r.Context(), lobby)
	s.publishLobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

func (s *Server) handleUpdateLobbySettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleUpdateLobbySettings reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	// The wire's own problems are answered here rather than dropped: the clock is
	// stored now and started from, so a number outside the picker's range would be a
	// room whose turns are over before they begin.
	req, invalid, err := decode[lobbySettingsRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(invalid) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": invalid})
		return
	}

	code := lobbyCode(r)

	lobby, problems, err := s.leagueOfLetters.UpdateLobbySettings(r.Context(), code, userID, lol.LobbySettings{
		Locale:         localeFrom(Deref(req.Locale, ""), r),
		WordLength:     req.WordLength,
		SecondsPerTurn: Deref(req.SecondsPerGuess, lol.DefaultSecondsPerTurn),
	})
	if err != nil {
		s.writeLobbyError(w, "update lobby settings", err)
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	body := s.newLobbyResponse(r.Context(), lobby)
	s.publishLobby(code, body)

	writeJSON(w, http.StatusOK, body)
}

// handleLeaveLobby gives a seat back without closing the room.
func (s *Server) handleLeaveLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleLeaveLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.leagueOfLetters.LeaveLobby(r.Context(), code, userID); err != nil {
		s.writeLobbyError(w, "leave lobby", err)
		return
	}

	// The room as it stands without them. A code that is already gone leaves nothing
	// to publish, which is the same no-op the leave itself was.
	if lobby, err := s.leagueOfLetters.Lobby(r.Context(), code); err == nil {
		s.publishLobby(code, s.newLobbyResponse(r.Context(), lobby))
	}

	w.WriteHeader(http.StatusNoContent)
}

// handleDeleteLobby closes a room for good. Host only.
func (s *Server) handleDeleteLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleDeleteLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.leagueOfLetters.DeleteLobby(r.Context(), code, userID); err != nil {
		s.writeLobbyError(w, "delete lobby", err)
		return
	}

	// Told rather than left to be discovered: anybody still on the room screen is
	// looking at a code that has stopped working.
	s.publishLobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

// handleStartLobby turns a room into a game. Host only.
//
// Answers the lobby rather than the game, because the lobby is what everybody else
// is watching and gameId appearing on it is how they find out. The board is fetched
// by id afterwards, the same way solo does it.
func (s *Server) handleStartLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleStartLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	lobby, game, err := s.leagueOfLetters.StartLobby(r.Context(), code, userID)
	if err != nil {
		s.writeLobbyError(w, "start lobby", err)
		return
	}

	body := s.newLobbyResponse(r.Context(), lobby)
	// Carries the first turn and starts its clock, so the table does not wait for
	// somebody to connect before the countdown begins.
	s.publishGameStarted(code, game, body)

	writeJSON(w, http.StatusOK, body)
}

// handleRematchLobby opens the next room for a table that has just finished, and
// answers it. Host only.
//
// 201 both times it is pressed: the second press is answered with the room the first
// one opened rather than a second room beside it, and from the app's side "here is
// the room" is the same outcome either way.
func (s *Server) handleRematchLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleRematchLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	next, err := s.leagueOfLetters.Rematch(r.Context(), code, userID)
	if err != nil {
		s.writeLobbyError(w, "rematch lobby", err)
		return
	}

	// Announced on the room they are all still sitting in -- that is the only place
	// the rest of the table is listening, and the new code is how they follow.
	s.publishRematch(code, next.ID)

	writeJSON(w, http.StatusCreated, s.newLobbyResponse(r.Context(), next))
}

// handleAbandonLobby throws a room and its game away for good. Host only.
//
// The difference from DELETE is the game: this is the host saying they are done
// playing rather than done with the room, so the board stops too.
func (s *Server) handleAbandonLobby(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleAbandonLobby reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	code := lobbyCode(r)

	if err := s.leagueOfLetters.AbandonLobby(r.Context(), code, userID); err != nil {
		s.writeLobbyError(w, "abandon lobby", err)
		return
	}

	// Same as a delete from anybody still on the screen: the code has stopped
	// working, and they are better told than left to find out.
	s.publishLobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

// ---------------------------------------------------------------------------
// Game handlers
// ---------------------------------------------------------------------------

func (s *Server) handleGetMultiplayerGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetMultiplayerGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		// An unparseable id cannot name a game, and saying so is the same answer as
		// "not your table".
		writeError(w, http.StatusNotFound, "game not found")
		return
	}

	game, err := s.leagueOfLetters.MultiplayerGame(r.Context(), gameID, userID)
	if err != nil {
		s.writeMultiplayerGuessError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, s.newMultiplayerGameResponse(r.Context(), game, userID))
}

func (s *Server) handleSubmitMultiplayerGuess(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleSubmitMultiplayerGuess reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "game not found")
		return
	}

	req, problems, err := decode[submitGuessRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.leagueOfLetters.SubmitMultiplayerGuess(r.Context(), lol.SubmitMultiplayerGuessInput{
		GameID: gameID,
		UserID: userID,
		Word:   req.Word,
	})
	if err != nil {
		s.writeMultiplayerGuessError(w, err)
		return
	}

	body := s.newMultiplayerGuessResponse(r.Context(), outcome)
	// Everybody watching gets exactly what the guesser got back, so the player who
	// played the row and the players watching it land apply the same update.
	s.publishGuess(outcome.Game.LobbyID, outcome.Game, body)

	writeJSON(w, http.StatusCreated, body)
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

// writeLobbyError turns a service error into a status and a machine-readable tag.
//
// The tag is what the app branches on. A full room and a room that has already
// started are both 409 and the app says something quite different about each, so
// telling them apart cannot depend on the prose.
func (s *Server) writeLobbyError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, lol.ErrLobbyNotFound):
		writeErrorCode(w, http.StatusNotFound, "lobby_not_found", "that room does not exist")
	case errors.Is(err, lol.ErrNotHost):
		writeErrorCode(w, http.StatusForbidden, "not_host", "only the host may do that")
	case errors.Is(err, lol.ErrLobbyFull):
		writeErrorCode(w, http.StatusConflict, "lobby_full", "that room is full")
	case errors.Is(err, lol.ErrLobbyStarted):
		writeErrorCode(w, http.StatusConflict, "lobby_started", "that game has already started")
	case errors.Is(err, lol.ErrNotEnoughPlayers):
		writeErrorCode(w, http.StatusConflict, "not_enough_players", "you need another player to start")
	case errors.Is(err, lol.ErrGameNotOver):
		writeErrorCode(w, http.StatusConflict, "game_not_over", "that game is still being played")
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

// writeMultiplayerGuessError is the solo guess refusals plus the one a shared board
// adds: it is somebody else's turn.
func (s *Server) writeMultiplayerGuessError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, lol.ErrGameNotFound):
		// Not at the table reads the same as not a game. Being at it is the whole of
		// the permission model, and saying which of the two it is would tell a
		// stranger that the game exists.
		writeErrorCode(w, http.StatusNotFound, "game_not_found", "game not found")
	case errors.Is(err, lol.ErrNotYourTurn):
		writeErrorCode(w, http.StatusConflict, "not_your_turn", "it is not your turn")
	case errors.Is(err, lol.ErrGameFinished):
		writeErrorCode(w, http.StatusConflict, "game_finished", "this game is over")
	case errors.Is(err, lol.ErrRoundClosed):
		writeErrorCode(w, http.StatusConflict, "round_closed", "this round takes no more guesses")
	case errors.Is(err, lol.ErrDuplicateGuess):
		writeErrorCode(w, http.StatusConflict, "duplicate_guess", "that word has already been played this round")
	case errors.Is(err, lol.ErrInvalidGuessCharacters):
		writeErrorCode(w, http.StatusBadRequest, "invalid_guess", "invalid characters in guess (or too short)")
	case errors.Is(err, lol.ErrInvalidGuessWordNonExisting):
		writeErrorCode(w, http.StatusBadRequest, "unknown_word", "that word does not exist")
	default:
		s.log.Error("submit multiplayer guess", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

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

// Fake Filler on the wire: the room a game is set up in, the game it becomes, and the two
// writes a player makes while playing it.
//
// The response shapes live here rather than beside the game because the socket sends the
// same structs -- a lobby in a frame and a lobby in a response body have to be the same
// lobby -- and ff_realtime.go is where the frames are.
//
// Everything is prefixed ff because internal/api is one package and League of Letters got
// here first: statePayload, lobbyResponse, gamePlayerResponse and the rest are all taken.
// The wire *tags* are deliberately not prefixed -- both games spell "state" the same way,
// because they are the same idea and a client library should not need two spellings.
//
// The rule that shapes this whole file is redaction. Fake Filler is a game about not
// knowing who wrote what, so the server has to be the thing that does not say: a response
// carries the reader's own answers and nobody else's, and an option is identified by the
// position it was shuffled into rather than by its author -- because the author of one of
// them is the string "__truth__", and sending that would end the round before it started.

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

// ffNewLobbyRequest is what opens a room: a language, and deliberately nowhere to put a
// mode. decode rejects unknown fields, so a client still sending settings here is refused
// rather than quietly having them dropped and believing the room is set up as it asked.
type ffNewLobbyRequest struct {
	Locale *string `json:"locale"`
}

func (ffNewLobbyRequest) Validate() map[string]string { return nil }

// ffLobbySettingsRequest is what the host gets to decide, on the way in.
//
// Both fields are pointers because this is a PATCH and the settings card sends the knob it
// moved: absent means leave it as it stands. Validate says nothing about which modes exist
// -- that is the game's rule rather than the wire's, and fakefiller.LobbySettings.validate
// already owns it.
type ffLobbySettingsRequest struct {
	GameMode *string `json:"gameMode"`
	Locale   *string `json:"locale"`
}

func (ffLobbySettingsRequest) Validate() map[string]string { return nil }

// ffSubmitAnswerRequest is one player's fake for one prompt: a value per blank, in the
// order the blanks appear.
//
// Fills is a list rather than a string because a prompt can have more than one blank and
// an author fills all of them. How many is right is a question about the round, so the
// service answers it; all this can say is that an answer with nothing in it is not one.
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
//
// This is the redaction showing through into the request shape: the voting screen was
// never sent the authors, so it has nothing else it could name. The server maps the slot
// back to whoever is sitting in it.
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

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

type ffLobbySettingsResponse struct {
	GameMode string `json:"gameMode"`
	Locale   string `json:"locale"`
}

// ffLobbyPlayerResponse is somebody in the room, and is deliberately the front half of
// ffGamePlayerResponse -- same ids, same swatch -- so a player waiting and the scoreboard
// row they turn into are the same person to whatever draws one.
type ffLobbyPlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	JoinedAt      string `json:"joinedAt"`
}

type ffLobbyResponse struct {
	ID string `json:"id"`
	// Code is what players type in to get here, and is the same string as ID: a room has
	// nothing anybody looks it up by except its code.
	Code string `json:"code"`
	// HostID is whose room it is. The app hides the controls; the server enforces it.
	HostID     string                  `json:"hostId"`
	Status     string                  `json:"status"`
	Settings   ffLobbySettingsResponse `json:"settings"`
	Players    []ffLobbyPlayerResponse `json:"players"`
	MinPlayers int                     `json:"minPlayers"`
	MaxPlayers int                     `json:"maxPlayers"`
	CreatedAt  string                  `json:"createdAt"`
	// GameID is the game to open, set only once the host has started the room. Its
	// appearing is how everybody else finds out.
	GameID string `json:"gameId,omitempty"`
	// RematchCode is the room this one's table has moved on to. Carried on the snapshot
	// as well as announced over the socket, so a player whose connection blipped over the
	// announcement is still taken across by the next read.
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
//
// Slot is the identity while voting is open and the only identity: it is what a vote
// names, and it is all a client is given. AuthorID, IsTruth and Voters appear together
// and only once the round has been revealed -- before that, any one of the three would
// answer the question the round is asking.
type ffOptionResponse struct {
	Slot  int      `json:"slot"`
	Fills []string `json:"fills"`

	AuthorID string   `json:"authorId,omitempty"`
	IsTruth  bool     `json:"isTruth,omitempty"`
	Voters   []string `json:"voters,omitempty"`
}

// ffRoundResponse is one prompt as it looks to one reader, which is the important part:
// two players fetching the same round get different bodies, and that is the game working.
//
// Mine, Answered, MyFills and MyVoteSlot are about the reader. Everything else is either
// public (the line, the counts) or gated on the round having been revealed.
type ffRoundResponse struct {
	ID     string `json:"id"`
	Number int    `json:"number"`
	// Line still carries its blanks; the fills are kept apart so one prompt can be
	// rendered three ways without three copies of the sentence.
	Line   string `json:"line"`
	Blanks int    `json:"blanks"`

	// Mine is whether this prompt was dealt to the reader to write for.
	Mine bool `json:"mine"`
	// Answered is whether the reader has written their fake for it. Only meaningful on a
	// round that is Mine.
	Answered bool `json:"answered"`
	// MyFills is the reader's own answer, echoed back so a reconnect can redraw a prompt
	// they had already filled in.
	MyFills []string `json:"myFills,omitempty"`
	// AnswerCount is how many of the two authors have written. Progress, never content --
	// it is the number the writing screen counts down, and it says nothing about what was
	// written or by whom.
	AnswerCount int `json:"answerCount"`

	// CanVote is whether the reader is eligible to vote on this round at all, which is
	// settled when the prompts are dealt and has nothing to do with whether the table has
	// reached it yet.
	CanVote bool `json:"canVote"`
	// MyVoteSlot is the slot the reader picked, once they have. A pointer because slot
	// zero is a real answer and "not voted" has to be tellable from it.
	MyVoteSlot *int `json:"myVoteSlot,omitempty"`
	VoteCount  int  `json:"voteCount"`

	// Options are sent only for the round being voted on and for rounds already revealed.
	// A round still being written has no order yet, and a round the table has not reached
	// would be one a player could read ahead in.
	Options []ffOptionResponse `json:"options,omitempty"`

	Revealed bool `json:"revealed"`
	// Authors are the two players who wrote for this prompt, told only once the round is
	// revealed. This is the answer to the whole round, so it is also the last thing sent.
	Authors []string `json:"authors,omitempty"`
}

// ffGameResponse is the board as one player may see it.
//
// Not a shared document with holes punched in it: it is built per reader, and Rounds is
// where that happens. Two things ride along at the top because every screen needs them and
// working them out from the roster is the sort of arithmetic that ends up done differently
// on two platforms: how many answers a finished writing phase has, and how many votes a
// round waits for.
type ffGameResponse struct {
	ID       string `json:"id"`
	LobbyID  string `json:"lobbyId"`
	OwnerID  string `json:"ownerId"`
	Locale   string `json:"locale"`
	GameMode string `json:"gameMode"`

	Phase string `json:"phase"`
	// CurrentRound only means anything once Phase is voting -- during writing every round
	// is open at once.
	CurrentRound int    `json:"currentRound"`
	TotalRounds  int    `json:"totalRounds"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`

	// Score is the reader's own, so the board can show it without picking itself out of
	// Players first.
	Score int `json:"score"`

	AnswersIn     int `json:"answersIn"`
	AnswersNeeded int `json:"answersNeeded"`
	VotesNeeded   int `json:"votesNeeded"`

	Players []ffGamePlayerResponse `json:"players"`
	Rounds  []ffRoundResponse      `json:"rounds"`
}

// ffAnswerResponse is what one answer did: counts, and nothing else.
//
// Deliberately carries no fills, not even the writer's own. The same body is broadcast to
// the whole table, so anything in it is something everybody learns -- and what a player is
// writing is the one thing this half of the game is about not knowing.
type ffAnswerResponse struct {
	RoundNumber int    `json:"roundNumber"`
	Phase       string `json:"phase"`
	AnswersIn   int    `json:"answersIn"`
	// AnswersNeeded is how many the whole game is waiting for, not how many this round is.
	AnswersNeeded int `json:"answersNeeded"`
	// VotingOpened is set on the answer that finished the writing phase. Everybody who
	// sees it should re-read the game: their own options are waiting behind it.
	VotingOpened bool   `json:"votingOpened"`
	GameID       string `json:"gameId"`
}

// ffPublicRoundResponse is a round with nothing reader-specific on it, which is what makes
// it safe to broadcast: the prompt and the options in the order everybody sees them.
//
// Sent as the *next* round when a vote closes one, so the table can move on without each
// client re-fetching the whole game. What it cannot carry is whether the reader may vote
// on it -- that depends on who wrote it, which is exactly what must not be said -- so a
// client answers that from the snapshot it already holds.
type ffPublicRoundResponse struct {
	ID      string             `json:"id"`
	Number  int                `json:"number"`
	Line    string             `json:"line"`
	Blanks  int                `json:"blanks"`
	Options []ffOptionResponse `json:"options"`
}

// ffRevealResponse is a finished round with everything told: who wrote which fake, which
// option was the truth, and who picked what.
//
// Public by construction, which is why it is a type of its own rather than a revealed
// ffRoundResponse -- that one carries the reader's own answers, and this is the one body
// the whole table is sent at once.
type ffRevealResponse struct {
	RoundNumber int                `json:"roundNumber"`
	Line        string             `json:"line"`
	Authors     []string           `json:"authors"`
	Options     []ffOptionResponse `json:"options"`
}

// ffVoteResponse is what one vote did.
//
// Not the whole game, for the same reason League of Letters does not resend the board on
// every guess: every client already holds it, and what it cannot work out for itself is
// how many votes are in, whether that closed the round, and what the round turned out to
// be. Reveal and NextRound are set together on the vote that ends a round.
type ffVoteResponse struct {
	GameID      string `json:"gameId"`
	RoundNumber int    `json:"roundNumber"`
	Votes       int    `json:"votes"`
	VotesNeeded int    `json:"votesNeeded"`
	RoundOver   bool   `json:"roundOver"`
	GameOver    bool   `json:"gameOver"`
	// CurrentRound is the round the game is on afterwards, which is not RoundNumber if
	// this vote closed it.
	CurrentRound int    `json:"currentRound"`
	Status       string `json:"status"`

	Players []ffGamePlayerResponse `json:"players"`

	Reveal    *ffRevealResponse      `json:"reveal,omitempty"`
	NextRound *ffPublicRoundResponse `json:"nextRound,omitempty"`
}

// ---------------------------------------------------------------------------
// Building them
// ---------------------------------------------------------------------------

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
		// Carried rather than hardcoded in the app: the room screen draws "3 to 9
		// players" and greys out its start button from these, and the bounds are the
		// game's to state.
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

	// A game player has no join time of its own -- the table was settled at kickoff -- so
	// the game's own is the honest answer for all of them.
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

// ffRoundVisibility answers the two questions every redaction in this file turns on.
//
// open is the round being voted on right now, which is the only unfinished round whose
// options anybody may see. revealed is a round whose voting is done, which is the only
// round whose authors anybody may see. A game that was abandoned mid-round reveals
// nothing further: the round never finished, so there is no result to tell.
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

	// The reader's own answer, and only ever the reader's own. Looked up by their user id
	// because that is what an option is filed under, which is the same reason a second
	// answer from them is impossible.
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

// newFFOptionResponses is the line-up, in the order it was shuffled into.
//
// revealed is what decides how much of an option is an option: without it, a slot and its
// fills, which is everything a voter needs and nothing that would tell them the answer.
// With it, the author, whether it was the truth, and who picked it.
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

// ffAnswerCount is how many of a round's two authors have written, which is every option
// on it except the truth -- that one was written when the game was dealt.
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

// newFFAnswerResponse is the progress frame. It is built from the outcome rather than the
// request so that the count it carries is the one the write produced.
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

	// A round that ended and a game that ended look the same from the vote that did it;
	// only the first of the two has a next prompt to send.
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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

func (s *Server) AddFakeFillerHandlers() {
	s.mux.HandleFunc("POST /api/v1/fake-filler/lobby", s.requireAuth(s.handleCreateFFLobby))
	// Before {code}, so the literal wins: this is the room you are already in, not a room
	// called "current".
	s.mux.HandleFunc("GET /api/v1/fake-filler/lobby/current", s.requireAuth(s.handleGetCurrentFFLobby))

	// room is what every route addressed by a join code is wrapped in: signed in, and
	// carrying a code that is a Fake Filler code rather than merely five characters. A
	// League of Letters code reaching one of these is a 404, not a 400 -- it is a
	// perfectly good code for a room that is not at this address.
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

// ---------------------------------------------------------------------------
// Lobby handlers
// ---------------------------------------------------------------------------

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

	// Nothing is published: the room is one request old and there is nobody connected to
	// it yet to tell.
	writeJSON(w, http.StatusCreated, s.newFFLobbyResponse(r.Context(), lobby))
}

// handleGetFFLobby is the snapshot the room screen opens on. Everything after it arrives
// over the socket, so there is nothing here to poll.
func (s *Server) handleGetFFLobby(w http.ResponseWriter, r *http.Request) {
	lobby, err := s.fakeFiller.Lobby(r.Context(), lobbyCode(r))
	if err != nil {
		s.writeFFLobbyError(w, "get fake filler lobby", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newFFLobbyResponse(r.Context(), lobby))
}

// handleGetCurrentFFLobby is what the app asks on launch. Nothing to come back to is 204
// rather than 404 -- having no room open is the ordinary state, not a failed lookup.
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

	// The room has to be read before the mode can default to what it is already playing:
	// a PATCH that carries only a language must not knock the mode back to facts.
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

	// The room as it stands without them. A code that is already gone leaves nothing to
	// publish, which is the same no-op the leave itself was.
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

	// Told rather than left to be discovered: anybody still on the room screen is looking
	// at a code that has stopped working.
	s.publishFFLobbyClosed(code)

	w.WriteHeader(http.StatusNoContent)
}

// handleStartFFLobby turns a room into a game. Host only.
//
// Answers the lobby rather than the game, because the lobby is what everybody else is
// watching and gameId appearing on it is how they find out. The board is fetched by id
// afterwards -- and it has to be, because the board is different for every reader.
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

// handleRematchFFLobby opens the next room for a table that has just finished. Host only.
//
// 201 both times it is pressed: the second press is answered with the room the first one
// opened rather than a second room beside it.
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

	// Announced on the room they are all still sitting in -- that is the only place the
	// rest of the table is listening, and the new code is how they follow.
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

// ---------------------------------------------------------------------------
// Game handlers
// ---------------------------------------------------------------------------

func (s *Server) handleGetFFGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetFFGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		// An unparseable id cannot name a game, and saying so is the same answer as "not
		// your table".
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
	// Counts only, so the same body goes to the table as to the writer -- there is
	// nothing in it the writer knows and the table does not.
	s.publishFFAnswerProgress(outcome.Game.LobbyID, body)

	if outcome.VotingOpened {
		// The options are different for nobody -- but which of them a player may vote on
		// is -- so the table is told to re-read rather than sent a board.
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
	// Everybody watching gets exactly what the voter got back, so the player who cast the
	// vote and the players watching it land apply the same update. It carries no
	// reader-specific field, which is what makes that possible here.
	s.publishFFVote(outcome.Game.LobbyID, body)

	writeJSON(w, http.StatusCreated, body)
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

// writeFFLobbyError turns a room error into a status and a machine-readable tag.
//
// A separate function from writeLobbyError rather than a shared one, because that one
// switches on lol sentinels: two games' errors are two different types, and errors.Is
// between them is always false. The tags are deliberately the same strings, so an app that
// already knows what "lobby_full" means does not have to learn it twice.
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
		// A short data file, which is a broken build rather than a broken request: the
		// host did nothing wrong and there is nothing they can do about it.
		s.log.Error(what, "err", err)
		writeErrorCode(w, http.StatusInternalServerError, "no_content", "there are not enough prompts to play")
	default:
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

// writeFFPlayError is the refusals a board produces: reading it, writing into it, voting
// on it.
func (s *Server) writeFFPlayError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, fakefiller.ErrGameNotFound):
		// Not at the table reads the same as not a game. Being at it is the whole of the
		// permission model, and saying which of the two it is would tell a stranger the
		// game exists.
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

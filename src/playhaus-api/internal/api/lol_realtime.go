package api

import (
	"context"
	"errors"
	"time"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/realtime"

	"github.com/google/uuid"
)

// The League of Letters socket lives here rather than in the game package because
// this is where the wire shapes already are: a lobby on a socket frame and a lobby
// in a response body have to be the same lobby, and two copies of that struct would
// be one refactor away from disagreeing.
//
// The room is keyed by the join code, so the same connection carries the lobby and
// the game that grows out of it -- nobody reconnects at kickoff, which is the one
// moment a reconnect would be most visible.

// lolRoom is the socket room a join code names.
//
// Both halves come from joincode rather than being spelled out here. The namespace
// because a room key is "namespace:code" and the code already says which game it is: if
// the two could disagree, "lol:P4X2Q" would be a room a client could sit in forever,
// correctly connected to a game that will never publish into it. The id because the code
// is compared byte for byte everywhere else, and a room reached in lower case is a room
// nobody is talking to.
func lolRoom(code string) realtime.Key {
	return realtime.Key{
		Namespace: joincode.LeagueOfLetters.Namespace(),
		ID:        joincode.Normalize(code),
	}
}

// Message types, server to client. The client sends exactly one thing back --
// typeTyping -- and everything else it wants to do goes over HTTP, where the
// validation and the status codes already live.
const (
	// typeState is the whole picture, sent to one connection as it arrives. A
	// client that has just reconnected needs no replay: it is simply told where
	// things stand now.
	typeState = "state"
	// typePresence is who is connected. This is the live dot.
	typePresence = "presence"
	// typeLobby is the room having changed -- somebody in or out, a setting moved.
	typeLobby = "lobby"
	// typeLobbyClosed is the host having shut the room. The code is dead.
	typeLobbyClosed = "lobby_closed"
	// typeGameStarted carries the id of the game the room just became.
	typeGameStarted = "game_started"
	// typeTurn is whose turn it is and until when.
	typeTurn = "turn"
	// typeTyping is the letters the active player has down so far, relayed to
	// everybody else so the table can watch them think.
	typeTyping = "typing"
	// typeGuess is a row landing: the guess, the scores it moved, the next turn.
	typeGuess = "guess"
	// typeGameOver is the last round having been decided.
	typeGameOver = "game_over"
	// typeRematch is the host having opened a fresh room for the same table. The code
	// is where everybody still sitting on the result is going.
	typeRematch = "rematch"
)

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

type statePayload struct {
	Lobby  lobbyResponse            `json:"lobby"`
	Game   *multiplayerGameResponse `json:"game,omitempty"`
	Online []string                 `json:"online"`
}

type presencePayload struct {
	Online []string `json:"online"`
}

type lobbyPayload struct {
	Lobby lobbyResponse `json:"lobby"`
}

type gameStartedPayload struct {
	GameID string        `json:"gameId"`
	Lobby  lobbyResponse `json:"lobby"`
}

type turnPayload struct {
	UserID      string `json:"userId"`
	EndsAt      string `json:"endsAt"`
	RoundNumber int    `json:"roundNumber"`
}

type typingPayload struct {
	UserID string `json:"userId"`
	// Letters is the draft as it stands, not a keystroke: a client that misses a
	// frame is corrected by the next one rather than left a letter behind.
	Letters string `json:"letters"`
}

type gameOverPayload struct {
	Players []gamePlayerResponse `json:"players"`
}

// rematchPayload is the door out of a finished room: the code of the one that replaced
// it. Just the code -- the room behind it is read the ordinary way on arrival, and a
// lobby sent here would be one every client had to tell apart from the room it is
// currently in.
type rematchPayload struct {
	Code string `json:"code"`
}

// ---------------------------------------------------------------------------
// The handler
// ---------------------------------------------------------------------------

// lolRealtime is the Server's socket behaviour for League of Letters rooms.
//
// Every method runs on the room's own goroutine, one at a time, so nothing in here
// locks and nothing in here may block. The database reads it does are the exception
// that proves the rule: they are on a single local SQLite connection and take
// microseconds, and doing them anywhere else would mean a room whose state arrives
// after the frames that describe it.
type lolRealtime struct{ server *Server }

// roomState is what a room remembers between frames. Room goroutine only.
type roomState struct {
	// gameID is the game this room is playing, once it has one. Cached so the turn
	// timer does not have to re-read the lobby to find out what it is timing.
	gameID uuid.UUID
	// turnEndsAt is the deadline the timer is currently armed for, so a re-arm for
	// the same deadline can be skipped.
	turnEndsAt time.Time
}

func stateOf(room *realtime.Room) *roomState {
	if existing, ok := room.State().(*roomState); ok {
		return existing
	}
	fresh := &roomState{}
	room.SetState(fresh)
	return fresh
}

// OnJoin sends the arriving connection everything it needs and tells the room it is
// there.
func (h lolRealtime) OnJoin(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	s := h.server
	code := room.Key.ID

	lobby, err := s.leagueOfLetters.Lobby(ctx, code)
	if err != nil {
		client.Send(realtime.Errorf("that room does not exist"))
		client.Close()
		return
	}

	// Being at the table is the whole of the permission model here, the same as it
	// is on the HTTP routes. Without this, a join code would be a licence to watch
	// somebody else's game.
	if !lobby.Has(client.UserID) {
		client.Send(realtime.Errorf("you are not in that room"))
		client.Close()
		return
	}

	state := stateOf(room)
	payload := statePayload{
		Lobby:  s.newLobbyResponse(ctx, lobby),
		Online: room.Online(),
	}

	if lobby.GameID != nil {
		state.gameID = *lobby.GameID

		if game, err := s.leagueOfLetters.MultiplayerGame(ctx, *lobby.GameID, client.UserID); err == nil {
			body := s.newMultiplayerGameResponse(ctx, game, client.UserID)
			payload.Game = &body
		}
	}

	client.Send(realtime.Message(typeState, payload))

	// Everybody else finds out somebody is here. The joiner already knows -- their
	// own snapshot carried the list.
	room.BroadcastExcept(client.UserID, realtime.Message(typePresence, presencePayload{Online: room.Online()}))

	// The clock only runs while somebody is watching, so arriving is what starts it
	// -- including giving back a turn whose deadline passed while the room was empty.
	h.resumeTurn(ctx, room)
}

// OnLeave puts somebody's light out.
//
// Nothing else: a turn is not forfeited by losing a connection. A dropped signal on
// a train would otherwise cost a turn, and the thirty-five seconds is enough time
// to come back and still play it.
func (h lolRealtime) OnLeave(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	room.Broadcast(realtime.Message(typePresence, presencePayload{Online: room.Online()}))
}

// OnMessage handles the one thing a client is allowed to say.
func (h lolRealtime) OnMessage(ctx context.Context, room *realtime.Room, client *realtime.Client, env realtime.Envelope) {
	// Anything else is ignored rather than refused: a newer app talking to an older
	// server is not a reason to hang up on somebody mid-game.
	if env.Type != typeTyping {
		return
	}

	in, err := realtime.Into[typingPayload](env)
	if err != nil {
		return
	}

	state := stateOf(room)
	if state.gameID == uuid.Nil {
		return
	}

	// Only from the player whose turn it is. Otherwise a client could paint letters
	// into the row somebody else is typing in.
	game, err := h.server.leagueOfLetters.MultiplayerGame(ctx, state.gameID, client.UserID)
	if err != nil || game.TurnUserID != client.UserID || game.Status != lol.GameInProgress {
		return
	}

	// Capped rather than trusted. The draft cannot be longer than the word, and a
	// client saying otherwise is not one to relay to five other screens.
	letters := in.Letters
	if len(letters) > game.WordLength {
		letters = letters[:game.WordLength]
	}

	room.BroadcastExcept(client.UserID, realtime.Message(typeTyping, typingPayload{
		UserID:  client.UserID,
		Letters: letters,
	}))
}

// ---------------------------------------------------------------------------
// The turn clock
// ---------------------------------------------------------------------------

// resumeTurn arms the room's timer for the current turn, giving the turn back
// whole if its deadline passed while the room was empty.
func (h lolRealtime) resumeTurn(ctx context.Context, room *realtime.Room) {
	state := stateOf(room)
	if state.gameID == uuid.Nil {
		return
	}

	endsAt, err := h.server.leagueOfLetters.ResumeTurn(ctx, state.gameID)
	if err != nil {
		// A finished game has no turn to resume, which is the ordinary case here --
		// somebody opening a game that is over.
		if !errors.Is(err, lol.ErrGameFinished) {
			h.server.log.Error("resume turn", "err", err, "room", room.Key.String())
		}
		return
	}

	h.armTurn(room, state.gameID, endsAt)
}

// armTurn schedules the timeout, and tells the room when the current turn runs out
// if that has moved.
func (h lolRealtime) armTurn(room *realtime.Room, gameID uuid.UUID, endsAt time.Time) {
	state := stateOf(room)

	if state.turnEndsAt.Equal(endsAt) {
		// Already counting down to exactly this. Re-arming would be harmless but
		// would also re-send a turn frame the table already has.
		return
	}
	state.turnEndsAt = endsAt
	state.gameID = gameID

	wait := time.Until(endsAt)
	if wait < 0 {
		wait = 0
	}

	room.After(wait, func(r *realtime.Room) { h.turnExpired(r, gameID, endsAt) })
}

// turnExpired is the clock running out: a blank row goes down and play moves on.
func (h lolRealtime) turnExpired(room *realtime.Room, gameID uuid.UUID, endsAt time.Time) {
	state := stateOf(room)

	// The turn moved on under this timer -- somebody guessed, and the write that
	// recorded it armed a new one. Nothing to do.
	if !state.turnEndsAt.Equal(endsAt) {
		return
	}

	// A fresh context: the request that set this in motion is long gone, and the
	// room's own context is only cancelled at shutdown.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	outcome, err := h.server.leagueOfLetters.SkipTurn(ctx, gameID)
	if err != nil {
		// Lost a race with a real guess, or the game ended. Either way the game has
		// moved and somebody else has already said so.
		if !errors.Is(err, lol.ErrNotYourTurn) &&
			!errors.Is(err, lol.ErrGameFinished) &&
			!errors.Is(err, lol.ErrRoundClosed) {
			h.server.log.Error("skip turn", "err", err, "game", gameID)
		}
		return
	}

	h.broadcastGuess(ctx, room, outcome.Game, h.server.newMultiplayerGuessResponse(ctx, outcome))
}

// broadcastGuess is the row, the scores and the next turn, plus the clock for it.
// Shared by a real guess and a timeout so the table cannot tell the difference in
// anything but the row itself.
func (h lolRealtime) broadcastGuess(
	ctx context.Context,
	room *realtime.Room,
	game *lol.MultiplayerLeagueOfLettersGame,
	body multiplayerGuessResponse,
) {
	room.Broadcast(realtime.Message(typeGuess, body))

	if game.Status != lol.GameInProgress {
		room.Broadcast(realtime.Message(typeGameOver, gameOverPayload{Players: body.Players}))
		room.CancelTimer()
		stateOf(room).turnEndsAt = time.Time{}
		return
	}

	room.Broadcast(realtime.Message(typeTurn, turnPayload{
		UserID:      game.TurnUserID,
		EndsAt:      game.TurnEndsAt.Format(timeFormat),
		RoundNumber: game.CurrentRound,
	}))

	h.armTurn(room, game.ID, game.TurnEndsAt)
}

// ---------------------------------------------------------------------------
// Publishing from the HTTP side
//
// Each of these is a no-op when nobody is in the room, which is the right answer:
// there is no one to tell, and the next player to connect reads the state instead
// of a replay.
// ---------------------------------------------------------------------------

func (s *Server) publishLobby(code string, body lobbyResponse) {
	s.rt.In(lolRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobby, lobbyPayload{Lobby: body}))
	})
}

func (s *Server) publishLobbyClosed(code string) {
	s.rt.In(lolRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobbyClosed, nil))
	})
}

// publishRematch tells a finished room where its table has gone.
//
// Broadcast into the *old* room, which is the one everybody is still connected to:
// nobody can be listening to a code they have not been given yet.
func (s *Server) publishRematch(code, next string) {
	s.rt.In(lolRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeRematch, rematchPayload{Code: next}))
	})
}

func (s *Server) publishGameStarted(code string, game *lol.MultiplayerLeagueOfLettersGame, body lobbyResponse) {
	handler := lolRealtime{server: s}

	s.rt.In(lolRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeGameStarted, gameStartedPayload{
			GameID: game.ID.String(),
			Lobby:  body,
		}))
		room.Broadcast(realtime.Message(typeTurn, turnPayload{
			UserID:      game.TurnUserID,
			EndsAt:      game.TurnEndsAt.Format(timeFormat),
			RoundNumber: game.CurrentRound,
		}))

		// The first turn's clock starts here, not when somebody next connects.
		handler.armTurn(room, game.ID, game.TurnEndsAt)
	})
}

func (s *Server) publishGuess(code string, game *lol.MultiplayerLeagueOfLettersGame, body multiplayerGuessResponse) {
	handler := lolRealtime{server: s}

	s.rt.In(lolRoom(code), func(room *realtime.Room) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		handler.broadcastGuess(ctx, room, game, body)
	})
}

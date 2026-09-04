package api

import (
	"context"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/realtime"
)

// The Fake Filler socket lives here rather than in the game package because this is where
// the wire shapes already are: a lobby on a socket frame and a lobby in a response body
// have to be the same lobby, and two copies of that struct would be one refactor away
// from disagreeing.
//
// The room is keyed by the join code, so the same connection carries the lobby and the
// game that grows out of it. There is no turn clock here and nothing that fires on its
// own -- League of Letters needs a timer on the room goroutine because a turn can run
// out; Fake Filler waits for everybody, always, and a room with nobody in it is simply a
// room nothing is being published into.

// ffRoom is the socket room a join code names.
//
// Both halves come from joincode rather than being spelled out here. The namespace
// because a room key is "namespace:code" and the code already says which game it is: if
// the two could disagree, "ff:L4X2Q" would be a room a client could sit in forever,
// correctly connected to a game that will never publish into it. The id because the code
// is compared byte for byte everywhere else, and a room reached in lower case is a room
// nobody is talking to.
func ffRoom(code string) realtime.Key {
	return realtime.Key{
		Namespace: joincode.FakeFiller.Namespace(),
		ID:        joincode.Normalize(code),
	}
}

// Message types, server to client.
//
// typeState, typePresence, typeLobby, typeLobbyClosed, typeGameStarted, typeGameOver and
// typeRematch are League of Letters' constants, reused rather than re-declared: they are
// generic strings for generic events, and two games spelling "state" differently would be
// a client library needing to know which game it was talking to before it could read a
// frame. What is declared here is the four events only this game has.
const (
	// typeAnswerProgress is somebody having filled a prompt in. Counts only -- never what
	// they wrote, which is the whole of what the writing phase is hiding.
	typeAnswerProgress = "answer_progress"
	// typeVotingStarted is the last answer having landed. It carries no board, because a
	// board is different for every reader: it is a nudge to go and read one.
	typeVotingStarted = "voting_started"
	// typeVoteProgress is a vote landing on the round being played.
	typeVoteProgress = "vote_progress"
	// typeRoundResult is the reveal: who wrote what, which one was true, who was fooled,
	// and the scores it moved.
	typeRoundResult = "round_result"
)

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

// ffStatePayload is the whole picture, sent to one connection as it arrives.
//
// This one frame is the entire reconnect story. There is no replay and no catch-up
// stream: an app that was killed in the middle of the voting phase comes back, is told
// where the table is now -- the phase, the round, the options in the order it last saw
// them -- and carries on. Which is why Game is built for the connecting player rather
// than shared: it is the same redacted body GET /game/{id} would answer them with.
type ffStatePayload struct {
	Lobby  ffLobbyResponse `json:"lobby"`
	Game   *ffGameResponse `json:"game,omitempty"`
	Online []string        `json:"online"`
}

type ffPresencePayload struct {
	Online []string `json:"online"`
}

type ffLobbyPayload struct {
	Lobby ffLobbyResponse `json:"lobby"`
}

type ffGameStartedPayload struct {
	GameID string          `json:"gameId"`
	Lobby  ffLobbyResponse `json:"lobby"`
}

// ffVotingStartedPayload is the id of the game to go and re-read, and nothing else.
//
// Deliberately not the board. Which options a player may vote on depends on which prompts
// were dealt to them, so there is no one body the table could be sent -- and a body that
// said would be a body that told everybody who wrote what.
type ffVotingStartedPayload struct {
	GameID string `json:"gameId"`
}

// ffGameOverPayload is the final scoreboard.
type ffGameOverPayload struct {
	Players []ffGamePlayerResponse `json:"players"`
}

// ffRematchPayload is the door out of a finished room: the code of the one that replaced
// it. Just the code -- the room behind it is read the ordinary way on arrival.
type ffRematchPayload struct {
	Code string `json:"code"`
}

// ---------------------------------------------------------------------------
// The handler
// ---------------------------------------------------------------------------

// ffRealtime is the Server's socket behaviour for Fake Filler rooms.
//
// Every method runs on the room's own goroutine, one at a time, so nothing in here locks
// and nothing in here may block. The database reads it does are the exception that proves
// the rule: they are on a single local SQLite connection and take microseconds, and doing
// them anywhere else would mean a room whose state arrives after the frames that describe
// it.
type ffRealtime struct{ server *Server }

// OnJoin sends the arriving connection everything it needs and tells the room it is there.
func (h ffRealtime) OnJoin(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	s := h.server
	code := room.Key.ID

	lobby, err := s.fakeFiller.Lobby(ctx, code)
	if err != nil {
		client.Send(realtime.Errorf("that room does not exist"))
		client.Close()
		return
	}

	// Being at the table is the whole of the permission model here, the same as it is on
	// the HTTP routes. Without this, a join code would be a licence to watch somebody
	// else's game -- and in this game watching is cheating.
	if !lobby.Has(client.UserID) {
		client.Send(realtime.Errorf("you are not in that room"))
		client.Close()
		return
	}

	payload := ffStatePayload{
		Lobby:  s.newFFLobbyResponse(ctx, lobby),
		Online: room.Online(),
	}

	if lobby.GameID != nil {
		// Built for this client and no other. A snapshot is the one frame that carries a
		// board, so it is also the one frame that has to be redacted.
		if game, err := s.fakeFiller.Game(ctx, *lobby.GameID, client.UserID); err == nil {
			body := s.newFFGameResponse(ctx, game, client.UserID)
			payload.Game = &body
		}
	}

	client.Send(realtime.Message(typeState, payload))

	// Everybody else finds out somebody is here. The joiner already knows -- their own
	// snapshot carried the list.
	room.BroadcastExcept(client.UserID, realtime.Message(typePresence, ffPresencePayload{Online: room.Online()}))
}

// OnLeave puts somebody's light out.
//
// Nothing else, and here that is not a policy so much as the shape of the game: nothing
// is forfeited by losing a connection, because every round waits for everybody. A player
// who walks out of the room holds the table up until they come back, which is the price
// of a game with no clock in it.
func (h ffRealtime) OnLeave(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	room.Broadcast(realtime.Message(typePresence, ffPresencePayload{Online: room.Online()}))
}

// OnMessage does nothing, because Fake Filler has nothing a client says over the socket:
// there is no typing analogue, and writing and voting both go over HTTP where the
// validation and the status codes already live.
//
// Unknown frames are ignored rather than refused, the same as in League of Letters. A
// newer app talking to an older server is not a reason to hang up on somebody mid-game,
// and it leaves the door open for the frame this game does not have yet.
func (h ffRealtime) OnMessage(ctx context.Context, room *realtime.Room, client *realtime.Client, env realtime.Envelope) {
}

// ---------------------------------------------------------------------------
// Publishing from the HTTP side
//
// Each of these is a no-op when nobody is in the room, which is the right answer: there
// is no one to tell, and the next player to connect reads the state instead of a replay.
// ---------------------------------------------------------------------------

func (s *Server) publishFFLobby(code string, body ffLobbyResponse) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobby, ffLobbyPayload{Lobby: body}))
	})
}

func (s *Server) publishFFLobbyClosed(code string) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobbyClosed, nil))
	})
}

// publishFFRematch tells a finished room where its table has gone.
//
// Broadcast into the *old* room, which is the one everybody is still connected to: nobody
// can be listening to a code they have not been given yet.
func (s *Server) publishFFRematch(code, next string) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeRematch, ffRematchPayload{Code: next}))
	})
}

// publishFFGameStarted announces the game the room has become.
//
// The id and the lobby, not the board: every player's board is different, so each of them
// fetches their own. That the writing phase opens with a round trip rather than a frame is
// the cost of the server being the only thing that knows who wrote what.
func (s *Server) publishFFGameStarted(code, gameID string, body ffLobbyResponse) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeGameStarted, ffGameStartedPayload{
			GameID: gameID,
			Lobby:  body,
		}))
	})
}

// publishFFAnswerProgress is the writing phase's only frame: how many answers are in.
//
// Safe to broadcast precisely because it is counts. The body is the same one the writer
// was answered with, so nobody is holding a different number from anybody else.
func (s *Server) publishFFAnswerProgress(code string, body ffAnswerResponse) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeAnswerProgress, body))
	})
}

func (s *Server) publishFFVotingStarted(code, gameID string) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeVotingStarted, ffVotingStartedPayload{GameID: gameID}))
	})
}

// publishFFVote is a vote landing, and -- when it was the last one the round was waiting
// for -- the reveal and the game ending, in that order.
//
// One function rather than three publishers called in sequence from the handler, so the
// three frames cannot be sent out of order or one of them forgotten on a path that
// stopped early. The body is byte-identical to the one the voter was answered with: it
// carries nothing about any particular reader, which is what makes a reveal something the
// whole table can be sent at once.
func (s *Server) publishFFVote(code string, body ffVoteResponse) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		if !body.RoundOver {
			room.Broadcast(realtime.Message(typeVoteProgress, body))
			return
		}

		room.Broadcast(realtime.Message(typeRoundResult, body))

		if body.GameOver {
			room.Broadcast(realtime.Message(typeGameOver, ffGameOverPayload{Players: body.Players}))
		}
	})
}

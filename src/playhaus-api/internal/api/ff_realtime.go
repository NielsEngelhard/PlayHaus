package api

import (
	"context"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/realtime"
)

// The Fake Filler socket lives here rather than in the game package because this is where the wire shapes already are.

// ffRoom is the socket room a join code names.
func ffRoom(code string) realtime.Key {
	return realtime.Key{
		Namespace: joincode.FakeFiller.Namespace(),
		ID:        joincode.Normalize(code),
	}
}

// Message types, server to client. typeState, typePresence, typeLobby, typeLobbyClosed, typeGameStarted.
const (
	// typeAnswerProgress is somebody having filled a prompt in.
	typeAnswerProgress = "answer_progress"
	// typeVotingStarted is the last answer having landed.
	typeVotingStarted = "voting_started"
	// typeVoteProgress is a vote landing on the round being played.
	typeVoteProgress = "vote_progress"
	// typeRoundResult is the reveal: who wrote what, which one was true, who was fooled, and the scores it moved.
	typeRoundResult = "round_result"
)

// ffStatePayload is the whole picture, sent to one connection as it arrives.
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
type ffVotingStartedPayload struct {
	GameID string `json:"gameId"`
}

// ffGameOverPayload is the final scoreboard.
type ffGameOverPayload struct {
	Players []ffGamePlayerResponse `json:"players"`
}

// ffRematchPayload is the door out of a finished room: the code of the one that replaced it.
type ffRematchPayload struct {
	Code string `json:"code"`
}

// ffRealtime is the Server's socket behaviour for Fake Filler rooms.
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

	// Being at the table is the whole of the permission model here, the same as it is on the HTTP routes.
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
		// Built for this client and no other.
		if game, err := s.fakeFiller.Game(ctx, *lobby.GameID, client.UserID); err == nil {
			body := s.newFFGameResponse(ctx, game, client.UserID)
			payload.Game = &body
		}
	}

	client.Send(realtime.Message(typeState, payload))

	// Everybody else finds out somebody is here.
	room.BroadcastExcept(client.UserID, realtime.Message(typePresence, ffPresencePayload{Online: room.Online()}))
}

// OnLeave puts somebody's light out.
func (h ffRealtime) OnLeave(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	room.Broadcast(realtime.Message(typePresence, ffPresencePayload{Online: room.Online()}))
}

// OnMessage does nothing, because Fake Filler has nothing a client says over the socket.
func (h ffRealtime) OnMessage(ctx context.Context, room *realtime.Room, client *realtime.Client, env realtime.Envelope) {
}

// Publishing from the HTTP side Each of these is a no-op when nobody is in the room, which is the right answer.

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
func (s *Server) publishFFRematch(code, next string) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeRematch, ffRematchPayload{Code: next}))
	})
}

// publishFFGameStarted announces the game the room has become.
func (s *Server) publishFFGameStarted(code, gameID string, body ffLobbyResponse) {
	s.rt.In(ffRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeGameStarted, ffGameStartedPayload{
			GameID: gameID,
			Lobby:  body,
		}))
	})
}

// publishFFAnswerProgress is the writing phase's only frame: how many answers are in.
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

// publishFFVote sends the vote, the reveal and the game ending as one, so the three frames cannot go out of order.
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

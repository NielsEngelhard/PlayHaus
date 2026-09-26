package api

import (
	"context"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/realtime"
	"playhaus-api/internal/wittywars"
)

// The Witty Wars socket speaks the same message types as Fake Filler's, on its own namespace.

// wwRoom is the socket room a join code names.
func wwRoom(code string) realtime.Key {
	return realtime.Key{
		Namespace: joincode.WittyWars.Namespace(),
		ID:        joincode.Normalize(code),
	}
}

// wwStatePayload is the whole picture, sent to one connection as it arrives.
type wwStatePayload struct {
	Lobby  wwLobbyResponse `json:"lobby"`
	Game   *wwGameResponse `json:"game,omitempty"`
	Online []string        `json:"online"`
}

type wwPresencePayload struct {
	Online []string `json:"online"`
}

type wwLobbyPayload struct {
	Lobby wwLobbyResponse `json:"lobby"`
}

type wwGameStartedPayload struct {
	GameID string          `json:"gameId"`
	Lobby  wwLobbyResponse `json:"lobby"`
}

// wwVotingStartedPayload is the id of the game to go and re-read, and nothing else.
type wwVotingStartedPayload struct {
	GameID string `json:"gameId"`
}

// wwGameOverPayload is the final scoreboard.
type wwGameOverPayload struct {
	Players []wwGamePlayerResponse `json:"players"`
}

// wwRematchPayload is the door out of a finished room: the code of the one that replaced it.
type wwRematchPayload struct {
	Code string `json:"code"`
}

// wwRealtime is the Server's socket behaviour for Witty Wars rooms.
type wwRealtime struct{ server *Server }

// OnJoin sends the arriving connection everything it needs and tells the room it is there.
func (h wwRealtime) OnJoin(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	s := h.server
	code := room.Key.ID

	lobby, err := s.wittyWars.Lobby(ctx, code)
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

	payload := wwStatePayload{
		Lobby:  s.newWWLobbyResponse(ctx, lobby),
		Online: room.Online(),
	}

	if lobby.GameID != nil {
		// Built for this client and no other.
		if game, err := s.wittyWars.Game(ctx, *lobby.GameID, client.UserID); err == nil {
			body := s.newWWGameResponse(ctx, game, client.UserID)
			payload.Game = &body
		}
	}

	client.Send(realtime.Message(typeState, payload))

	// Everybody else finds out somebody is here.
	room.BroadcastExcept(client.UserID, realtime.Message(typePresence, wwPresencePayload{Online: room.Online()}))
}

// OnLeave puts somebody's light out.
func (h wwRealtime) OnLeave(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	room.Broadcast(realtime.Message(typePresence, wwPresencePayload{Online: room.Online()}))
}

// OnMessage does nothing, because Witty Wars has nothing a client says over the socket.
func (h wwRealtime) OnMessage(ctx context.Context, room *realtime.Room, client *realtime.Client, env realtime.Envelope) {
}

// Publishing from the HTTP side. Each of these is a no-op when nobody is in the room, which is the right answer.

func (s *Server) publishWWLobby(code string, body wwLobbyResponse) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobby, wwLobbyPayload{Lobby: body}))
	})
}

func (s *Server) publishWWLobbyClosed(code string) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobbyClosed, nil))
	})
}

// publishWWRematch tells a finished room where its table has gone.
func (s *Server) publishWWRematch(code, next string) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeRematch, wwRematchPayload{Code: next}))
	})
}

// publishWWGameStarted announces the game the room has become.
func (s *Server) publishWWGameStarted(code, gameID string, body wwLobbyResponse) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeGameStarted, wwGameStartedPayload{
			GameID: gameID,
			Lobby:  body,
		}))
	})
}

// publishWWAnswerProgress is the writing phase's only frame: how many answers are in.
func (s *Server) publishWWAnswerProgress(code string, body wwAnswerResponse) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeAnswerProgress, body))
	})
}

func (s *Server) publishWWVotingStarted(code, gameID string) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeVotingStarted, wwVotingStartedPayload{GameID: gameID}))
	})
}

// publishWWVote sends the vote and the reveal it opened. The game ending waits for the host.
func (s *Server) publishWWVote(code string, body wwVoteResponse) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		if !body.RoundOver {
			room.Broadcast(realtime.Message(typeVoteProgress, body))
			return
		}

		room.Broadcast(realtime.Message(typeRoundResult, body))
	})
}

// publishWWRoundAdvanced sends the move off the reveal and the game ending as one, so the two frames cannot go out of order.
func (s *Server) publishWWRoundAdvanced(code string, body wwAdvanceResponse) {
	s.rt.In(wwRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeRoundAdvanced, body))

		if body.Status == string(wittywars.GameCompleted) {
			room.Broadcast(realtime.Message(typeGameOver, wwGameOverPayload{Players: body.Players}))
		}
	})
}

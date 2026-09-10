package api

import (
	"context"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/realtime"
)

// The One of Us socket lives here rather than in the game package because this is where the wire shapes already are.

// oouRoom is the socket room a join code names, and every game frame goes on it rather than on the game id.
func oouRoom(code string) realtime.Key {
	return realtime.Key{
		Namespace: joincode.OneOfUs.Namespace(),
		ID:        joincode.Normalize(code),
	}
}

// typeRoundOpened is the reveal being left behind for the next round, which is the one beat Fake Filler does not have. Every other frame type is shared.
const typeRoundOpened = "round_opened"

// oouStatePayload is the whole picture, built for one connection as it arrives.
type oouStatePayload struct {
	Lobby  oouLobbyResponse `json:"lobby"`
	Game   *oouGameResponse `json:"game,omitempty"`
	Online []string         `json:"online"`
}

type oouPresencePayload struct {
	Online []string `json:"online"`
}

type oouLobbyPayload struct {
	Lobby oouLobbyResponse `json:"lobby"`
}

type oouGameStartedPayload struct {
	GameID string           `json:"gameId"`
	Lobby  oouLobbyResponse `json:"lobby"`
}

// oouVotingStartedPayload is the game to go and re-read, and nothing else: no two devices see the same round.
type oouVotingStartedPayload struct {
	GameID      string `json:"gameId"`
	RoundNumber int    `json:"roundNumber"`
}

// oouGameOverPayload is the verdict, which is all this game keeps -- there is no score.
type oouGameOverPayload struct {
	CiviliansWon *bool                   `json:"civiliansWon,omitempty"`
	Players      []oouGamePlayerResponse `json:"players"`
}

// oouRematchPayload is the door out of a finished room: the code of the one that replaced it.
type oouRematchPayload struct {
	Code string `json:"code"`
}

// oouRealtime is the Server's socket behaviour for One of Us rooms.
type oouRealtime struct{ server *Server }

// OnJoin sends the arriving connection its own board and tells the room it is there.
func (h oouRealtime) OnJoin(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	s := h.server
	code := room.Key.ID

	lobby, err := s.oneOfUs.Lobby(ctx, code)
	if err != nil {
		client.Send(realtime.Errorf("that room does not exist"))
		client.Close()
		return
	}

	// There is no shared screen in this mode, so a spectator would be reading the anonymous answers.
	if !lobby.Has(client.UserID) {
		client.Send(realtime.Errorf("you are not in that room"))
		client.Close()
		return
	}

	payload := oouStatePayload{
		Lobby:  s.newOOULobbyResponse(ctx, lobby),
		Online: room.Online(),
	}

	if lobby.GameID != nil {
		// Built for this client and no other: the prompt on it is theirs.
		if game, err := s.oneOfUs.MultiDeviceGame(ctx, *lobby.GameID, client.UserID); err == nil {
			body := s.newOOUGameResponse(ctx, game, client.UserID)
			payload.Game = &body
		}
	}

	client.Send(realtime.Message(typeState, payload))

	// Everybody else finds out somebody is here.
	room.BroadcastExcept(client.UserID, realtime.Message(typePresence, oouPresencePayload{Online: room.Online()}))
}

// OnLeave puts somebody's light out.
func (h oouRealtime) OnLeave(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	room.Broadcast(realtime.Message(typePresence, oouPresencePayload{Online: room.Online()}))
}

// OnMessage does nothing, because One of Us has nothing a client says over the socket.
func (h oouRealtime) OnMessage(ctx context.Context, room *realtime.Room, client *realtime.Client, env realtime.Envelope) {
}

// Publishing from the HTTP side Each of these is a no-op when nobody is in the room, which is the right answer.

func (s *Server) publishOOULobby(code string, body oouLobbyResponse) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobby, oouLobbyPayload{Lobby: body}))
	})
}

func (s *Server) publishOOULobbyClosed(code string) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobbyClosed, nil))
	})
}

// publishOOURematch tells a finished room where its table has gone.
func (s *Server) publishOOURematch(code, next string) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeRematch, oouRematchPayload{Code: next}))
	})
}

// publishOOUGameStarted announces the game the room has become, without any of the deal in it.
func (s *Server) publishOOUGameStarted(code, gameID string, body oouLobbyResponse) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeGameStarted, oouGameStartedPayload{
			GameID: gameID,
			Lobby:  body,
		}))
	})
}

// publishOOUAnswerProgress is the answer phase's only frame: how many are in, never whose.
func (s *Server) publishOOUAnswerProgress(code string, body oouAnswerProgressResponse) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeAnswerProgress, body))
	})
}

func (s *Server) publishOOUVotingStarted(code, gameID string, roundNumber int) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeVotingStarted, oouVotingStartedPayload{
			GameID:      gameID,
			RoundNumber: roundNumber,
		}))
	})
}

// publishOOUVote sends the vote, the reveal and the game ending as one, so the three frames cannot go out of order.
func (s *Server) publishOOUVote(code string, body oouVoteResponse) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		if !body.RoundClosed {
			room.Broadcast(realtime.Message(typeVoteProgress, body))
			return
		}

		room.Broadcast(realtime.Message(typeRoundResult, body))

		if body.GameOver {
			room.Broadcast(realtime.Message(typeGameOver, oouGameOverPayload{
				CiviliansWon: body.CiviliansWon,
				Players:      body.Players,
			}))
		}
	})
}

// publishOOURoundOpened is the table leaving a reveal behind.
func (s *Server) publishOOURoundOpened(code string, body oouRoundOpenedResponse) {
	s.rt.In(oouRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeRoundOpened, body))
	})
}

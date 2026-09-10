package api

import (
	"context"
	"encoding/json"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/realtime"
)

// The PubquizR socket lives here rather than in the game package because this is where the wire shapes already are.

// pqRoom is the socket room a join code names.
func pqRoom(code string) realtime.Key {
	return realtime.Key{
		Namespace: joincode.PubquizR.Namespace(),
		ID:        joincode.Normalize(code),
	}
}

// Message types, server to client. typeState, typePresence, typeLobby, typeLobbyClosed, typeGameStarted are shared.
const (
	// typeControl is intra-turn rendering state, authored by a phone and relayed to the room untouched.
	typeControl = "control"
	// typeSession is the evening having moved: a settle landed, and this is the table it left behind.
	typeSession = "session"
	// typeSessionOver is the last question of the last round having been settled.
	typeSessionOver = "session_over"
	// typeClosestProgress is how many of round 3's numbers are in, and carries no number.
	typeClosestProgress = "closest_progress"
	// typeClosestReveal is the one frame round 3's numbers ever travel in, sent once the question is closed.
	typeClosestReveal = "closest_reveal"
)

// pqStatePayload is the whole picture, sent to one connection as it arrives.
type pqStatePayload struct {
	Lobby pqLobbyResponse `json:"lobby"`
	// Session is the evening this room dealt, and is absent while the room is still gathering.
	Session *quizSessionResponse `json:"session,omitempty"`
	// Seat is who the recipient is at this table, and -1 for the shared screen, which holds none.
	Seat   int      `json:"seat"`
	Online []string `json:"online"`
	// Control is every retained frame, so a device that arrives mid-question sees the question the room is on.
	Control []json.RawMessage `json:"control,omitempty"`
	// Closest is round 3's typing, so a screen reloading mid-question learns how many numbers are in without learning one.
	Closest *pqClosestProgressPayload `json:"closest,omitempty"`
	// Reveal is the round 3 result the room is still showing, which is why the numbers survive a reload of the screen they are on.
	Reveal *pqClosestRevealPayload `json:"reveal,omitempty"`
}

// pqSeatGuess is one seat's number, which reaches a client only once the question it was typed for is closed.
type pqSeatGuess struct {
	Seat  int     `json:"seat"`
	Value float64 `json:"value"`
}

// pqClosestProgressPayload is how far round 3's typing has got. Seats only: a number here would be a number leaked to the seats still typing.
type pqClosestProgressPayload struct {
	SessionQuestionID string `json:"sessionQuestionId"`
	SeatsIn           []int  `json:"seatsIn"`
	GuessesIn         int    `json:"guessesIn"`
	GuessesWanted     int    `json:"guessesWanted"`
}

// pqClosestRevealPayload is what everybody guessed and who was nearest.
type pqClosestRevealPayload struct {
	SessionQuestionID string        `json:"sessionQuestionId"`
	Guesses           []pqSeatGuess `json:"guesses"`
	WinningSeats      []int         `json:"winningSeats"`
}

type pqPresencePayload struct {
	Online []string `json:"online"`
}

type pqLobbyPayload struct {
	Lobby pqLobbyResponse `json:"lobby"`
}

type pqSessionStartedPayload struct {
	SessionID string          `json:"sessionId"`
	Lobby     pqLobbyResponse `json:"lobby"`
}

// pqRealtime is the Server's socket behaviour for PubquizR rooms.
type pqRealtime struct{ server *Server }

// pqRoomState is what a room remembers between frames. Room goroutine only, so it needs no locking.
type pqRoomState struct {
	// seats is a user id to a seat, and -1 for a screen, which holds none. Seats never move, so an entry never goes stale.
	seats map[string]int
	// control is the last frame per kind, replayed to whoever joins next -- the room is the room's memory.
	control map[string]json.RawMessage
	// order is the kinds in the order they were first retained, so a replay arrives the way it was authored.
	order []string
	// closest and reveal are round 3's two server frames, held for the same reason control frames are, and never both at once.
	closest *pqClosestProgressPayload
	reveal  *pqClosestRevealPayload
}

func pqStateOf(room *realtime.Room) *pqRoomState {
	if existing, ok := room.State().(*pqRoomState); ok {
		return existing
	}
	fresh := &pqRoomState{
		seats:   map[string]int{},
		control: map[string]json.RawMessage{},
	}
	room.SetState(fresh)
	return fresh
}

// retain keeps one frame as the room's answer for its kind.
func (st *pqRoomState) retain(kind string, frame json.RawMessage) {
	if _, seen := st.control[kind]; !seen {
		st.order = append(st.order, kind)
	}
	st.control[kind] = frame
}

// retained is every frame the room is holding, oldest kind first.
func (st *pqRoomState) retained() []json.RawMessage {
	frames := make([]json.RawMessage, 0, len(st.order))
	for _, kind := range st.order {
		frames = append(frames, st.control[kind])
	}
	return frames
}

// OnJoin sends the arriving connection everything it needs and tells the room it is there.
func (h pqRealtime) OnJoin(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	s := h.server
	code := room.Key.ID

	lobby, err := s.pubquizr.Lobby(ctx, code)
	if err != nil {
		client.Send(realtime.Errorf("that room does not exist"))
		client.Close()
		return
	}

	// Anybody with the code may look: the code is displayed on a television to a room full of people, and looking is what the shared screen does.
	seat := lobby.SeatOf(client.UserID)

	st := pqStateOf(room)
	st.seats[client.UserID] = seat

	// The evening too, when there is one: a device arriving mid-quiz must not have to ask twice.
	var session *quizSessionResponse
	if lobby.SessionID != nil {
		body, err := s.pqSessionBody(ctx, *lobby.SessionID)
		if err != nil {
			s.log.Error("pq state session", "err", err)
		} else {
			session = &body
		}
	}

	// Built for this client and no other: the seat is per-recipient.
	client.Send(realtime.Message(typeState, pqStatePayload{
		Lobby:   newPQLobbyResponse(lobby),
		Session: session,
		Seat:    seat,
		Online:  room.Online(),
		Control: st.retained(),
		Closest: st.closest,
		Reveal:  st.reveal,
	}))

	// Everybody else finds out somebody is here.
	room.BroadcastExcept(client.UserID, realtime.Message(typePresence, pqPresencePayload{Online: room.Online()}))
}

// OnLeave puts somebody's light out. A phone dropping mid-round forfeits nothing -- the quizmaster can always settle for it.
func (h pqRealtime) OnLeave(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	room.Broadcast(realtime.Message(typePresence, pqPresencePayload{Online: room.Online()}))
}

// OnMessage relays one control frame, and does no I/O: the seat comes out of the room's own map.
func (h pqRealtime) OnMessage(ctx context.Context, room *realtime.Room, client *realtime.Client, env realtime.Envelope) {
	// Anything else is ignored rather than refused, so an older client cannot be broken by a type it does not send.
	if env.Type != typeControl {
		return
	}

	st := pqStateOf(room)
	seat, sitting := st.seats[client.UserID]
	if !sitting || seat < 0 {
		// A screen authors nothing.
		return
	}

	var frame map[string]json.RawMessage
	if err := json.Unmarshal(env.Data, &frame); err != nil {
		return
	}

	kind := ""
	if raw, ok := frame["kind"]; ok {
		_ = json.Unmarshal(raw, &kind)
	}
	if kind == "" {
		return
	}

	// Stamped rather than trusted.
	stamped, err := json.Marshal(seat)
	if err != nil {
		return
	}
	frame["seat"] = stamped

	relayed, err := json.Marshal(frame)
	if err != nil {
		return
	}

	st.retain(kind, relayed)
	room.BroadcastExcept(client.UserID, realtime.Envelope{Type: typeControl, Data: relayed})
}

// Publishing from the HTTP side. Each of these is a no-op when nobody is in the room, which is the right answer.

func (s *Server) publishPQLobby(code string, body pqLobbyResponse) {
	s.rt.In(pqRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobby, pqLobbyPayload{Lobby: body}))
	})
}

func (s *Server) publishPQLobbyClosed(code string) {
	s.rt.In(pqRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeLobbyClosed, nil))
	})
}

// publishPQSessionStarted announces the evening the room has become.
func (s *Server) publishPQSessionStarted(code, sessionID string, body pqLobbyResponse) {
	s.rt.In(pqRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeGameStarted, pqSessionStartedPayload{
			SessionID: sessionID,
			Lobby:     body,
		}))
	})
}

// publishPQClosestProgress says how many of round 3's numbers are in, and retires whatever result the room was still showing.
func (s *Server) publishPQClosestProgress(code string, body pqClosestProgressPayload) {
	s.rt.In(pqRoom(code), func(room *realtime.Room) {
		st := pqStateOf(room)
		st.closest, st.reveal = &body, nil

		room.Broadcast(realtime.Message(typeClosestProgress, body))
	})
}

// publishPQClosestReveal hands the room the numbers, which is the only moment any of them leaves the server.
func (s *Server) publishPQClosestReveal(code string, body pqClosestRevealPayload) {
	s.rt.In(pqRoom(code), func(room *realtime.Room) {
		st := pqStateOf(room)
		st.closest, st.reveal = nil, &body

		room.Broadcast(realtime.Message(typeClosestReveal, body))
	})
}

// publishPQSession sends the settled evening, and the quiz ending with it when it has -- one closure, so the two cannot arrive the wrong way round.
func (s *Server) publishPQSession(code string, body quizSessionResponse) {
	s.rt.In(pqRoom(code), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeSession, body))

		if body.Status != string(pubquizr.SessionInProgress) {
			room.Broadcast(realtime.Message(typeSessionOver, body))
		}
	})
}

package realtime

import (
	"context"
	"slices"
	"time"
)

// inbound is one frame, plus who sent it.
type inbound struct {
	client *Client
	env    Envelope
}

// Room is a set of connections that hear each other, and the goroutine that owns
// them.
//
// Everything that touches a room's state -- who is in it, what the game is doing,
// when the turn runs out -- happens on that one goroutine, reached through the
// channels below. That is the whole concurrency design: there are no locks on the
// broadcast path, a handler is never called twice at once, and a handler therefore
// never has to think about races in its own state.
type Room struct {
	Key Key

	hub     *Hub
	handler Handler

	clients map[*Client]struct{}

	byUser map[string]int
	state  any
	timer  *time.Timer

	inbox   chan inbound
	join    chan *Client
	leave   chan *Client
	actions chan func(*Room)
	fired   chan func(*Room)

	// ctx ends when the hub closes. done is closed once run() has returned, which
	// is what makes a reaped room detectably dead.
	ctx  context.Context
	done chan struct{}
}

func newRoom(ctx context.Context, hub *Hub, key Key, handler Handler) *Room {
	return &Room{
		Key:     key,
		hub:     hub,
		handler: handler,
		clients: make(map[*Client]struct{}),
		byUser:  make(map[string]int),
		inbox:   make(chan inbound, sendBuffer),
		join:    make(chan *Client),
		leave:   make(chan *Client),
		actions: make(chan func(*Room), sendBuffer),
		fired:   make(chan func(*Room), 1),
		ctx:     ctx,
		done:    make(chan struct{}),
	}
}

// run is the room. It exits when the room empties, which is also when the hub
// forgets about it: a room is only ever a live audience, and everything worth
// keeping is in the database.
func (r *Room) run() {
	defer close(r.done)
	defer r.stopTimer()

	for {
		select {
		case <-r.ctx.Done():
			for client := range r.clients {
				client.abort()
			}
			r.hub.forget(r.Key)
			return

		case client := <-r.join:
			r.clients[client] = struct{}{}
			r.byUser[client.UserID]++
			r.handler.OnJoin(r.ctx, r, client)

		case client := <-r.leave:
			if _, in := r.clients[client]; !in {
				continue
			}
			delete(r.clients, client)
			if r.byUser[client.UserID]--; r.byUser[client.UserID] <= 0 {
				delete(r.byUser, client.UserID)
			}
			r.handler.OnLeave(r.ctx, r, client)

			if len(r.clients) == 0 {
				// Reaped rather than kept warm. Anything a room was in the middle
				// of -- a turn counting down -- is recovered from the database by
				// the first player back, and a room nobody is watching is a
				// goroutine and a timer with nothing to tell.
				r.hub.forget(r.Key)
				return
			}

		case message := <-r.inbox:
			// A frame from a connection the room has already let go of. Possible:
			// the read pump and the leave both had one in flight.
			if _, in := r.clients[message.client]; !in {
				continue
			}
			r.handler.OnMessage(r.ctx, r, message.client, message.env)

		case action := <-r.actions:
			action(r)

		case action := <-r.fired:
			action(r)
		}
	}
}

// Broadcast sends one frame to everyone in the room.
func (r *Room) Broadcast(env Envelope) {
	r.Do(func(room *Room) {
		for client := range room.clients {
			client.Send(env)
		}
	})
}

// BroadcastExcept sends to everyone but one player -- all of their connections, so
// the tab you are typing in and the one you left open both stay out of it.
//
// This is what live typing rides on: the person typing already has the letters on
// their own screen, and echoing them back would fight their keyboard.
func (r *Room) BroadcastExcept(userID string, env Envelope) {
	r.Do(func(room *Room) {
		for client := range room.clients {
			if client.UserID == userID {
				continue
			}
			client.Send(env)
		}
	})
}

// Send delivers to every connection one player has open.
func (r *Room) Send(userID string, env Envelope) {
	r.Do(func(room *Room) {
		for client := range room.clients {
			if client.UserID == userID {
				client.Send(env)
			}
		}
	})
}

// Do runs fn on the room's own goroutine.
//
// This is the door into a room from outside -- an HTTP handler that has just
// written a guess, say. Inside fn, the room's state is yours alone and needs no
// locking. Do not block in there: everything else the room has to do is waiting.
//
// Calling Do from inside fn would deadlock on an unbuffered send, so the queue is
// buffered and a full queue drops the work rather than stalling the caller.
func (r *Room) Do(fn func(*Room)) {
	select {
	case <-r.done:
	case r.actions <- fn:
	default:
	}
}

// After schedules fn to run on the room goroutine once d has passed, replacing
// whatever was scheduled before it. One timer per room is all this needs -- a room
// is waiting for at most one thing at a time, which for League of Letters is the
// turn running out.
//
// The timer dies with the room, so a deadline that passes while nobody is
// connected simply never fires. That is deliberate: see the handler's resume.
func (r *Room) After(d time.Duration, fn func(*Room)) {
	r.Do(func(room *Room) {
		room.stopTimer()
		room.timer = time.AfterFunc(d, func() {
			// Handed back through its own channel rather than run here: AfterFunc
			// runs fn on a goroutine of its own, and everything touching room
			// state has to come back to the room's.
			select {
			case <-room.done:
			case room.fired <- fn:
			default:
			}
		})
	})
}

// CancelTimer drops whatever After scheduled.
func (r *Room) CancelTimer() {
	r.Do(func(room *Room) { room.stopTimer() })
}

func (r *Room) stopTimer() {
	if r.timer != nil {
		r.timer.Stop()
		r.timer = nil
	}
}

// Online is who has at least one connection open, sorted so the same room always
// serialises the same way and a client can compare two presence frames cheaply.
//
// Only safe on the room goroutine -- inside a Do, or inside a handler callback.
func (r *Room) Online() []string {
	online := make([]string, 0, len(r.byUser))
	for userID := range r.byUser {
		online = append(online, userID)
	}
	slices.Sort(online)
	return online
}

// IsOnline reports whether a player has any connection open. Room goroutine only.
func (r *Room) IsOnline(userID string) bool { return r.byUser[userID] > 0 }

// State and SetState are the handler's own scratch space, hung off the room so a
// handler can stay stateless. Room goroutine only, which is what makes an
// unsynchronised `any` safe here.
func (r *Room) State() any       { return r.state }
func (r *Room) SetState(v any)   { r.state = v }
func (r *Room) Handler() Handler { return r.handler }

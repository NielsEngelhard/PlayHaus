package realtime

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// sendBuffer is how many frames may be queued for one connection before it is
// considered hopeless. A room broadcasts from a single goroutine, so a client that
// stops draining would otherwise hold up everyone else in the room -- the buffer
// is what turns "one player on a bad train" into that player's problem alone.
const sendBuffer = 32

// pingEvery is how often the server checks a connection is still there, and
// pingTimeout is how long it waits for the pong.
//
// This is what the live status dot is made of. A browser answers a ping frame
// without the page being involved, so a tab that has been closed, a phone that
// went into a tunnel and a laptop that was shut all stop answering within one
// interval -- whereas TCP on its own would sit there for minutes.
const (
	pingEvery   = 20 * time.Second
	pingTimeout = 10 * time.Second
)

// readLimit caps one inbound frame. The only thing clients send is a few letters
// of a half-typed word, so this is generous by three orders of magnitude and
// exists purely so a hostile client cannot ask the server to allocate.
const readLimit = 4 << 10

// Client is one open connection: one person, in one room, on one device.
//
// The same user may have several -- a phone and a laptop, or two tabs -- which is
// why presence is counted per user rather than stored per connection.
type Client struct {
	// UserID is who this connection belongs to, resolved from their session token
	// before the socket was accepted. Never read off a frame.
	UserID string

	conn *websocket.Conn
	room *Room

	// send is drained by writePump. Buffered, and dropping a frame here closes the
	// connection rather than blocking the room that queued it.
	send chan []byte

	// closing is "no more frames after the ones already queued". The write pump
	// drains what is left and then hangs up properly.
	closing   chan struct{}
	closeOnce sync.Once

	// dead is the connection actually gone. Separate from closing so that a
	// graceful goodbye and a connection that has already failed are different
	// things -- the first still has frames to deliver.
	dead     chan struct{}
	deadOnce sync.Once
}

func newClient(userID string, conn *websocket.Conn, room *Room) *Client {
	return &Client{
		UserID:  userID,
		conn:    conn,
		room:    room,
		send:    make(chan []byte, sendBuffer),
		closing: make(chan struct{}),
		dead:    make(chan struct{}),
	}
}

// Room is the room this connection is in. Handlers get it passed to them, but a
// client held onto past a callback needs a way back to it.
func (c *Client) Room() *Room { return c.room }

// Send queues one frame. Never blocks: a client whose buffer is full is one that
// has stopped keeping up, and the room has five other people waiting on it.
func (c *Client) Send(env Envelope) {
	encoded, err := json.Marshal(env)
	if err != nil {
		// Envelope.Data is already raw JSON and Type is a string, so this cannot
		// fail for anything Message built. Nothing useful to do with it here.
		return
	}

	select {
	case <-c.closing:
	case <-c.dead:
	case c.send <- encoded:
	default:
		// Backed up. Hanging up is kinder than the alternative -- the client
		// reconnects on its own and gets a fresh snapshot, whereas a room that
		// waited would stall for everybody.
		c.abort()
	}
}

// Close hangs up on this connection, politely: whatever is already queued goes out
// first, and then the socket is closed with a proper close frame.
//
// This is a handler's way of turning somebody away -- Send the reason, then Close --
// and the draining is the point. Closing the connection outright would deliver the
// refusal to nobody, leaving the client to guess why it was dropped.
func (c *Client) Close() {
	c.closeOnce.Do(func() { close(c.closing) })
}

// abort hangs up now, without delivering anything still queued. For connections
// that have already failed, where a close handshake would mean waiting on the very
// peer that is not answering.
func (c *Client) abort() {
	c.Close()
	c.deadOnce.Do(func() {
		close(c.dead)
		_ = c.conn.CloseNow()
	})
}

// readPump turns inbound frames into work for the room goroutine, and returns when
// the connection ends -- which is the signal that this client has left.
//
// It is the connection's main goroutine: hub.Serve blocks on it, so its return is
// what lets the HTTP handler finish and the socket actually close.
func (c *Client) readPump(ctx context.Context) {
	c.conn.SetReadLimit(readLimit)

	for {
		typ, data, err := c.conn.Read(ctx)
		if err != nil {
			// Every ending arrives here: a clean going-away, a dropped connection,
			// the server shutting down. None of them are worth a log line on their
			// own -- the room reports the departure.
			return
		}
		if typ != websocket.MessageText {
			continue
		}

		var env Envelope
		if err := json.Unmarshal(data, &env); err != nil {
			c.Send(Errorf("could not read that message"))
			continue
		}
		if env.Type == "" {
			continue
		}

		// Handed to the room rather than handled here, so that everything touching
		// room state -- membership, the game, the turn timer -- runs on one
		// goroutine and needs no locking.
		select {
		case <-ctx.Done():
			return
		case <-c.dead:
			return
		case c.room.inbox <- inbound{client: c, env: env}:
		}
	}
}

// writePump owns every write to this connection, which is what makes concurrent
// Send calls safe, and pings on a ticker so a connection that has quietly died is
// noticed rather than waited on.
func (c *Client) writePump(ctx context.Context) {
	ticker := time.NewTicker(pingEvery)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return

		case <-c.closing:
			c.drainAndClose(ctx)
			return

		case frame := <-c.send:
			// Bounded on purpose. A write that cannot complete in this long is a
			// peer that has stopped reading, and the buffer above has already
			// given them thirty-two frames of grace.
			writeCtx, cancel := context.WithTimeout(ctx, pingTimeout)
			err := c.conn.Write(writeCtx, websocket.MessageText, frame)
			cancel()

			if err != nil {
				c.abort()
				return
			}

		case <-ticker.C:
			// Ping blocks until the pong comes back, so this one call is both
			// halves of the health check.
			pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
			err := c.conn.Ping(pingCtx)
			cancel()

			if err != nil && !errors.Is(err, context.Canceled) {
				c.abort()
				return
			}
		}
	}
}

// drainAndClose delivers whatever is already queued and then says goodbye
// properly, so a client that is being turned away learns why.
//
// Bounded twice over: only the frames already in the buffer, and only for as long
// as one write timeout allows. A peer that has stopped reading does not get to hold
// this goroutine open.
func (c *Client) drainAndClose(ctx context.Context) {
	defer c.deadOnce.Do(func() { close(c.dead) })

	deadline, cancel := context.WithTimeout(ctx, pingTimeout)
	defer cancel()

	for {
		select {
		case frame := <-c.send:
			if err := c.conn.Write(deadline, websocket.MessageText, frame); err != nil {
				_ = c.conn.CloseNow()
				return
			}
		default:
			// Nothing left. A real close frame rather than dropping the socket:
			// the client can tell "the server hung up on me" from "my connection
			// broke", and only the second is worth reconnecting over.
			_ = c.conn.Close(websocket.StatusNormalClosure, "")
			return
		}
	}
}

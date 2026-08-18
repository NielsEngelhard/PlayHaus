package realtime

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"

	"github.com/coder/websocket"
)

// Key names one room. The namespace picks the handler -- and so the game -- and the
// id picks the room within it, which for League of Letters is the lobby's join code.
//
// Two halves rather than one opaque string so that adding PubquizR is registering a
// handler under "quiz" and nothing else: the two games cannot collide on an id, and
// neither has to prefix its own.
type Key struct {
	Namespace string
	ID        string
}

func (k Key) String() string { return k.Namespace + ":" + k.ID }

// ParseKey reads the `room` query parameter, which is written "namespace:id".
func ParseKey(raw string) (Key, error) {
	namespace, id, found := strings.Cut(raw, ":")
	if !found || namespace == "" || id == "" {
		return Key{}, fmt.Errorf("room %q is not namespace:id", raw)
	}
	return Key{Namespace: namespace, ID: id}, nil
}

// Handler is what a game implements to own a namespace.
//
// Every method runs on the room's goroutine, one at a time, so the room passed in
// is safe to read and write directly and a handler needs no locking of its own. The
// flip side: none of them may block. Work that has to wait -- a database write --
// belongs on the HTTP side, with the result pushed back in through Hub.In.
type Handler interface {
	// OnJoin is a connection arriving. The room already counts it, so Room.Online
	// includes this player. A handler that will not have them should Send a refusal
	// and call Close on the client.
	OnJoin(ctx context.Context, room *Room, client *Client)

	// OnMessage is one frame from one connection. Anything a handler does not
	// recognise should be ignored rather than refused -- a newer client talking to
	// an older server is not an error worth closing over.
	OnMessage(ctx context.Context, room *Room, client *Client, env Envelope)

	// OnLeave is a connection going, for any reason. The room has already stopped
	// counting it, so Room.Online no longer includes this connection.
	OnLeave(ctx context.Context, room *Room, client *Client)
}

// ErrUnknownNamespace is a room in a namespace no game has claimed. Almost always a
// client asking for something this build does not have.
var ErrUnknownNamespace = errors.New("unknown room namespace")

// Hub is every live room in the process.
//
// The lock here is only ever held to find or create a room -- once a caller has one,
// everything happens on that room's goroutine. So the contended path is a map lookup
// per connection and per published event, not per frame.
type Hub struct {
	mu       sync.Mutex
	rooms    map[Key]*Room
	handlers map[string]Handler

	log    *slog.Logger
	ctx    context.Context
	cancel context.CancelFunc
}

func NewHub(log *slog.Logger) *Hub {
	ctx, cancel := context.WithCancel(context.Background())

	return &Hub{
		rooms:    make(map[Key]*Room),
		handlers: make(map[string]Handler),
		log:      log,
		ctx:      ctx,
		cancel:   cancel,
	}
}

// Register claims a namespace. Called at startup, before anything is serving, which
// is why it does not guard against a second registration -- two games claiming one
// namespace is a wiring mistake, and it should be loud.
func (h *Hub) Register(namespace string, handler Handler) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, taken := h.handlers[namespace]; taken {
		panic("realtime: namespace already registered: " + namespace)
	}
	h.handlers[namespace] = handler
}

// Serve runs one connection until it ends, and is what the HTTP handler blocks on.
//
// The room is made on the first arrival and forgotten after the last departure, so
// nothing has to be torn down by hand and an idle game costs nothing.
func (h *Hub) Serve(ctx context.Context, key Key, userID string, conn *websocket.Conn) error {
	room, err := h.room(key)
	if err != nil {
		conn.Close(websocket.StatusPolicyViolation, "unknown room")
		return err
	}

	// Ends when the connection ends, the hub closes, or the request is cancelled --
	// whichever comes first -- so neither pump can outlive any of the three.
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	go func() {
		select {
		case <-h.ctx.Done():
			cancel()
		case <-ctx.Done():
		}
	}()

	client := newClient(userID, conn, room)

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-room.done:
		// Reaped between the lookup and here. One retry gets a fresh room; there is
		// no loop, because a second miss means the hub is shutting down.
		return errors.New("realtime: room closed while joining")
	case room.join <- client:
	}

	// However this connection ends, the room has to be told, and it has to be told
	// exactly once.
	defer func() {
		client.abort()
		select {
		case <-room.done:
		case room.leave <- client:
		}
	}()

	go client.writePump(ctx)

	// Blocks until the connection is finished. That is the whole lifetime.
	client.readPump(ctx)

	return nil
}

// In runs fn on a room's goroutine, if that room has anyone in it.
//
// This is how the rest of the API talks to a room: a handler writes a guess, then
// publishes what happened. A room with nobody in it is not an error -- there is
// simply nobody to tell, and the next player to connect reads the state instead.
func (h *Hub) In(key Key, fn func(*Room)) {
	h.mu.Lock()
	room, live := h.rooms[key]
	h.mu.Unlock()

	if !live {
		return
	}
	room.Do(fn)
}

// Has reports whether a room currently has an audience.
func (h *Hub) Has(key Key) bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	_, live := h.rooms[key]
	return live
}

// room finds or opens one.
func (h *Hub) room(key Key) (*Room, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, live := h.rooms[key]; live {
		return room, nil
	}

	handler, known := h.handlers[key.Namespace]
	if !known {
		return nil, fmt.Errorf("%w: %s", ErrUnknownNamespace, key.Namespace)
	}

	room := newRoom(h.ctx, h, key, handler)
	h.rooms[key] = room
	go room.run()

	h.log.Debug("room opened", "room", key.String())

	return room, nil
}

// forget drops a room from the map. Called by the room itself as it exits, and
// guarded on identity: a room that reopened under the same key while this one was
// finishing must not be deleted by its predecessor.
func (h *Hub) forget(key Key) {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(h.rooms, key)
	h.log.Debug("room closed", "room", key.String())
}

// Close ends every room and every connection in them. Called on shutdown, before
// the HTTP server stops, so sockets are hung up rather than cut.
func (h *Hub) Close() {
	h.cancel()
}

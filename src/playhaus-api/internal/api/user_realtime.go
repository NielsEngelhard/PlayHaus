package api

import (
	"context"

	"playhaus-api/internal/realtime"
)

// The personal room: one per signed-in player, for things that reach them wherever they are rather than in a game.

// userNamespace names no game, which is why it lives here and not in joincode.
const userNamespace = "user"

// userRoom is somebody's own room. websocket.go rewrites the id to the authenticated caller, so this can only ever be reached by its owner.
func userRoom(userID string) realtime.Key {
	return realtime.Key{Namespace: userNamespace, ID: userID}
}

// typeInvite is a friend asking you into a room. The row is already stored -- this only says "fetch now".
const typeInvite = "invite"

// typeSync says the same thing to somebody who has just arrived, since anything sent while they were away is waiting in a row rather than in the socket.
const typeSync = "sync"

// userRealtime is the Server's socket behaviour for personal rooms.
type userRealtime struct{ server *Server }

// OnJoin is the belt to websocket.go's braces: the id cannot disagree, and if it ever did this refuses rather than serves.
func (h userRealtime) OnJoin(ctx context.Context, room *realtime.Room, client *realtime.Client) {
	// An error frame specifically -- openSocket retries forever on anything else.
	if room.Key.ID != client.UserID {
		client.Send(realtime.Errorf("that is not your room"))
		client.Close()
		return
	}

	client.Send(realtime.Message(typeSync, nil))
}

// OnLeave does nothing: a personal room has no presence to announce.
func (h userRealtime) OnLeave(ctx context.Context, room *realtime.Room, client *realtime.Client) {}

// OnMessage does nothing: everything a client has to say goes over HTTP.
func (h userRealtime) OnMessage(ctx context.Context, room *realtime.Room, client *realtime.Client, env realtime.Envelope) {
}

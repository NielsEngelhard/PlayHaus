package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/coder/websocket"

	"playhaus-api/internal/joincode"
)

// The PubquizR socket, and in particular screenOnline: the host's lobby is blocked behind a shared screen actually being connected, so these say what connected means.

// dialPQRoom is dialRoom's sibling for this game's namespace.
func dialPQRoom(t *testing.T, srv *httptest.Server, code, token string) *socket {
	t.Helper()

	url := strings.Replace(srv.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=" + joincode.PubquizR.Namespace() + ":" + code + "&token=" + token

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial %s: %v", code, err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	return &socket{t: t, conn: conn}
}

// pqScreenRoom is a room of two asking for a shared screen, and deliberately not dealt: pairing happens before the deal.
func pqScreenRoom(t *testing.T, h http.Handler) (pqLobbyResponse, sessionResponse, sessionResponse) {
	t.Helper()

	host := newGuestSession(t, h)
	guest := newGuestSession(t, h)

	rec := do(t, h, http.MethodPost, pqLobbiesPath, `{"locale":"nl","hostScreen":true}`, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	lobby := decodeBody[pqLobbyResponse](t, rec)

	rec = do(t, h, http.MethodPost, pqLobbiesPath+"/"+lobby.Code+"/players", `{}`, guest.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("join lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	return lobby, host, guest
}

func TestPQSocketOpensSayingNoScreenIsConnected(t *testing.T) {
	h := newTestServer(t)
	live := liveServer(t, h)
	lobby, host, _ := pqScreenRoom(t, h)

	state := into[pqStatePayload](t, dialPQRoom(t, live, lobby.Code, host.Token).await(typeState))

	if state.Seat != 0 {
		t.Fatalf("host seat = %d, want 0", state.Seat)
	}
	if state.ScreenOnline {
		t.Error("screenOnline = true with nothing but the host connected, want false")
	}
}

func TestPQSocketDoesNotMistakeAPhoneForTheScreen(t *testing.T) {
	h := newTestServer(t)
	live := liveServer(t, h)
	lobby, host, guest := pqScreenRoom(t, h)

	hostConn := dialPQRoom(t, live, lobby.Code, host.Token)
	hostConn.await(typeState)

	guestConn := dialPQRoom(t, live, lobby.Code, guest.Token)
	if seat := into[pqStatePayload](t, guestConn.await(typeState)).Seat; seat != 1 {
		t.Fatalf("guest seat = %d, want 1", seat)
	}

	presence := into[pqPresencePayload](t, hostConn.await(typePresence))
	if len(presence.Online) != 2 {
		t.Fatalf("online = %v, want the host and the guest", presence.Online)
	}
	if presence.ScreenOnline {
		t.Error("screenOnline = true for a seated phone, want false")
	}
}

func TestPQSocketAnnouncesTheScreenConnecting(t *testing.T) {
	h := newTestServer(t)
	live := liveServer(t, h)
	lobby, host, _ := pqScreenRoom(t, h)

	hostConn := dialPQRoom(t, live, lobby.Code, host.Token)
	hostConn.await(typeState)

	// Nobody who joined the lobby: a television watches, it does not play.
	screen := newGuestSession(t, h)
	dialPQRoom(t, live, lobby.Code, screen.Token)

	if !into[pqPresencePayload](t, hostConn.await(typePresence)).ScreenOnline {
		t.Error("screenOnline = false with a seatless device connected, want true")
	}
}

func TestPQSocketAnnouncesTheScreenGoingAway(t *testing.T) {
	h := newTestServer(t)
	live := liveServer(t, h)
	lobby, host, _ := pqScreenRoom(t, h)

	hostConn := dialPQRoom(t, live, lobby.Code, host.Token)
	hostConn.await(typeState)

	screen := newGuestSession(t, h)
	screenConn := dialPQRoom(t, live, lobby.Code, screen.Token)

	// The arrival has to be consumed first, or the departure would assert on the frame before it.
	if !into[pqPresencePayload](t, hostConn.await(typePresence)).ScreenOnline {
		t.Fatalf("screenOnline = false with the screen connected, want true")
	}

	screenConn.close()

	if into[pqPresencePayload](t, hostConn.await(typePresence)).ScreenOnline {
		t.Error("screenOnline = true after the screen hung up, want false")
	}
}

func TestPQSocketSnapshotSaysTheScreenIsAlreadyConnected(t *testing.T) {
	h := newTestServer(t)
	live := liveServer(t, h)
	lobby, host, _ := pqScreenRoom(t, h)

	screen := newGuestSession(t, h)
	own := into[pqStatePayload](t, dialPQRoom(t, live, lobby.Code, screen.Token).await(typeState))
	if own.Seat != -1 {
		t.Fatalf("screen seat = %d, want -1", own.Seat)
	}
	if !own.ScreenOnline {
		t.Error("the screen's own snapshot says screenOnline = false, want true")
	}

	// A host reloading mid-pairing must not be sent back to pair a screen that is already there.
	if !into[pqStatePayload](t, dialPQRoom(t, live, lobby.Code, host.Token).await(typeState)).ScreenOnline {
		t.Error("host snapshot screenOnline = false with the screen already connected, want true")
	}
}

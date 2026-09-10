package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/coder/websocket"
)

const invitesPath = "/api/v1/friends/invites"

func sendInvite(t *testing.T, h http.Handler, token, code, userID string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, invitesPath, fmt.Sprintf(`{"code":%q,"userId":%q}`, code, userID), token)
}

func listInvites(t *testing.T, h http.Handler, token string) []inviteResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, invitesPath, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("list invites: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[[]inviteResponse](t, rec)
}

// befriend puts two people in a room together and leaves the second one out of it again.
func befriend(t *testing.T, h http.Handler, host, guest sessionResponse) {
	t.Helper()

	lobby := createLobby(t, h, host.Token)
	if rec := joinLobby(t, h, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join to befriend: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if rec := do(t, h, http.MethodDelete, lobbyLeavePath(lobby.Code), "", guest.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("leave after befriending: status = %d (body: %s)", rec.Code, rec.Body)
	}
}

// The happy path, and the thing the empty seat in a lobby does.
func TestInvitingAFriendIntoYourRoom(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)
	befriend(t, srv, host, friend)

	lobby := createLobby(t, srv, host.Token)

	rec := sendInvite(t, srv, host.Token, lobby.Code, friend.User.ID)
	if rec.Code != http.StatusCreated {
		t.Fatalf("invite: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	body := decodeBody[inviteResponse](t, rec)
	if body.Code != lobby.Code {
		t.Errorf("invite code = %q, want %q", body.Code, lobby.Code)
	}
	if body.From.UserID != host.User.ID {
		t.Errorf("invite is from %q, want %q", body.From.UserID, host.User.ID)
	}
	// The app has no user directory, so the name has to travel with the invite.
	if body.From.Name != host.User.Name {
		t.Errorf("invite is from %q, want the host's name %q", body.From.Name, host.User.Name)
	}
}

// The whole reason an invite is a row: nobody was listening, and it is still there when they come back.
func TestAnInviteWaitsForSomebodyWhoWasOffline(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)
	befriend(t, srv, host, friend)

	lobby := createLobby(t, srv, host.Token)
	sendInvite(t, srv, host.Token, lobby.Code, friend.User.ID)

	waiting := listInvites(t, srv, friend.Token)
	if len(waiting) != 1 {
		t.Fatalf("the invited friend has %d invites waiting, want 1", len(waiting))
	}
	if waiting[0].Code != lobby.Code {
		t.Errorf("waiting invite is for %q, want %q", waiting[0].Code, lobby.Code)
	}
}

// You can only reach somebody you have played with -- there is no way to message a stranger.
func TestInvitingSomebodyYouHaveNotPlayedWithIsRefused(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	stranger := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)

	rec := sendInvite(t, srv, host.Token, lobby.Code, stranger.User.ID)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("invite a stranger: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
	if got := errorCode(t, rec); got != "not_friends" {
		t.Errorf("refusal code = %q, want not_friends", got)
	}
}

// And only into a room you are sitting in, which is the other half of it not being an open messaging primitive.
func TestInvitingIntoARoomYouAreNotInIsRefused(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	outsider := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)

	befriend(t, srv, outsider, friend)
	lobby := createLobby(t, srv, host.Token)

	rec := sendInvite(t, srv, outsider.Token, lobby.Code, friend.User.ID)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("invite into somebody else's room: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
	if got := errorCode(t, rec); got != "not_in_lobby" {
		t.Errorf("refusal code = %q, want not_in_lobby", got)
	}
}

// Somebody already sitting there does not need asking, and the seat grid greys them out for the same reason.
func TestInvitingSomebodyAlreadyInTheRoomIsRefused(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	joinLobby(t, srv, friend.Token, lobby.Code)

	rec := sendInvite(t, srv, host.Token, lobby.Code, friend.User.ID)
	if rec.Code != http.StatusConflict {
		t.Fatalf("invite somebody already seated: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if got := errorCode(t, rec); got != "already_in_lobby" {
		t.Errorf("refusal code = %q, want already_in_lobby", got)
	}
}

func TestInvitingYourselfIsRefused(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	// The host is in their own room, so this is caught as already seated before it is ever a self-invite.
	rec := sendInvite(t, srv, host.Token, lobby.Code, host.User.ID)
	if rec.Code != http.StatusConflict {
		t.Fatalf("invite yourself: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
}

func TestInvitingIntoARoomThatDoesNotExistIsRefused(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)
	befriend(t, srv, host, friend)

	rec := sendInvite(t, srv, host.Token, deadCode, friend.User.ID)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("invite into nothing: status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// Invites are addressed, not broadcast: yours are the ones sent to you.
func TestYouOnlySeeInvitesSentToYou(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)
	bystander := newGuestSession(t, srv)
	befriend(t, srv, host, friend)

	lobby := createLobby(t, srv, host.Token)
	sendInvite(t, srv, host.Token, lobby.Code, friend.User.ID)

	if got := listInvites(t, srv, bystander.Token); len(got) != 0 {
		t.Errorf("a bystander sees %d invites, want none", len(got))
	}
}

// Seen is the banner having been shown. The row stays, it just stops being pending.
func TestSeeingAnInviteTakesItOffTheList(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)
	befriend(t, srv, host, friend)

	lobby := createLobby(t, srv, host.Token)
	sent := decodeBody[inviteResponse](t, sendInvite(t, srv, host.Token, lobby.Code, friend.User.ID))

	rec := do(t, srv, http.MethodPost, invitesPath+"/seen", fmt.Sprintf(`{"ids":[%q]}`, sent.ID), friend.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("mark seen: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	if got := listInvites(t, srv, friend.Token); len(got) != 0 {
		t.Errorf("a seen invite is still pending: %v", got)
	}
}

// dialUserRoom asks for a personal room by name, which is exactly what an impostor would do.
func dialUserRoom(t *testing.T, srv *httptest.Server, roomID, token string) *socket {
	t.Helper()

	url := strings.Replace(srv.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=" + userNamespace + ":" + roomID + "&token=" + token

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial user room %s: %v", roomID, err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	return &socket{t: t, conn: conn}
}

// An invite reaches a listening friend without them asking, so the banner does not wait for a poll.
func TestAnInviteReachesAListeningFriend(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)
	befriend(t, srv, host, friend)

	conn := dialUserRoom(t, live, friend.User.ID, friend.Token)

	lobby := createLobby(t, srv, host.Token)
	sendInvite(t, srv, host.Token, lobby.Code, friend.User.ID)

	body := into[inviteResponse](t, conn.await(typeInvite))
	if body.Code != lobby.Code {
		t.Errorf("the frame is for room %q, want %q", body.Code, lobby.Code)
	}
	if body.From.UserID != host.User.ID {
		t.Errorf("the frame is from %q, want %q", body.From.UserID, host.User.ID)
	}
}

// The security gate: a personal room is named by whoever is holding the token, whatever the URL asked for.
func TestASocketCannotListenToAnotherUsersRoom(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	friend := newGuestSession(t, srv)
	impostor := newGuestSession(t, srv)
	befriend(t, srv, host, friend)
	befriend(t, srv, host, impostor)

	// Asking for somebody else's room by name, which is the only way to try.
	spy := dialUserRoom(t, live, friend.User.ID, impostor.Token)

	lobby := createLobby(t, srv, host.Token)
	sendInvite(t, srv, host.Token, lobby.Code, impostor.User.ID)

	// It arrived at all, which is only possible if the id was rewritten to the caller's own:
	// the frame was published to the impostor's room, and the URL asked for the friend's.
	body := into[inviteResponse](t, spy.await(typeInvite))
	if body.Code != lobby.Code {
		t.Errorf("the spy heard an invite to %q, want %q", body.Code, lobby.Code)
	}

	// And the friend's own invites are untouched by any of it.
	if got := listInvites(t, srv, friend.Token); len(got) != 0 {
		t.Errorf("the friend has %d invites, want none", len(got))
	}
}

// A namespace nobody has claimed is still refused, so the rewrite only ever loosens the one room it names.
func TestAnUnknownNamespaceIsStillRefused(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	caller := newGuestSession(t, srv)

	url := strings.Replace(live.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=nonsense:" + caller.User.ID + "&token=" + caller.Token

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	// The handshake succeeds -- the hub only looks the room up once the connection is its own -- and then it is hung up on.
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	if _, _, err := conn.Read(ctx); websocket.CloseStatus(err) != websocket.StatusPolicyViolation {
		t.Errorf("read from an unclaimed namespace: err = %v, want a policy violation close", err)
	}
}

// Anything sent while somebody was away is waiting in a row rather than in the socket, so arriving is told to go and look.
func TestArrivingInYourOwnRoomIsToldToSync(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	friend := newGuestSession(t, srv)

	conn := dialUserRoom(t, live, friend.User.ID, friend.Token)

	if env := conn.await(typeSync); env.Type != typeSync {
		t.Errorf("first frame is %q, want %q", env.Type, typeSync)
	}
}

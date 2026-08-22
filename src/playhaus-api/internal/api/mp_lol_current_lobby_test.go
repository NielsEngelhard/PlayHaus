package api

import (
	"fmt"
	"net/http"
	"testing"

	league_of_letters "playhaus-api/internal/league-of-letters"
)

func lobbyCurrentPath() string            { return lobbyPath + "/current" }
func lobbyAbandonPath(code string) string { return lobbyPathFor(code) + "/abandon" }
func startBodyFor(code string) string {
	return fmt.Sprintf(`{"lobbyId":%q,"wordLength":5,"locale":"en"}`, code)
}

// startRoom fills a room and starts it, which is the only way to get a lobby whose
// game is being played -- the state the current-lobby check most has to notice.
func startRoom(t *testing.T, h http.Handler, hostToken string) lobbyResponse {
	t.Helper()

	lobby := createLobby(t, h, hostToken)

	if rec := joinLobby(t, h, newGuestSession(t, h).Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, h, http.MethodPost, lobbyStartPath(lobby.Code), startBodyFor(lobby.Code), hostToken)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	return decodeBody[lobbyResponse](t, rec)
}

func TestCurrentLobbyIsNothingForAPlayerWithNoRoom(t *testing.T) {
	srv := newTestServer(t)
	player := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodGet, lobbyCurrentPath(), "", player.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

func TestCurrentLobbyFindsARoomNobodyStarted(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)

	opened := createLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodGet, lobbyCurrentPath(), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	found := decodeBody[lobbyResponse](t, rec)
	if found.Code != opened.Code {
		t.Errorf("code = %q, want the room this host opened (%q)", found.Code, opened.Code)
	}
	if found.Status != string(league_of_letters.LobbyWaiting) {
		t.Errorf("status = %q, want %q", found.Status, league_of_letters.LobbyWaiting)
	}
}

// The room is the host's, and nobody else's problem: a guest sitting in it is free to
// open a room of their own.
func TestCurrentLobbyIsTheHostsOnly(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if rec := do(t, srv, http.MethodGet, lobbyCurrentPath(), "", guest.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("guest: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

func TestCurrentLobbyFindsAGameBeingPlayed(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)

	started := startRoom(t, srv, host.Token)

	rec := do(t, srv, http.MethodGet, lobbyCurrentPath(), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	found := decodeBody[lobbyResponse](t, rec)
	if found.Code != started.Code {
		t.Errorf("code = %q, want the room the game is in (%q)", found.Code, started.Code)
	}
	if found.GameID != started.GameID {
		t.Errorf("gameId = %q, want %q", found.GameID, started.GameID)
	}
}

// A room that was handed back is not one to be asked about again -- this is the
// ordinary way a host leaves, and the check must come up empty afterwards.
func TestCurrentLobbyForgetsADeletedRoom(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := do(t, srv, http.MethodDelete, lobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if rec := do(t, srv, http.MethodGet, lobbyCurrentPath(), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

// Abandoning is the whole point of the prompt: it has to leave the host free to open a
// new room, and it has to take the game with it rather than leave a board running.
func TestAbandonLobbyEndsTheGameAndTheRoom(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)

	started := startRoom(t, srv, host.Token)

	if rec := do(t, srv, http.MethodPost, lobbyAbandonPath(started.Code), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("abandon: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if rec := do(t, srv, http.MethodGet, lobbyPathFor(started.Code), "", host.Token); rec.Code != http.StatusNotFound {
		t.Errorf("room after abandon: status = %d, want %d", rec.Code, http.StatusNotFound)
	}

	game := decodeBody[multiplayerGameResponse](t, do(t, srv, http.MethodGet, mpGamePath(started.GameID), "", host.Token))
	if game.Status != string(league_of_letters.GameAbandoned) {
		t.Errorf("game status = %q, want %q", game.Status, league_of_letters.GameAbandoned)
	}

	if rec := do(t, srv, http.MethodGet, lobbyCurrentPath(), "", host.Token); rec.Code != http.StatusNoContent {
		t.Errorf("current after abandon: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

func TestAbandonLobbyIsHostOnly(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if rec := do(t, srv, http.MethodPost, lobbyAbandonPath(lobby.Code), "", guest.Token); rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}

	// And the room is still standing.
	if rec := do(t, srv, http.MethodGet, lobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusOK {
		t.Errorf("room after refused abandon: status = %d, want %d", rec.Code, http.StatusOK)
	}
}

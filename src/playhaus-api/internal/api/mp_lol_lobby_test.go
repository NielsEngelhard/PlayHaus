package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	league_of_letters "playhaus-api/internal/league-of-letters"
)

const lobbyPath = "/api/v1/league-of-letters/lobby"

func lobbyPathFor(code string) string     { return lobbyPath + "/" + code }
func lobbyPlayersPath(code string) string { return lobbyPathFor(code) + "/players" }
func lobbyStartPath(code string) string   { return lobbyPathFor(code) + "/start" }
func lobbyLeavePath(code string) string   { return lobbyPathFor(code) + "/players/me" }
func mpGamePath(gameID string) string     { return "/api/v1/league-of-letters/multiplayer/" + gameID }
func mpGuessesPath(gameID string) string  { return mpGamePath(gameID) + "/guesses" }

const defaultSettings = `{"wordLength":5,"locale":"en"}`

func createLobby(t *testing.T, h http.Handler, token string) lobbyResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, lobbyPath, defaultSettings, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[lobbyResponse](t, rec)
}

func joinLobby(t *testing.T, h http.Handler, token, code string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, lobbyPlayersPath(code), "", token)
}

// errorCode reads the machine-readable tag off a refusal, so a test can tell two
// 409s apart the same way the app does.
func errorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	return decodeBody[struct {
		Code string `json:"code"`
	}](t, rec).Code
}

func TestCreateLobbyRequiresAuth(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	rec := do(t, srv, http.MethodPost, lobbyPath, defaultSettings, "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

// The room exists the moment the screen opens, so everything it draws has to come
// back from this one call -- the code to share, the list to show, and enough to
// know you are the host.
func TestCreateLobbyAnswersAWholeRoom(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	session := newGuestSession(t, srv)

	lobby := createLobby(t, srv, session.Token)

	if len(lobby.Code) != league_of_letters.JoinCodeLength {
		t.Errorf("code = %q, want %d characters", lobby.Code, league_of_letters.JoinCodeLength)
	}
	if lobby.ID != lobby.Code {
		t.Errorf("id = %q and code = %q, want them to be the same room", lobby.ID, lobby.Code)
	}
	if lobby.HostID != session.User.ID {
		t.Errorf("hostId = %q, want the creator %q", lobby.HostID, session.User.ID)
	}
	if lobby.Status != string(league_of_letters.LobbyWaiting) {
		t.Errorf("status = %q, want %q", lobby.Status, league_of_letters.LobbyWaiting)
	}
	if lobby.GameID != "" {
		t.Errorf("gameId = %q on a room that has not started", lobby.GameID)
	}
	if lobby.Settings.WordLength != 5 || lobby.Settings.Locale != "en" {
		t.Errorf("settings = %+v, want the ones it was asked for", lobby.Settings)
	}

	// The host is a player, and the first one -- the list is drawn straight off this.
	if len(lobby.Players) != 1 {
		t.Fatalf("got %d players, want the host", len(lobby.Players))
	}
	host := lobby.Players[0]
	if host.UserID != session.User.ID {
		t.Errorf("player = %q, want the host %q", host.UserID, session.User.ID)
	}
	if host.Name == "" {
		t.Error("player came back with no name, which the room list draws")
	}
	if host.AvatarColorID == "" {
		t.Error("player came back with no avatarColorId, which the room list draws")
	}
}

// The codes are read out loud across a room, so the two pairs that sound and look
// alike are not in them.
func TestCreateLobbyCodeAvoidsAmbiguousCharacters(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	// Several rooms, because one code proves nothing about an alphabet.
	for range 12 {
		lobby := createLobby(t, srv, newGuestSession(t, srv).Token)

		for _, ambiguous := range []rune{'O', '0', 'I', '1'} {
			for _, c := range lobby.Code {
				if c == ambiguous {
					t.Fatalf("code %q contains %q", lobby.Code, ambiguous)
				}
			}
		}
	}
}

func TestCreateLobbyValidatesWordLength(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	for _, body := range []string{`{"wordLength":3}`, `{"wordLength":9}`, `{"wordLength":0}`} {
		rec := do(t, srv, http.MethodPost, lobbyPath, body, token)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: status = %d, want %d (body: %s)", body, rec.Code, http.StatusUnprocessableEntity, rec.Body)
		}
	}
}

func TestJoinLobbyAddsAPlayer(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)

	rec := joinLobby(t, srv, guest.Token, lobby.Code)
	if rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	joined := decodeBody[lobbyResponse](t, rec)
	if len(joined.Players) != 2 {
		t.Fatalf("got %d players, want 2", len(joined.Players))
	}
	// Oldest first: the host is still the top row after somebody arrives.
	if joined.Players[0].UserID != host.User.ID {
		t.Errorf("first player = %q, want the host %q", joined.Players[0].UserID, host.User.ID)
	}
	if joined.Players[1].UserID != guest.User.ID {
		t.Errorf("second player = %q, want the guest %q", joined.Players[1].UserID, guest.User.ID)
	}
	// The host is still the host -- joining a room is not taking it over.
	if joined.HostID != host.User.ID {
		t.Errorf("hostId = %q, want %q", joined.HostID, host.User.ID)
	}
}

// Reopening the screen must not be a second seat. Backgrounding the app and coming
// back is the common case, and the host lands here again the moment the game starts.
func TestJoinLobbyIsIdempotent(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)

	for i := range 3 {
		rec := joinLobby(t, srv, guest.Token, lobby.Code)
		if rec.Code != http.StatusOK {
			t.Fatalf("join %d: status = %d (body: %s)", i+1, rec.Code, rec.Body)
		}
		if joined := decodeBody[lobbyResponse](t, rec); len(joined.Players) != 2 {
			t.Fatalf("join %d: got %d players, want 2", i+1, len(joined.Players))
		}
	}
}

func TestJoinLobbyUnknownCode(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	rec := joinLobby(t, srv, token, "ZZZZZZ")
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// A full room and a room that has already started are both 409, and the app says
// something different about each -- so they have to be told apart by something
// other than the prose.
func TestJoinLobbyFull(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	lobby := createLobby(t, srv, newGuestSession(t, srv).Token)

	// The host has one of the seats already.
	for i := range league_of_letters.MaxLobbyPlayers - 1 {
		rec := joinLobby(t, srv, newGuestSession(t, srv).Token, lobby.Code)
		if rec.Code != http.StatusOK {
			t.Fatalf("player %d: status = %d (body: %s)", i+2, rec.Code, rec.Body)
		}
	}

	rec := joinLobby(t, srv, newGuestSession(t, srv).Token, lobby.Code)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "lobby_full" {
		t.Errorf("code = %q, want %q", code, "lobby_full")
	}
}

func TestJoinLobbyAfterItStarted(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	if rec := joinLobby(t, srv, newGuestSession(t, srv).Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := joinLobby(t, srv, newGuestSession(t, srv).Token, lobby.Code)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "lobby_started" {
		t.Errorf("code = %q, want %q", code, "lobby_started")
	}
}

// Somebody already at the table coming back to it is not somebody joining a game
// in progress, and must not be turned away by the rule that stops the latter.
func TestJoinStartedLobbyAsAMemberIsAllowed(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := joinLobby(t, srv, guest.Token, lobby.Code)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	// And it carries the game, which is how a reconnecting player finds the board.
	if got := decodeBody[lobbyResponse](t, rec); got.GameID == "" {
		t.Error("a started room came back with no gameId")
	}
}

func TestUpdateLobbySettingsIsHostOnly(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	body := `{"wordLength":6,"locale":"nl"}`

	rec := do(t, srv, http.MethodPatch, lobbyPathFor(lobby.Code), body, guest.Token)
	if rec.Code != http.StatusForbidden {
		t.Errorf("guest: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}

	rec = do(t, srv, http.MethodPatch, lobbyPathFor(lobby.Code), body, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("host: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	saved := decodeBody[lobbyResponse](t, rec)
	if saved.Settings.WordLength != 6 || saved.Settings.Locale != "nl" {
		t.Errorf("settings = %+v, want 6/nl", saved.Settings)
	}

	// And it stuck, rather than only coming back in the answer.
	rec = do(t, srv, http.MethodGet, lobbyPathFor(lobby.Code), "", guest.Token)
	if got := decodeBody[lobbyResponse](t, rec); got.Settings.WordLength != 6 {
		t.Errorf("re-read settings = %+v, want 6/nl", got.Settings)
	}
}

// A game with one player in it is a solo game with extra steps.
func TestStartLobbyNeedsTwoPlayers(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "not_enough_players" {
		t.Errorf("code = %q, want %q", code, "not_enough_players")
	}
}

func TestStartLobbyIsHostOnly(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", guest.Token)
	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
}

func TestLeaveLobbyGivesTheSeatBack(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodDelete, lobbyLeavePath(lobby.Code), "", guest.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("leave: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	rec = do(t, srv, http.MethodGet, lobbyPathFor(lobby.Code), "", host.Token)
	if got := decodeBody[lobbyResponse](t, rec); len(got.Players) != 1 {
		t.Errorf("got %d players after one left, want 1", len(got.Players))
	}
}

// The room screen fires this on its way out, where there is nobody left to tell --
// so leaving a room that is already gone has to be a no-op rather than a 404.
func TestLeaveLobbyThatIsGone(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	rec := do(t, srv, http.MethodDelete, lobbyLeavePath("ZZZZZZ"), "", token)
	if rec.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

func TestDeleteLobbyIsHostOnly(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if rec := do(t, srv, http.MethodDelete, lobbyPathFor(lobby.Code), "", guest.Token); rec.Code != http.StatusForbidden {
		t.Errorf("guest: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}

	if rec := do(t, srv, http.MethodDelete, lobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("host: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	// The code stops working, which is the point of closing a room.
	if rec := do(t, srv, http.MethodGet, lobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNotFound {
		t.Errorf("after delete: status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

// The lobby is only the door. Closing it must not delete a game the people who
// came through it are still playing.
func TestDeleteLobbyLeavesTheGameAlone(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	if rec := do(t, srv, http.MethodDelete, lobbyPathFor(game.lobbyCode), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("delete lobby: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodGet, mpGamePath(game.ID), "", guest.Token)
	if rec.Code != http.StatusOK {
		t.Errorf("game after the lobby closed: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
}

package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/lol"

	"gorm.io/gorm"
)

const lobbyPath = "/api/v1/league-of-letters/lobby"

func lobbyPathFor(code string) string     { return lobbyPath + "/" + code }
func lobbyPlayersPath(code string) string { return lobbyPathFor(code) + "/players" }
func lobbyStartPath(code string) string   { return lobbyPathFor(code) + "/start" }
func lobbyLeavePath(code string) string   { return lobbyPathFor(code) + "/players/me" }
func mpGamePath(gameID string) string     { return "/api/v1/league-of-letters/multiplayer/" + gameID }
func mpGuessesPath(gameID string) string  { return mpGamePath(gameID) + "/guesses" }

// deadCode is a perfectly good League of Letters code that no room answers to --
// right length, right prefix, every character one we hand out.
//
// Spelled out as a real code rather than any old string of letters because the
// routes now refuse anything that is not one before the handler behind them runs,
// and a test reaching for "a code nobody has" would otherwise be answered by the
// guard instead of by the thing it means to test.
const deadCode = "LZWQ9"

// Opening a room takes a language and nothing else -- the word length is decided
// inside the room, from the settings card, and not read until the game starts.
const newRoomBody = `{"locale":"en"}`

func createLobby(t *testing.T, h http.Handler, token string) lobbyResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, lobbyPath, newRoomBody, token)
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

	rec := do(t, srv, http.MethodPost, lobbyPath, newRoomBody, "")
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

	if len(lobby.Code) != joincode.Length {
		t.Errorf("code = %q, want %d characters", lobby.Code, joincode.Length)
	}
	// The prefix is the whole of how the app knows which screen to open, so a room that
	// came back without one would send every player who joined it nowhere.
	if game, ok := joincode.GameFor(lobby.Code); !ok || game != joincode.LeagueOfLetters {
		t.Errorf("code = %q, want a League of Letters code", lobby.Code)
	}
	if lobby.ID != lobby.Code {
		t.Errorf("id = %q and code = %q, want them to be the same room", lobby.ID, lobby.Code)
	}
	if lobby.HostID != session.User.ID {
		t.Errorf("hostId = %q, want the creator %q", lobby.HostID, session.User.ID)
	}
	if lobby.Status != string(lol.LobbyWaiting) {
		t.Errorf("status = %q, want %q", lobby.Status, lol.LobbyWaiting)
	}
	if lobby.GameID != "" {
		t.Errorf("gameId = %q on a room that has not started", lobby.GameID)
	}
	// The language is the one it was opened with; the word length is the default,
	// because nobody has been asked yet and the settings card has to show something.
	if lobby.Settings.Locale != "en" {
		t.Errorf("locale = %q, want the one it was opened with", lobby.Settings.Locale)
	}
	if lobby.Settings.WordLength != lol.DefaultWordLength {
		t.Errorf("wordLength = %d, want the default %d", lobby.Settings.WordLength, lol.DefaultWordLength)
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

// The language is optional, and a room opened without one still has to be playable.
func TestCreateLobbyWithoutALanguage(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	rec := do(t, srv, http.MethodPost, lobbyPath, `{}`, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	lobby := decodeBody[lobbyResponse](t, rec)
	if lobby.Settings.Locale == "" {
		t.Error("settings came back with no locale, which the room screen draws")
	}
	if lobby.Settings.WordLength != lol.DefaultWordLength {
		t.Errorf("wordLength = %d, want the default %d", lobby.Settings.WordLength, lol.DefaultWordLength)
	}
}

// Opening a room is not where the game is decided. A client still sending a word
// length here is one written against the old contract, and being refused loudly is
// what stops it quietly believing the room is set up the way it asked.
func TestCreateLobbyRefusesGameSettings(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	for _, body := range []string{`{"wordLength":6}`, `{"locale":"en","wordLength":5}`} {
		rec := do(t, srv, http.MethodPost, lobbyPath, body, token)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, want %d (body: %s)", body, rec.Code, http.StatusBadRequest, rec.Body)
		}
	}
}

// The length the room was left on is the length it plays at -- the one moment
// anything reads it.
func TestStartLobbyPlaysTheLengthTheRoomWasSetTo(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	if rec := joinLobby(t, srv, newGuestSession(t, srv).Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	body := `{"wordLength":7,"locale":"en"}`
	if rec := do(t, srv, http.MethodPatch, lobbyPathFor(lobby.Code), body, host.Token); rec.Code != http.StatusOK {
		t.Fatalf("settings: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	started := decodeBody[lobbyResponse](t, rec)
	if started.GameID == "" {
		t.Fatal("a started room came back with no gameId")
	}

	game := decodeBody[multiplayerGameResponse](t, do(t, srv, http.MethodGet, mpGamePath(started.GameID), "", host.Token))
	if game.WordLength != 7 {
		t.Errorf("game wordLength = %d, want the 7 the room was set to", game.WordLength)
	}
}

// The clock the host picked used to be saved nowhere and started from nowhere: every
// room ran on the default however the picker was left.
func TestStartLobbyRunsTheClockTheRoomWasSetTo(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	if rec := joinLobby(t, srv, newGuestSession(t, srv).Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	seconds := lol.DefaultSecondsPerTurn + 15
	body := fmt.Sprintf(`{"wordLength":5,"locale":"nl","secondsPerGuess":%d}`, seconds)

	saved := decodeBody[lobbyResponse](t, do(t, srv, http.MethodPatch, lobbyPathFor(lobby.Code), body, host.Token))
	if saved.Settings.SecondsPerTurn != seconds {
		t.Errorf("saved secondsPerTurn = %d, want %d", saved.Settings.SecondsPerTurn, seconds)
	}

	// And read back, not just echoed: the guests in the room refetch rather than
	// trusting the answer to somebody else's write.
	reread := decodeBody[lobbyResponse](t, do(t, srv, http.MethodGet, lobbyPathFor(lobby.Code), "", host.Token))
	if reread.Settings.SecondsPerTurn != seconds {
		t.Errorf("reread secondsPerTurn = %d, want the %d that was saved", reread.Settings.SecondsPerTurn, seconds)
	}

	rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	// Off the row rather than the response: the clock reaches the app as the moment
	// the turn ends, so the number itself is only visible here.
	started := decodeBody[lobbyResponse](t, rec)

	var game lol.MultiplayerLeagueOfLettersGame
	if err := db.First(&game, "id = ?", started.GameID).Error; err != nil {
		t.Fatalf("read game: %v", err)
	}
	if game.SecondsPerGuess != seconds {
		t.Errorf("game secondsPerGuess = %d, want the %d the room was set to", game.SecondsPerGuess, seconds)
	}
}

// A clock outside the picker's range is refused rather than quietly stored, now that
// what is stored is what the turns actually run on.
func TestLobbySettingsRefuseAnImpossibleClock(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	body := fmt.Sprintf(`{"wordLength":5,"locale":"nl","secondsPerGuess":%d}`, lol.MaxSecondsPerTurn+1)

	rec := do(t, srv, http.MethodPatch, lobbyPathFor(lobby.Code), body, host.Token)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body: %s)", rec.Code, rec.Body)
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

	rec := joinLobby(t, srv, token, deadCode)
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
	for i := range lol.MaxLobbyPlayers - 1 {
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

	rec := do(t, srv, http.MethodDelete, lobbyLeavePath(deadCode), "", token)
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

// ---------------------------------------------------------------------------
// Playing again
// ---------------------------------------------------------------------------

func lobbyRematchPath(code string) string { return lobbyPathFor(code) + "/rematch" }

// finishGame runs the clock out on every turn until there is nothing left to play.
//
// Through the service rather than through guesses, the same door the resume test uses:
// a guess needs a word the list agrees exists, and nothing here cares what was played
// -- only that the game is over.
func finishGame(t *testing.T, db *gorm.DB, gameID string) {
	t.Helper()

	service := lolServiceFrom(db)
	id := mustUUID(t, gameID)

	// Four rounds of six rows between two players is twenty-four turns; the ceiling is
	// only here so a rule that stopped ending games fails the test instead of hanging it.
	for range 200 {
		outcome, err := service.SkipTurn(context.Background(), id)
		if err != nil {
			t.Fatalf("skip turn: %v", err)
		}
		if outcome.GameOver {
			return
		}
	}

	t.Fatal("the game never ended")
}

// The point of playing again is not having to set anything up: the new room opens on
// what the last one played, and with only the host in it -- who comes back is decided
// by who turns up, not by who happened to be listed when the last word went down.
func TestRematchOpensARoomOnTheSameSettings(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	settings := `{"wordLength":7,"locale":"nl"}`
	if rec := do(t, srv, http.MethodPatch, lobbyPathFor(lobby.Code), settings, host.Token); rec.Code != http.StatusOK {
		t.Fatalf("settings: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}
	finishGame(t, db, decodeBody[lobbyResponse](t, rec).GameID)

	rec = do(t, srv, http.MethodPost, lobbyRematchPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("rematch: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	next := decodeBody[lobbyResponse](t, rec)

	if next.Code == lobby.Code {
		t.Fatalf("code = %q, want a room of its own", next.Code)
	}
	if next.Status != string(lol.LobbyWaiting) {
		t.Errorf("status = %q, want %q", next.Status, lol.LobbyWaiting)
	}
	if next.GameID != "" {
		t.Errorf("gameId = %q on a room nobody has started", next.GameID)
	}
	if next.HostID != host.User.ID {
		t.Errorf("hostId = %q, want the host of the room it came from %q", next.HostID, host.User.ID)
	}
	if next.Settings.WordLength != 7 || next.Settings.Locale != "nl" {
		t.Errorf("settings = %+v, want the ones the last game was played on", next.Settings)
	}
	if len(next.Players) != 1 || next.Players[0].UserID != host.User.ID {
		t.Errorf("players = %+v, want the host alone until the rest arrive", next.Players)
	}

	// And the room they are all still sitting in points at it, so a player whose
	// connection blipped over the announcement is carried across by the next snapshot.
	rec = do(t, srv, http.MethodGet, lobbyPathFor(lobby.Code), "", guest.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get old lobby: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if old := decodeBody[lobbyResponse](t, rec); old.RematchCode != next.Code {
		t.Errorf("rematchCode = %q, want %q", old.RematchCode, next.Code)
	}
}

// Pressing it twice is one room, not two. A second room would be half the table
// waiting behind one code and half behind the other.
func TestRematchIsIdempotent(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	finishGame(t, db, game.ID)

	first := do(t, srv, http.MethodPost, lobbyRematchPath(game.lobbyCode), "", host.Token)
	if first.Code != http.StatusCreated {
		t.Fatalf("first: status = %d (body: %s)", first.Code, first.Body)
	}

	second := do(t, srv, http.MethodPost, lobbyRematchPath(game.lobbyCode), "", host.Token)
	if second.Code != http.StatusCreated {
		t.Fatalf("second: status = %d (body: %s)", second.Code, second.Body)
	}

	if a, b := decodeBody[lobbyResponse](t, first), decodeBody[lobbyResponse](t, second); a.Code != b.Code {
		t.Errorf("codes = %q and %q, want the same room both times", a.Code, b.Code)
	}
}

// Opening the next room is the host's, like everything else about a room.
func TestRematchIsHostOnly(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	finishGame(t, db, game.ID)

	rec := do(t, srv, http.MethodPost, lobbyRematchPath(game.lobbyCode), "", guest.Token)
	if rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
}

// Not while they are still playing: everybody on the board would be invited somewhere
// else in the middle of a round.
func TestRematchRefusesAGameStillBeingPlayed(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	rec := do(t, srv, http.MethodPost, lobbyRematchPath(game.lobbyCode), "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "game_not_over" {
		t.Errorf("code = %q, want game_not_over", code)
	}
}

// A room that never got as far as a game has nothing to play again.
func TestRematchRefusesARoomThatNeverStarted(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodPost, lobbyRematchPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
}

// Every route addressed by a join code is guarded by the shape of the code before
// the handler behind it is reached, so these test the door rather than the room.
//
// They are worth more than they look: the guard is the only thing standing between a
// PubquizR code and a League of Letters handler, and the failure it prevents is a
// player being told a room exists on the strength of five characters that were never
// about this game at all.

// A code for another game is not a request this address can answer, and the answer
// has to be the same one a room that never existed gets -- a 404 the app already has
// a line of prose for, rather than a 500 out of the depths of the lobby store.
func TestLobbyRoutesRefuseAnotherGamesCode(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	// One code per game that has a letter but no rooms yet. Both are perfectly good
	// codes; neither is this game's.
	for _, code := range []string{"P4X2Q", "O4X2Q"} {
		rec := do(t, srv, http.MethodGet, lobbyPathFor(code), "", token)
		if rec.Code != http.StatusNotFound {
			t.Errorf("GET %s: status = %d, want %d (body: %s)", code, rec.Code, http.StatusNotFound, rec.Body)
		}
		if got := errorCode(t, rec); got != "lobby_not_found" {
			t.Errorf("GET %s: code = %q, want lobby_not_found", code, got)
		}

		// Joining too, because that is the route a scanned QR walks into and the one
		// place a stranger's code arrives without anybody having typed it.
		if rec := joinLobby(t, srv, token, code); rec.Code != http.StatusNotFound {
			t.Errorf("POST %s/players: status = %d, want %d (body: %s)", code, rec.Code, http.StatusNotFound, rec.Body)
		}
	}
}

// The old four-character codes stop working, which is the whole of the migration:
// rooms live for minutes, so there is nothing to carry across -- but an app left open
// across the deploy will ask about one, and what it gets back has to be the room-is-
// gone answer it already knows how to draw.
func TestLobbyRoutesRefuseTheOldFormat(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	rec := do(t, srv, http.MethodGet, lobbyPathFor("K2V8"), "", token)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// Codes are read off other people's screens and typed by hand, so the case they
// arrive in is not the case they were handed out in.
//
// This one guards a load-bearing detail with no compiler behind it: the code is the
// lobby table's primary key and SQLite compares TEXT byte for byte, so the room only
// answers to the spelling it was stored under. Everything that touches a code
// uppercases it on the way in; drop that in one place and lowercase simply stops
// finding rooms.
func TestLobbyRoutesAcceptALowercaseCode(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodGet, lobbyPathFor(strings.ToLower(lobby.Code)), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	if got := decodeBody[lobbyResponse](t, rec); got.Code != lobby.Code {
		t.Errorf("code = %q, want the room it was opened as, %q", got.Code, lobby.Code)
	}
}

// Two rooms are two doors. Trivially true of a random draw, and worth pinning anyway,
// because the code is a primary key and the day two rooms share one is the day two
// tables of people find each other.
func TestCreateLobbyHandsOutADifferentCodeEachTime(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	first := createLobby(t, srv, newGuestSession(t, srv).Token)
	second := createLobby(t, srv, newGuestSession(t, srv).Token)

	if first.Code == second.Code {
		t.Fatalf("two rooms opened with the same code %q", first.Code)
	}
	for _, code := range []string{first.Code, second.Code} {
		if game, ok := joincode.GameFor(code); !ok || game != joincode.LeagueOfLetters {
			t.Errorf("code = %q, want a League of Letters code", code)
		}
	}
}

package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/realtime"

	"github.com/coder/websocket"
)

// frameWait is how long a test will sit for a frame it expects. Generous: these
// run against a real listener on a loopback socket, so anything approaching this
// is a failure rather than a slow machine.
const frameWait = 5 * time.Second

// liveServer puts the handler on a real listener. A socket cannot be tested
// through httptest.ResponseRecorder -- there is no connection to take over -- so
// this is the one suite that needs a port.
func liveServer(t *testing.T, h http.Handler) *httptest.Server {
	t.Helper()

	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return srv
}

// socket is one connected client, with the frames it has been sent.
type socket struct {
	t    *testing.T
	conn *websocket.Conn
}

func dialRoom(t *testing.T, srv *httptest.Server, code, token string) *socket {
	t.Helper()

	url := strings.Replace(srv.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=" + joincode.LeagueOfLetters.Namespace() + ":" + code + "&token=" + token

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial %s: %v", code, err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	return &socket{t: t, conn: conn}
}

// next reads one frame, whatever it is.
func (s *socket) next() realtime.Envelope {
	s.t.Helper()

	ctx, cancel := context.WithTimeout(s.t.Context(), frameWait)
	defer cancel()

	_, data, err := s.conn.Read(ctx)
	if err != nil {
		s.t.Fatalf("read frame: %v", err)
	}

	var env realtime.Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		s.t.Fatalf("decode frame %s: %v", data, err)
	}
	return env
}

// await reads until it sees the type it is looking for, so a test can assert on
// one message without having to spell out every frame that arrives before it.
func (s *socket) await(typ string) realtime.Envelope {
	s.t.Helper()

	deadline := time.Now().Add(frameWait)
	var seen []string

	for time.Now().Before(deadline) {
		env := s.next()
		if env.Type == typ {
			return env
		}
		seen = append(seen, env.Type)
	}

	s.t.Fatalf("never saw a %q frame; got %v", typ, seen)
	return realtime.Envelope{}
}

func (s *socket) send(typ string, data any) {
	s.t.Helper()

	frame, err := json.Marshal(realtime.Message(typ, data))
	if err != nil {
		s.t.Fatalf("encode %s: %v", typ, err)
	}

	ctx, cancel := context.WithTimeout(s.t.Context(), frameWait)
	defer cancel()

	if err := s.conn.Write(ctx, websocket.MessageText, frame); err != nil {
		s.t.Fatalf("write %s: %v", typ, err)
	}
}

func into[T any](t *testing.T, env realtime.Envelope) T {
	t.Helper()

	v, err := realtime.Into[T](env)
	if err != nil {
		t.Fatalf("decode %s payload: %v", env.Type, err)
	}
	return v
}

// The connection opens with everything the screen needs, so a client that has just
// reconnected is told where things stand rather than replayed at.
func TestSocketOpensWithASnapshot(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	conn := dialRoom(t, live, lobby.Code, host.Token)
	state := into[statePayload](t, conn.await(typeState))

	if state.Lobby.Code != lobby.Code {
		t.Errorf("snapshot is for room %q, want %q", state.Lobby.Code, lobby.Code)
	}
	if state.Game != nil {
		t.Error("a room that has not started came with a game")
	}
	if len(state.Online) != 1 || state.Online[0] != host.User.ID {
		t.Errorf("online = %v, want just the host %q", state.Online, host.User.ID)
	}
}

// A join code is not a licence to watch somebody else's game.
func TestSocketRefusesNonMembers(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	stranger := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	conn := dialRoom(t, live, lobby.Code, stranger.Token)

	env := conn.await(realtime.TypeError)
	if env.Type != realtime.TypeError {
		t.Fatalf("type = %q, want an error frame", env.Type)
	}

	// And hung up on, rather than left connected to a room they cannot be in.
	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()
	if _, _, err := conn.conn.Read(ctx); err == nil {
		t.Error("the connection stayed open after the refusal")
	}
}

func TestSocketRefusesABadToken(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	url := strings.Replace(live.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=" + joincode.LeagueOfLetters.Namespace() + ":" + lobby.Code + "&token=nonsense"

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	conn, res, err := websocket.Dial(ctx, url, nil)
	if err == nil {
		_ = conn.CloseNow()
		t.Fatal("a bad token got a socket")
	}
	if res == nil || res.StatusCode != http.StatusUnauthorized {
		t.Errorf("status = %v, want %d", res, http.StatusUnauthorized)
	}
}

// The live dot: somebody arriving lights up for everybody already in the room, and
// somebody leaving goes out.
func TestSocketPresence(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	hostConn := dialRoom(t, live, lobby.Code, host.Token)
	hostConn.await(typeState)

	guestConn := dialRoom(t, live, lobby.Code, guest.Token)
	guestConn.await(typeState)

	// The host is told the guest turned up.
	online := into[presencePayload](t, hostConn.await(typePresence)).Online
	if len(online) != 2 {
		t.Fatalf("online = %v, want both players", online)
	}

	// And told again when they go.
	_ = guestConn.conn.CloseNow()

	online = into[presencePayload](t, hostConn.await(typePresence)).Online
	if len(online) != 1 || online[0] != host.User.ID {
		t.Errorf("online = %v after the guest left, want just the host", online)
	}
}

// Two tabs are one player: closing one must not put the other's light out.
func TestSocketPresenceCountsPlayersNotConnections(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	hostConn := dialRoom(t, live, lobby.Code, host.Token)
	hostConn.await(typeState)

	// The guest, twice over -- a phone and a laptop, or two tabs.
	first := dialRoom(t, live, lobby.Code, guest.Token)
	first.await(typeState)
	if online := into[presencePayload](t, hostConn.await(typePresence)).Online; len(online) != 2 {
		t.Fatalf("online = %v, want two players", online)
	}

	second := dialRoom(t, live, lobby.Code, guest.Token)
	second.await(typeState)
	if online := into[presencePayload](t, hostConn.await(typePresence)).Online; len(online) != 2 {
		t.Fatalf("online = %v after a second tab, want still two players", online)
	}

	// One tab closes; the guest is still here.
	_ = first.conn.CloseNow()
	if online := into[presencePayload](t, hostConn.await(typePresence)).Online; len(online) != 2 {
		t.Errorf("online = %v after one of two tabs closed, want still two players", online)
	}
}

// The room is told the game started, and given the first turn -- nobody has to
// poll for either.
func TestSocketAnnouncesTheGameStarting(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	guestConn := dialRoom(t, live, lobby.Code, guest.Token)
	guestConn.await(typeState)

	if rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	started := into[gameStartedPayload](t, guestConn.await(typeGameStarted))
	if started.GameID == "" {
		t.Error("game_started carried no gameId, which is what the screen opens the board on")
	}

	turn := into[turnPayload](t, guestConn.await(typeTurn))
	if turn.UserID != host.User.ID {
		t.Errorf("first turn = %q, want the host %q", turn.UserID, host.User.ID)
	}
	if turn.EndsAt == "" {
		t.Error("the first turn came with no deadline")
	}
}

// Live typing: the table watches the player whose turn it is think.
func TestSocketRelaysTypingFromThePlayerWhoseTurnItIs(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	hostConn := dialRoom(t, live, game.lobbyCode, host.Token)
	hostConn.await(typeState)
	guestConn := dialRoom(t, live, game.lobbyCode, guest.Token)
	guestConn.await(typeState)

	// The host is up, so the host's letters are the ones that travel.
	hostConn.send(typeTyping, typingPayload{Letters: "KAA"})

	got := into[typingPayload](t, guestConn.await(typeTyping))
	if got.UserID != host.User.ID {
		t.Errorf("typing from %q, want the host %q", got.UserID, host.User.ID)
	}
	if got.Letters != "KAA" {
		t.Errorf("letters = %q, want %q", got.Letters, "KAA")
	}
}

// Somebody who is not up cannot paint letters into the row the player who is up is
// typing in.
func TestSocketIgnoresTypingOutOfTurn(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	hostConn := dialRoom(t, live, game.lobbyCode, host.Token)
	hostConn.await(typeState)
	guestConn := dialRoom(t, live, game.lobbyCode, guest.Token)
	guestConn.await(typeState)

	// The guest is not up.
	guestConn.send(typeTyping, typingPayload{Letters: "XXX"})

	// Followed by something that is allowed, so there is a frame to wait for: if
	// the refused one had gone out it would arrive first.
	hostConn.send(typeTyping, typingPayload{Letters: "KAA"})

	got := into[typingPayload](t, guestConn.await(typeTyping))
	if got.UserID != host.User.ID || got.Letters != "KAA" {
		t.Errorf("got typing %+v, want only the host's", got)
	}
}

// A guess reaches the whole table, with the scores and the next turn on it.
func TestSocketBroadcastsAGuess(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	answer := answerFor(t, db, game.ID, 1)

	guestConn := dialRoom(t, live, game.lobbyCode, guest.Token)
	guestConn.await(typeState)

	word := wrongGuess(t, answer)
	rec := submitMpGuess(t, srv, tokenFor(t, game.Turn.UserID, host, guest), game.ID, word)
	if rec.Code != http.StatusCreated {
		t.Fatalf("guess: status = %d (body: %s)", rec.Code, rec.Body)
	}

	got := into[multiplayerGuessResponse](t, guestConn.await(typeGuess))
	if !strings.EqualFold(got.Guess.Word, word) {
		t.Errorf("broadcast word = %q, want %q", got.Guess.Word, word)
	}
	if got.Guess.UserID != game.Turn.UserID {
		t.Errorf("broadcast row belongs to %q, want %q", got.Guess.UserID, game.Turn.UserID)
	}
	if len(got.Players) != 2 {
		t.Errorf("broadcast carried %d players, want the whole scoreboard", len(got.Players))
	}

	// And the turn that follows it, so nobody has to work out who is next.
	turn := into[turnPayload](t, guestConn.await(typeTurn))
	if turn.UserID == game.Turn.UserID {
		t.Errorf("turn is still %q after they played", turn.UserID)
	}
}

// Closing the room tells the people still looking at it, rather than leaving them
// on a screen whose code has stopped working.
func TestSocketAnnouncesAClosedLobby(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	guestConn := dialRoom(t, live, lobby.Code, guest.Token)
	guestConn.await(typeState)

	if rec := do(t, srv, http.MethodDelete, lobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: status = %d (body: %s)", rec.Code, rec.Body)
	}

	guestConn.await(typeLobbyClosed)
}

// Somebody joining reaches the people already in the room without a poll.
func TestSocketAnnouncesAJoin(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)

	hostConn := dialRoom(t, live, lobby.Code, host.Token)
	hostConn.await(typeState)

	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	got := into[lobbyPayload](t, hostConn.await(typeLobby))
	if len(got.Lobby.Players) != 2 {
		t.Errorf("the room came through with %d players, want 2", len(got.Lobby.Players))
	}
}

// The host changing a setting reaches the guests looking at it.
func TestSocketAnnouncesSettingsChanges(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	guestConn := dialRoom(t, live, lobby.Code, guest.Token)
	guestConn.await(typeState)

	rec := do(t, srv, http.MethodPatch, lobbyPathFor(lobby.Code), `{"wordLength":7,"locale":"nl"}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: status = %d (body: %s)", rec.Code, rec.Body)
	}

	got := into[lobbyPayload](t, guestConn.await(typeLobby))
	if got.Lobby.Settings.WordLength != 7 {
		t.Errorf("wordLength = %d, want 7", got.Lobby.Settings.WordLength)
	}
}

// A player reconnecting mid-game is handed the board rather than an empty room.
func TestSocketSnapshotCarriesTheGame(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)

	conn := dialRoom(t, live, game.lobbyCode, guest.Token)
	state := into[statePayload](t, conn.await(typeState))

	if state.Game == nil {
		t.Fatal("a started room came through with no game")
	}
	if state.Game.ID != game.ID {
		t.Errorf("game = %q, want %q", state.Game.ID, game.ID)
	}
	if state.Game.Turn.UserID == "" {
		t.Error("the game came through with nobody up")
	}
	if len(state.Game.Rounds) == 0 {
		t.Error("the game came through with no board")
	}
}

// The guests are told where the table has moved to, in the room they are still sitting
// in. It is the only place they can be reached: nobody can be listening to a code they
// have not been given yet.
func TestRematchIsAnnouncedInTheOldRoom(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	game := startedGame(t, srv, host, guest)
	finishGame(t, db, game.ID)

	conn := dialRoom(t, live, game.lobbyCode, guest.Token)
	conn.await(typeState)

	rec := do(t, srv, http.MethodPost, lobbyRematchPath(game.lobbyCode), "", host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("rematch: status = %d (body: %s)", rec.Code, rec.Body)
	}
	next := decodeBody[lobbyResponse](t, rec)

	announced := into[rematchPayload](t, conn.await(typeRematch))
	if announced.Code != next.Code {
		t.Errorf("announced %q, want the room the host opened %q", announced.Code, next.Code)
	}
}

// A room in a game's namespace is named by a join code, and the handshake says so.
//
// Without the check "lol:P4X2Q" is a room key like any other: the hub would hand out
// a subscription to a room in the word game's namespace named after somebody else's
// game, and nothing would ever publish into it. Refused at the door instead.
func TestSocketRefusesARoomThatIsNotACodeForTheGame(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	token := newGuestSession(t, srv).Token

	// Another game's code, an unclaimed first character, and something that is not a
	// code at all -- the three ways the id can fail to be one.
	for _, room := range []string{"P4X2Q", "K2V8X", "garbage"} {
		url := strings.Replace(live.URL, "http://", "ws://", 1) +
			"/api/v1/ws?room=" + joincode.LeagueOfLetters.Namespace() + ":" + room + "&token=" + token

		ctx, cancel := context.WithTimeout(t.Context(), frameWait)
		conn, res, err := websocket.Dial(ctx, url, nil)
		cancel()

		if err == nil {
			_ = conn.CloseNow()
			t.Errorf("%q got a socket", room)
			continue
		}
		if res == nil || res.StatusCode != http.StatusBadRequest {
			t.Errorf("%q: status = %v, want %d", room, res, http.StatusBadRequest)
		}
	}
}

// The same room, whatever case it is asked for in.
//
// This is a regression test for a silent failure rather than a tidy-up. Every publish
// goes through lolRoom, which uppercases; the handshake used to take the id exactly as
// written. So a client connecting to "lol:abcde" was put in a room of that name,
// handed its snapshot on the way in -- because the snapshot is fetched with a
// normalised code -- and then heard nothing ever again. Correctly connected to
// nothing, with no error anywhere to find.
func TestSocketNormalisesTheRoomCode(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	// Lowercase, the way a code typed by hand arrives.
	hostConn := dialRoom(t, live, strings.ToLower(lobby.Code), host.Token)
	hostConn.await(typeState)

	// Somebody joining is published into the uppercase room. If the two are not the
	// same room, this frame never comes.
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	roster := into[lobbyPayload](t, hostConn.await(typeLobby)).Lobby
	if len(roster.Players) != 2 {
		t.Errorf("got %d players, want the guest who joined to have arrived", len(roster.Players))
	}
}

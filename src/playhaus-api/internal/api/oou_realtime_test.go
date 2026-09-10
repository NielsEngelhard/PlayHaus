package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"github.com/coder/websocket"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/oneofus"
)

// The One of Us socket. Every frame here goes to the whole room, so these are the tests that say what the table is allowed to overhear.

// dialOOURoom is dialRoom's sibling for this game's namespace.
func dialOOURoom(t *testing.T, srv *httptest.Server, code, token string) *socket {
	t.Helper()

	url := strings.Replace(srv.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=" + joincode.OneOfUs.Namespace() + ":" + code + "&token=" + token

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial %s: %v", code, err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	return &socket{t: t, conn: conn}
}

func TestOOUSocketOpensWithASnapshot(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	lobby := createOOULobby(t, srv, host.Token)

	conn := dialOOURoom(t, live, lobby.Code, host.Token)
	state := into[oouStatePayload](t, conn.await(typeState))

	if state.Lobby.Code != lobby.Code {
		t.Errorf("snapshot is for room %q, want %q", state.Lobby.Code, lobby.Code)
	}
	if state.Game != nil {
		t.Error("a room that has not started came with a game")
	}
	if !slices.Contains(state.Online, host.User.ID) {
		t.Errorf("online = %v, want it to hold the host", state.Online)
	}
}

// Watching is cheating in this mode: there is no shared screen, so a stranger who knows the code would be reading the anonymous answers.
func TestOOUSocketRefusesANonMember(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	stranger := newGuestSession(t, srv)
	lobby := createOOULobby(t, srv, host.Token)

	conn := dialOOURoom(t, live, lobby.Code, stranger.Token)
	if env := conn.next(); env.Type != "error" {
		t.Fatalf("a stranger got a %q frame, want an error", env.Type)
	}
}

// A reconnect mid-game lands on the reader's own board, prompt and all, because there is no replay.
func TestOOUSocketSnapshotCarriesTheReadersOwnBoard(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedOOUGame(t, srv)
	writer := game.players[1]
	if rec := submitOOUAnswer(t, srv, writer.Token, game.gameID, 1, oouAnswerText(writer)); rec.Code != http.StatusCreated {
		t.Fatalf("submit: status = %d (body: %s)", rec.Code, rec.Body)
	}

	conn := dialOOURoom(t, live, game.lobbyCode, writer.Token)
	state := into[oouStatePayload](t, conn.await(typeState))

	if state.Game == nil {
		t.Fatal("a started room came with no game")
	}
	if state.Game.ID != game.gameID {
		t.Errorf("game = %q, want %q", state.Game.ID, game.gameID)
	}
	if state.Game.MyPrompt == "" {
		t.Error("the reader was handed no prompt of their own")
	}
	if state.Game.MyAnswer != oouAnswerText(writer) {
		t.Errorf("myAnswer = %q, want the answer this reader had already written", state.Game.MyAnswer)
	}
}

// Starting the game sends the id and nothing else, because no two devices see the same board.
func TestStartingAnOOUGameTellsTheRoomTheIDOnly(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	table := guests(t, srv, oneofus.MinPlayers)
	lobby := createOOULobby(t, srv, table[0].Token)
	for _, guest := range table[1:] {
		if rec := joinOOULobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
		}
	}

	conn := dialOOURoom(t, live, lobby.Code, table[1].Token)
	conn.await(typeState)

	rec := do(t, srv, http.MethodPost, oouLobbyPathFor(lobby.Code)+"/start", "", table[0].Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	started := into[oouGameStartedPayload](t, conn.await(typeGameStarted))
	if started.GameID == "" {
		t.Error("the room was not told which game to open")
	}
	if started.Lobby.Status != string(oneofus.LobbyStarted) {
		t.Errorf("lobby status = %q, want %q", started.Lobby.Status, oneofus.LobbyStarted)
	}
}

// The progress frame is counts, and counts only: naming who has written would leak the writing order.
func TestTheOOUAnswerProgressFrameNamesNobody(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedOOUGame(t, srv)
	watcher := game.players[0]
	writer := game.players[1]

	conn := dialOOURoom(t, live, game.lobbyCode, watcher.Token)
	conn.await(typeState)

	if rec := submitOOUAnswer(t, srv, writer.Token, game.gameID, 1, oouAnswerText(writer)); rec.Code != http.StatusCreated {
		t.Fatalf("submit: status = %d (body: %s)", rec.Code, rec.Body)
	}

	env := conn.await(typeAnswerProgress)
	if strings.Contains(string(env.Data), oouAnswerText(writer)) {
		t.Fatalf("the progress frame carries the answer itself: %s", env.Data)
	}
	if strings.Contains(string(env.Data), writer.User.ID) {
		t.Fatalf("the progress frame names who wrote: %s", env.Data)
	}

	progress := into[oouAnswerProgressResponse](t, env)
	if progress.AnswersIn != 1 || progress.AnswersNeeded != len(game.players) {
		t.Errorf("progress = %d/%d, want 1/%d", progress.AnswersIn, progress.AnswersNeeded, len(game.players))
	}
	if progress.VotingOpened {
		t.Error("the vote opened on the first of three answers")
	}
}

// The vote opening is a nudge to go and re-read, because myVoteSlot and the reader's own answer make a round payload unbroadcastable.
func TestTheOOUVotingStartedFrameCarriesOnlyIDs(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedOOUGame(t, srv)
	conn := dialOOURoom(t, live, game.lobbyCode, game.players[0].Token)
	conn.await(typeState)

	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	env := conn.await(typeVotingStarted)
	for _, player := range game.players {
		if strings.Contains(string(env.Data), oouAnswerText(player)) {
			t.Fatalf("the voting frame carries answers: %s", env.Data)
		}
	}

	opened := into[oouVotingStartedPayload](t, env)
	if opened.GameID != game.gameID {
		t.Errorf("gameId = %q, want %q", opened.GameID, game.gameID)
	}
	if opened.RoundNumber != 1 {
		t.Errorf("roundNumber = %d, want 1", opened.RoundNumber)
	}
}

// The round result and the game ending arrive in that order, so the table sees who went before it sees who won.
func TestAClosedOOURoundReachesTheRoomAsAReveal(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedOOUGame(t, srv)
	conn := dialOOURoom(t, live, game.lobbyCode, game.players[0].Token)
	conn.await(typeState)

	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))
	conn.await(typeVotingStarted)

	imposters := oouPlayersWithRole(t, db, game.gameID, oneofus.Imposter)
	target := sessionFor(t, game, imposters[0])
	voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), target)

	result := into[oouVoteResponse](t, conn.await(typeRoundResult))
	if !result.RoundClosed {
		t.Errorf("round_result arrived with roundClosed = %v", result.RoundClosed)
	}
	if result.Reveal == nil || result.Reveal.VotedOut.UserID != target.User.ID {
		t.Fatalf("reveal = %+v, want %q voted out", result.Reveal, target.User.ID)
	}

	over := into[oouGameOverPayload](t, conn.await(typeGameOver))
	if over.CiviliansWon == nil || !*over.CiviliansWon {
		t.Errorf("civiliansWon = %v, want true", Deref(over.CiviliansWon, false))
	}
	for _, player := range over.Players {
		if player.Role == nil {
			t.Errorf("%s's role is still hidden after the game ended", player.UserID)
		}
	}
}

// The next round starting is one frame, sent by whoever actually moved the game on.
func TestOpeningTheNextOOURoundReachesTheRoomOnce(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := sixHandedOOUGame(t, srv)
	conn := dialOOURoom(t, live, game.lobbyCode, game.players[0].Token)
	conn.await(typeState)

	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	civilians := oouPlayersWithRole(t, db, game.gameID, oneofus.Civilian)
	target := sessionFor(t, game, civilians[0])
	voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), target)
	conn.await(typeRoundResult)

	// The host may be the one who just went, and the eliminated have no buttons left.
	living := livingOOUPlayers(t, getOOUGame(t, srv, game.host.Token, game.gameID), game)
	continueOOURound(t, srv, living[0].Token, game.gameID, 1)

	opened := into[oouRoundOpenedResponse](t, conn.await(typeRoundOpened))
	if !opened.Opened {
		t.Error("the room was told about a round that did not open")
	}
	if opened.RoundNumber != 2 {
		t.Errorf("roundNumber = %d, want 2", opened.RoundNumber)
	}
	if opened.AnswersNeeded != len(game.players)-1 {
		t.Errorf("answersNeeded = %d, want %d", opened.AnswersNeeded, len(game.players)-1)
	}
}

// Somebody walking in is a lobby frame, which is the only thing the room needs before the deal.
func TestJoiningAnOOURoomTellsTheRoom(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)
	lobby := createOOULobby(t, srv, host.Token)

	conn := dialOOURoom(t, live, lobby.Code, host.Token)
	conn.await(typeState)

	if rec := joinOOULobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	body := into[oouLobbyPayload](t, conn.await(typeLobby))
	if len(body.Lobby.Players) != 2 {
		t.Errorf("players = %+v, want two", body.Lobby.Players)
	}
}

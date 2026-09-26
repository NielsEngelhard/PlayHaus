package api

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/coder/websocket"

	"playhaus-api/internal/joincode"
)

func dialWWRoom(t *testing.T, srv *httptest.Server, code, token string) *socket {
	t.Helper()

	url := strings.Replace(srv.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=" + joincode.WittyWars.Namespace() + ":" + code + "&token=" + token

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial %s: %v", code, err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	return &socket{t: t, conn: conn}
}

func TestWWSocketOpensWithASnapshotAndRefusesStrangers(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	lobby := createWWLobby(t, srv, host.Token, `{}`)

	state := into[wwStatePayload](t, dialWWRoom(t, live, lobby.Code, host.Token).await(typeState))
	if state.Lobby.Code != lobby.Code || state.Game != nil {
		t.Errorf("snapshot = %+v", state)
	}

	stranger := newGuestSession(t, srv)
	if env := dialWWRoom(t, live, lobby.Code, stranger.Token).next(); env.Type != "error" {
		t.Errorf("a stranger got a %q frame, want an error", env.Type)
	}
}

// One batch is one progress frame, and it carries counts and none of the words.
func TestWWSocketReportsABatchWithoutItsContent(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedWWGame(t, srv)
	conn := dialWWRoom(t, live, game.lobbyCode, game.players[2].Token)
	conn.await(typeState)

	author := game.players[0]
	result := submitWWBatch(t, srv, author, game.gameID)

	env := conn.await(typeAnswerProgress)
	if strings.Contains(string(env.Data), "quip-"+author.User.ID) {
		t.Fatalf("the progress frame carried an answer: %s", env.Data)
	}
	if body := into[wwAnswerResponse](t, env); body.AnswersIn != result.AnswersIn {
		t.Errorf("answersIn = %d, want %d", body.AnswersIn, result.AnswersIn)
	}
}

func TestWWSocketAnnouncesVotingAndTheReveal(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedWWGame(t, srv)
	conn := dialWWRoom(t, live, game.lobbyCode, game.host.Token)
	conn.await(typeState)

	writeEveryWWAnswer(t, srv, game)
	if body := into[wwVotingStartedPayload](t, conn.await(typeVotingStarted)); body.GameID != game.gameID {
		t.Errorf("voting_started names %q, want %q", body.GameID, game.gameID)
	}

	for _, player := range game.players {
		if getWWGame(t, srv, player.Token, game.gameID).Rounds[0].CanVote {
			do(t, srv, "POST", wwVotesPath(game.gameID), `{"roundNumber":1,"slot":1}`, player.Token)
		}
	}

	result := into[wwVoteResponse](t, conn.await(typeRoundResult))
	if result.Reveal == nil || len(result.Reveal.Authors) != 2 {
		t.Errorf("round_result = %+v", result)
	}
}

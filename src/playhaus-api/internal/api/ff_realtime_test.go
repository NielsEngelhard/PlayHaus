package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"github.com/coder/websocket"

	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/joincode"
)

// The Fake Filler socket. Everything a client is told after it opens the room arrives
// here, so these are the tests that say what a table actually sees.
//
// The one that matters most is the last: the snapshot on connect is the entire reconnect
// story -- there is no replay -- so an app that was killed mid-vote has to be able to come
// back to the same phase, the same round, and the same options in the same order.

// dialFFRoom is dialRoom's sibling for this game's namespace.
//
// A second function rather than a namespace parameter on dialRoom, which would have meant
// touching fifteen League of Letters call sites to say the thing they already say by
// default. The two are three lines each and neither is going to grow.
func dialFFRoom(t *testing.T, srv *httptest.Server, code, token string) *socket {
	t.Helper()

	url := strings.Replace(srv.URL, "http://", "ws://", 1) +
		"/api/v1/ws?room=" + joincode.FakeFiller.Namespace() + ":" + code + "&token=" + token

	ctx, cancel := context.WithTimeout(t.Context(), frameWait)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("dial %s: %v", code, err)
	}
	t.Cleanup(func() { _ = conn.CloseNow() })

	return &socket{t: t, conn: conn}
}

// close hangs the connection up, which is how these tests stage a player dropping out.
// The cleanup dialFFRoom registered will run again and find it already closed, which is a
// no-op.
func (s *socket) close() {
	s.t.Helper()

	if err := s.conn.CloseNow(); err != nil {
		s.t.Fatalf("close socket: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Connecting
// ---------------------------------------------------------------------------

func TestFFSocketOpensWithASnapshot(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	lobby := createFFLobby(t, srv, host.Token)

	conn := dialFFRoom(t, live, lobby.Code, host.Token)
	state := into[ffStatePayload](t, conn.await(typeState))

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

// Being at the table is the whole of the permission model, and in this game watching is
// cheating: a stranger who knows the code is hung up on rather than let in to read.
func TestFFSocketRefusesANonMember(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	stranger := newGuestSession(t, srv)
	lobby := createFFLobby(t, srv, host.Token)

	conn := dialFFRoom(t, live, lobby.Code, stranger.Token)
	if env := conn.next(); env.Type != "error" {
		t.Fatalf("a stranger got a %q frame, want an error", env.Type)
	}
}

// A code names its own game, so a namespace that disagrees with it is a client asking for
// a room that cannot exist -- and it is refused at the handshake rather than let in.
//
// Which is the point of Fake Filler having a letter of its own. Before it did, its rooms
// minted League of Letters codes: they would have opened the wrong screen, and two games'
// rooms would have collided in one namespace.
func TestFFRoomsAreNotLeagueOfLettersRooms(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	ff := createFFLobby(t, srv, host.Token)
	lol := createLobby(t, srv, host.Token)

	for _, mismatch := range []struct {
		namespace string
		code      string
	}{
		{joincode.LeagueOfLetters.Namespace(), ff.Code},
		{joincode.FakeFiller.Namespace(), lol.Code},
	} {
		url := strings.Replace(live.URL, "http://", "ws://", 1) +
			"/api/v1/ws?room=" + mismatch.namespace + ":" + mismatch.code + "&token=" + host.Token

		ctx, cancel := context.WithTimeout(t.Context(), frameWait)
		conn, _, err := websocket.Dial(ctx, url, nil)
		cancel()

		if err == nil {
			_ = conn.CloseNow()
			t.Errorf("%s:%s was accepted, want the handshake refused", mismatch.namespace, mismatch.code)
		}
	}
}

func TestFFSocketAnnouncesArrivalsAndDepartures(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)
	lobby := createFFLobby(t, srv, host.Token)

	hostConn := dialFFRoom(t, live, lobby.Code, host.Token)
	hostConn.await(typeState)

	if rec := joinFFLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: %d", rec.Code)
	}

	// The room changed, so the host is told -- over the socket, without asking.
	body := into[ffLobbyPayload](t, hostConn.await(typeLobby))
	if len(body.Lobby.Players) != 2 {
		t.Errorf("the lobby frame holds %d players, want 2", len(body.Lobby.Players))
	}

	guestConn := dialFFRoom(t, live, lobby.Code, guest.Token)
	guestConn.await(typeState)

	presence := into[ffPresencePayload](t, hostConn.await(typePresence))
	if !slices.Contains(presence.Online, guest.User.ID) {
		t.Errorf("online = %v, want it to hold the guest", presence.Online)
	}
}

// ---------------------------------------------------------------------------
// Playing, over the socket
// ---------------------------------------------------------------------------

// The game_started frame carries the id and the lobby, not the board: every player's board
// is different, so each of them fetches their own.
func TestFFSocketAnnouncesTheGameStarting(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	host := newGuestSession(t, srv)
	others := []sessionResponse{newGuestSession(t, srv), newGuestSession(t, srv)}
	lobby := createFFLobby(t, srv, host.Token)
	for _, other := range others {
		if rec := joinFFLobby(t, srv, other.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join: %d", rec.Code)
		}
	}

	conn := dialFFRoom(t, live, lobby.Code, others[0].Token)
	conn.await(typeState)

	rec := do(t, srv, http.MethodPost, ffLobbyPathFor(lobby.Code)+"/start", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	started := into[ffGameStartedPayload](t, conn.await(typeGameStarted))
	if started.GameID != decodeBody[ffLobbyResponse](t, rec).GameID {
		t.Errorf("the frame names game %q, want the one the response did", started.GameID)
	}
	if started.Lobby.Status != "started" {
		t.Errorf("the lobby on the frame is %q, want started", started.Lobby.Status)
	}
}

// Answer progress is broadcast to the whole table, so it has to carry counts and nothing
// else: what a player is writing is the one thing the writing phase is hiding.
func TestFFSocketReportsAnswerProgressWithoutContent(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedFFGame(t, srv)
	watcher := game.players[2]

	conn := dialFFRoom(t, live, game.lobbyCode, watcher.Token)
	conn.await(typeState)

	author := game.players[0]
	round := firstMineFFRound(t, getFFGame(t, srv, author.Token, game.gameID))
	answerOnePrompt(t, srv, author, game.gameID, round)

	env := conn.await(typeAnswerProgress)
	if strings.Contains(string(env.Data), ffFill(author.User.ID, round.Number, 0)) {
		t.Fatalf("the answer_progress frame carried the answer itself: %s", env.Data)
	}

	body := into[ffAnswerResponse](t, env)
	if body.AnswersIn != 1 {
		t.Errorf("answersIn = %d, want 1", body.AnswersIn)
	}
	if body.VotingOpened {
		t.Error("votingOpened on the first of six answers")
	}
}

func TestFFSocketAnnouncesVotingOpening(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedFFGame(t, srv)

	conn := dialFFRoom(t, live, game.lobbyCode, game.players[1].Token)
	conn.await(typeState)

	writeEveryFFAnswer(t, srv, game)

	body := into[ffVotingStartedPayload](t, conn.await(typeVotingStarted))
	if body.GameID != game.gameID {
		t.Errorf("the frame names game %q, want %q", body.GameID, game.gameID)
	}
}

// The reveal is public -- who wrote what, which was true, who was fooled -- so the whole
// table is sent the same body the voter was answered with. The host's tap follows it.
func TestFFSocketBroadcastsTheRevealAndTheHostMovingOn(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	conn := dialFFRoom(t, live, game.lobbyCode, game.host.Token)
	conn.await(typeState)

	total := getFFGame(t, srv, game.host.Token, game.gameID).TotalRounds

	for number := 1; number <= total; number++ {
		closeFFRound(t, srv, game, number, func(r ffRoundResponse) int { return r.Options[0].Slot })

		result := into[ffVoteResponse](t, conn.await(typeRoundResult))
		if result.RoundNumber != number {
			t.Fatalf("the result frame is for round %d, want %d", result.RoundNumber, number)
		}
		if result.Reveal == nil {
			t.Fatalf("round %d was revealed with no reveal on the frame", number)
		}
		// Now, and only now, the authors are named.
		for _, option := range result.Reveal.Options {
			if option.AuthorID == "" {
				t.Errorf("round %d slot %d was revealed without an author", number, option.Slot)
			}
		}

		if rec := advanceFFRound(t, srv, game.host.Token, game.gameID, number); rec.Code != http.StatusCreated {
			t.Fatalf("advance past round %d: status = %d (body: %s)", number, rec.Code, rec.Body)
		}

		moved := into[ffAdvanceResponse](t, conn.await(typeRoundAdvanced))
		if want := number == total; (moved.NextRound == nil) != want {
			t.Errorf("round %d: nextRound = %v, want present = %v", number, moved.NextRound, !want)
		}
	}

	over := into[ffGameOverPayload](t, conn.await(typeGameOver))
	if len(over.Players) != len(game.players) {
		t.Errorf("the final scoreboard holds %d players, want %d", len(over.Players), len(game.players))
	}
}

// Only the host may move the table on, so their tap is the frame that ends the reveal for
// everybody -- which is the whole reason it goes over the socket rather than a clock.
func TestFFSocketAnnouncesTheHostMovingOnFromTheReveal(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	guest := dialFFRoom(t, live, game.lobbyCode, game.players[1].Token)
	guest.await(typeState)

	closeFFRound(t, srv, game, 1, func(r ffRoundResponse) int { return r.Options[0].Slot })
	guest.await(typeRoundResult)

	// A player tapping it themselves tells nobody anything.
	if rec := advanceFFRound(t, srv, game.players[1].Token, game.gameID, 1); rec.Code != http.StatusForbidden {
		t.Fatalf("guest advance: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}

	if rec := advanceFFRound(t, srv, game.host.Token, game.gameID, 1); rec.Code != http.StatusCreated {
		t.Fatalf("host advance: status = %d (body: %s)", rec.Code, rec.Body)
	}

	moved := into[ffAdvanceResponse](t, guest.await(typeRoundAdvanced))
	if moved.CurrentRound != 2 {
		t.Errorf("the frame moves the table to round %d, want 2", moved.CurrentRound)
	}
	if moved.Phase != string(fakefiller.PhaseVoting) {
		t.Errorf("phase = %q, want %q", moved.Phase, fakefiller.PhaseVoting)
	}
	if moved.NextRound == nil {
		t.Fatal("the table was moved on to no round")
	}
	if moved.NextRound.Number != 2 {
		t.Errorf("the round opened is %d, want 2", moved.NextRound.Number)
	}
	// The round it opens is still a secret -- who wrote what waits for its own reveal.
	for _, option := range moved.NextRound.Options {
		if option.AuthorID != "" {
			t.Errorf("round 2 slot %d was opened with its author named", option.Slot)
		}
	}
}

// ---------------------------------------------------------------------------
// Reconnecting
// ---------------------------------------------------------------------------

// The test this whole socket exists to pass.
//
// A player drops mid-voting -- app killed, phone locked, train tunnel -- and comes back.
// There is no replay to catch up on, so the snapshot on connect has to be enough on its
// own: the same phase, the same round, and crucially the same options in the same order,
// because a player who had half decided on the second one must not come back to find it
// somewhere else.
func TestFFReconnectingMidVotingRestoresThePhaseRoundAndOptionOrder(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	// Play round 1 out so the table is somewhere other than where it started -- a snapshot
	// that always said "round 1" would pass this test without restoring anything.
	playFFRound(t, srv, game, 1, func(r ffRoundResponse) int { return r.Options[0].Slot })

	player := game.players[1]

	first := dialFFRoom(t, live, game.lobbyCode, player.Token)
	before := into[ffStatePayload](t, first.await(typeState))
	if before.Game == nil {
		t.Fatal("the snapshot of a started game carried no game")
	}
	if before.Game.Phase != string(fakefiller.PhaseVoting) {
		t.Fatalf("phase = %q, want voting", before.Game.Phase)
	}
	if before.Game.CurrentRound != 2 {
		t.Fatalf("currentRound = %d, want 2", before.Game.CurrentRound)
	}

	// The connection dies. Nothing is forfeited by that in this game -- every round waits
	// for everybody -- so the table is simply held up until they come back.
	first.close()

	again := dialFFRoom(t, live, game.lobbyCode, player.Token)
	after := into[ffStatePayload](t, again.await(typeState))
	if after.Game == nil {
		t.Fatal("the snapshot after reconnecting carried no game")
	}

	if after.Game.Phase != before.Game.Phase {
		t.Errorf("phase came back as %q, was %q", after.Game.Phase, before.Game.Phase)
	}
	if after.Game.CurrentRound != before.Game.CurrentRound {
		t.Errorf("currentRound came back as %d, was %d", after.Game.CurrentRound, before.Game.CurrentRound)
	}
	if after.Game.Score != before.Game.Score {
		t.Errorf("score came back as %d, was %d", after.Game.Score, before.Game.Score)
	}

	wantOrder := ffOptionOrder(t, *before.Game, before.Game.CurrentRound)
	gotOrder := ffOptionOrder(t, *after.Game, after.Game.CurrentRound)
	if !slices.Equal(wantOrder, gotOrder) {
		t.Errorf("the options came back in a different order: %v, was %v", gotOrder, wantOrder)
	}

	// The finished round is still revealed, and the open one still is not.
	for _, r := range after.Game.Rounds {
		want := r.Number < after.Game.CurrentRound
		if r.Revealed != want {
			t.Errorf("round %d: revealed = %v, want %v", r.Number, r.Revealed, want)
		}
	}

	// And the reconnected player can still vote, which is the point of coming back.
	if after.Game.CurrentRound == 2 {
		next, secondRound := ffVoterFor(t, srv, game, 2)
		if rec := castFFVote(t, srv, next.Token, game.gameID, 2, secondRound.Options[0].Slot); rec.Code != http.StatusCreated {
			t.Fatalf("vote after reconnecting: status = %d (body: %s)", rec.Code, rec.Body)
		}
	}
}

// A player who reconnects during the writing phase gets their own half-finished work back,
// and nobody else's.
func TestFFReconnectingWhileWritingRestoresYourOwnAnswers(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedFFGame(t, srv)
	author := game.players[0]
	round := firstMineFFRound(t, getFFGame(t, srv, author.Token, game.gameID))
	answerOnePrompt(t, srv, author, game.gameID, round)

	conn := dialFFRoom(t, live, game.lobbyCode, author.Token)
	env := conn.await(typeState)
	state := into[ffStatePayload](t, env)

	if state.Game == nil {
		t.Fatal("the snapshot carried no game")
	}

	found := false
	for _, r := range state.Game.Rounds {
		if r.Number != round.Number {
			continue
		}
		found = true
		if !r.Answered || len(r.MyFills) == 0 {
			t.Errorf("round %d came back unanswered: %+v", r.Number, r)
		}
		if r.MyFills[0] != ffFill(author.User.ID, round.Number, 0) {
			t.Errorf("myFills = %v, want the answer that was written", r.MyFills)
		}
	}
	if !found {
		t.Fatalf("the snapshot has no round %d", round.Number)
	}

	// The other two players' snapshots carry no trace of it.
	for _, other := range game.players[1:] {
		otherConn := dialFFRoom(t, live, game.lobbyCode, other.Token)
		otherEnv := otherConn.await(typeState)
		if strings.Contains(string(otherEnv.Data), ffFill(author.User.ID, round.Number, 0)) {
			t.Fatalf("%s's snapshot carried %s's answer", other.User.ID, author.User.ID)
		}
	}
}


// The reveal is a place the table stands in now, not a frame that has come and gone, so a
// player who drops while reading it comes back to it rather than to the next vote.
func TestFFReconnectingDuringTheRevealComesBackToIt(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	live := liveServer(t, srv)

	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	closeFFRound(t, srv, game, 1, func(r ffRoundResponse) int { return r.Options[0].Slot })

	player := game.players[1]

	back := dialFFRoom(t, live, game.lobbyCode, player.Token)
	snapshot := into[ffStatePayload](t, back.await(typeState))
	if snapshot.Game == nil {
		t.Fatal("the snapshot of a started game carried no game")
	}

	if snapshot.Game.Phase != string(fakefiller.PhaseReveal) {
		t.Errorf("phase = %q, want %q", snapshot.Game.Phase, fakefiller.PhaseReveal)
	}
	if snapshot.Game.CurrentRound != 1 {
		t.Errorf("currentRound = %d, want 1", snapshot.Game.CurrentRound)
	}

	// And the round it came back to is told in full, so the reveal can be drawn from the
	// snapshot alone -- the frame that carried it has long since gone.
	told := false
	for _, round := range snapshot.Game.Rounds {
		if round.Number != 1 {
			continue
		}
		told = true

		if !round.Revealed {
			t.Error("round 1 came back unrevealed")
		}
		if len(round.Authors) == 0 {
			t.Error("round 1 came back naming no authors")
		}
		for _, option := range round.Options {
			if option.AuthorID == "" {
				t.Errorf("round 1 slot %d came back without its author", option.Slot)
			}
		}
	}
	if !told {
		t.Fatal("the snapshot has no round 1")
	}
}

package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/joincode"
)

// The Fake Filler room, through the whole middleware chain. The helpers at the top are
// shared with ff_answer_test.go, ff_vote_test.go and ff_realtime_test.go -- a game is
// three requests to set up, and spelling those out per file would be three chances for
// them to drift.

const ffLobbyPath = "/api/v1/fake-filler/lobby"

func ffLobbyPathFor(code string) string     { return ffLobbyPath + "/" + code }
func ffLobbyPlayersPath(code string) string { return ffLobbyPathFor(code) + "/players" }
func ffGamePath(gameID string) string       { return "/api/v1/fake-filler/game/" + gameID }
func ffAnswersPath(gameID string) string    { return ffGamePath(gameID) + "/answers" }
func ffVotesPath(gameID string) string      { return ffGamePath(gameID) + "/votes" }

func createFFLobby(t *testing.T, h http.Handler, token string) ffLobbyResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, ffLobbyPath, `{}`, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create fake filler lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[ffLobbyResponse](t, rec)
}

func joinFFLobby(t *testing.T, h http.Handler, token, code string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, ffLobbyPlayersPath(code), "", token)
}

// startedFFGame is a game in its writing phase, plus everything a test needs to play it.
type startedFFGame struct {
	lobbyCode string
	gameID    string
	host      sessionResponse
	players   []sessionResponse
}

// startFFGame opens a room, walks everybody in, and starts it. Three players by default,
// which is the smallest table the game allows and therefore the one where a round has
// exactly one voter -- so a test can play a whole game without having to work out which of
// several people still owe a vote.
func startFFGame(t *testing.T, h http.Handler, host sessionResponse, others ...sessionResponse) startedFFGame {
	t.Helper()

	lobby := createFFLobby(t, h, host.Token)

	for _, other := range others {
		if rec := joinFFLobby(t, h, other.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join fake filler lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
		}
	}

	rec := do(t, h, http.MethodPost, ffLobbyPathFor(lobby.Code)+"/start", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start fake filler lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	started := decodeBody[ffLobbyResponse](t, rec)
	if started.GameID == "" {
		t.Fatal("a started room came back with no game id")
	}

	return startedFFGame{
		lobbyCode: lobby.Code,
		gameID:    started.GameID,
		host:      host,
		players:   append([]sessionResponse{host}, others...),
	}
}

// threeHandedFFGame is the setup nearly every play test wants.
func threeHandedFFGame(t *testing.T, h http.Handler) startedFFGame {
	t.Helper()
	return startFFGame(t, h, newGuestSession(t, h), newGuestSession(t, h), newGuestSession(t, h))
}

func getFFGame(t *testing.T, h http.Handler, token, gameID string) ffGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, ffGamePath(gameID), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get fake filler game: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[ffGameResponse](t, rec)
}

// ---------------------------------------------------------------------------
// Opening a room
// ---------------------------------------------------------------------------

func TestFFCreateLobbyRequiresAuth(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	rec := post(t, srv, ffLobbyPath, `{}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

// The letter on the front of the code is the whole of what routes it, and Fake Filler
// mints its own rather than League of Letters' -- which is what the unfinished service did.
func TestFFLobbyCodesAreFakeFillerCodes(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)

	if !strings.HasPrefix(lobby.Code, "F") {
		t.Errorf("code = %q, want it to start with F", lobby.Code)
	}
	game, ok := joincode.GameFor(lobby.Code)
	if !ok || game != joincode.FakeFiller {
		t.Errorf("code %q names game %q, want %q", lobby.Code, game, joincode.FakeFiller)
	}
}

func TestFFANewRoomHoldsItsHostAndNobodyElse(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)

	if lobby.HostID != host.User.ID {
		t.Errorf("hostId = %q, want %q", lobby.HostID, host.User.ID)
	}
	if len(lobby.Players) != 1 || lobby.Players[0].UserID != host.User.ID {
		t.Fatalf("players = %+v, want just the host", lobby.Players)
	}
	if lobby.Settings.GameMode != string(fakefiller.DefaultGameMode) {
		t.Errorf("gameMode = %q, want %q", lobby.Settings.GameMode, fakefiller.DefaultGameMode)
	}
	if lobby.MinPlayers != fakefiller.MinLobbyPlayers || lobby.MaxPlayers != fakefiller.MaxLobbyPlayers {
		t.Errorf("bounds = %d..%d, want %d..%d",
			lobby.MinPlayers, lobby.MaxPlayers, fakefiller.MinLobbyPlayers, fakefiller.MaxLobbyPlayers)
	}
}

// A code for another game is a perfectly good code for a room that is not at this address,
// which is a 404 rather than a 400.
func TestFFRoutesRefuseAnotherGamesCode(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lol := createLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodGet, ffLobbyPathFor(lol.Code), "", host.Token)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
	if code := errorCode(t, rec); code != "lobby_not_found" {
		t.Errorf("code = %q, want lobby_not_found", code)
	}
}

// And the same in reverse: a Fake Filler code is not a League of Letters room.
func TestLeagueOfLettersRoutesRefuseAFakeFillerCode(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	ff := createFFLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodGet, "/api/v1/league-of-letters/lobby/"+ff.Code, "", host.Token)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// The literal is registered before {code}, so it is not read as a room called "current".
func TestFFCurrentLobbyIsTheHostsOwn(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	stranger := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodGet, ffLobbyPath+"/current", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("host: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	if got := decodeBody[ffLobbyResponse](t, rec); got.Code != lobby.Code {
		t.Errorf("host was given room %q, want %q", got.Code, lobby.Code)
	}

	// Nothing open is the ordinary state, not a failed lookup.
	if rec := do(t, srv, http.MethodGet, ffLobbyPath+"/current", "", stranger.Token); rec.Code != http.StatusNoContent {
		t.Errorf("stranger: status = %d, want %d", rec.Code, http.StatusNoContent)
	}
}

// ---------------------------------------------------------------------------
// Joining
// ---------------------------------------------------------------------------

func TestFFJoiningTwiceIsNotASecondSeat(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)

	for range 2 {
		rec := joinFFLobby(t, srv, guest.Token, lobby.Code)
		if rec.Code != http.StatusOK {
			t.Fatalf("join: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
		}
		if got := decodeBody[ffLobbyResponse](t, rec); len(got.Players) != 2 {
			t.Fatalf("room holds %d players, want 2", len(got.Players))
		}
	}
}

// Nine is the ceiling, because every prompt is written by two people and a table bigger
// than this stops being one conversation.
func TestFFAFullRoomIsRefused(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createFFLobby(t, srv, host.Token)

	for i := 1; i < fakefiller.MaxLobbyPlayers; i++ {
		guest := newGuestSession(t, srv)
		if rec := joinFFLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join %d: status = %d (body: %s)", i, rec.Code, rec.Body)
		}
	}

	late := newGuestSession(t, srv)
	rec := joinFFLobby(t, srv, late.Token, lobby.Code)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "lobby_full" {
		t.Errorf("code = %q, want lobby_full", code)
	}
}

// Membership is tested before the started check, so somebody coming back to a game they
// are already in is not turned away as a late joiner.
func TestFFAMemberOfAStartedRoomIsLetBackIn(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	rec := joinFFLobby(t, srv, game.players[2].Token, game.lobbyCode)
	if rec.Code != http.StatusOK {
		t.Fatalf("returning member: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	late := newGuestSession(t, srv)
	rec = joinFFLobby(t, srv, late.Token, game.lobbyCode)
	if rec.Code != http.StatusConflict {
		t.Fatalf("stranger: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "lobby_started" {
		t.Errorf("code = %q, want lobby_started", code)
	}
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

func TestFFOnlyTheHostMovesTheSettings(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)
	if rec := joinFFLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: %d", rec.Code)
	}

	body := `{"gameMode":"creative"}`

	rec := do(t, srv, http.MethodPatch, ffLobbyPathFor(lobby.Code), body, guest.Token)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("guest: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
	if code := errorCode(t, rec); code != "not_host" {
		t.Errorf("code = %q, want not_host", code)
	}

	rec = do(t, srv, http.MethodPatch, ffLobbyPathFor(lobby.Code), body, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("host: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	if got := decodeBody[ffLobbyResponse](t, rec); got.Settings.GameMode != "creative" {
		t.Errorf("gameMode = %q, want creative", got.Settings.GameMode)
	}
}

// A PATCH carrying only a language must not knock the mode back to the default -- that is
// the whole reason both fields are pointers.
func TestFFPatchingOneSettingLeavesTheOtherAlone(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createFFLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodPatch, ffLobbyPathFor(lobby.Code), `{"gameMode":"creative"}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("set mode: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec = do(t, srv, http.MethodPatch, ffLobbyPathFor(lobby.Code), `{"locale":"en"}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("set locale: status = %d (body: %s)", rec.Code, rec.Body)
	}

	got := decodeBody[ffLobbyResponse](t, rec)
	if got.Settings.GameMode != "creative" {
		t.Errorf("gameMode = %q, want creative -- a language-only patch reset the mode", got.Settings.GameMode)
	}
	if got.Settings.Locale != "en" {
		t.Errorf("locale = %q, want en", got.Settings.Locale)
	}
}

func TestFFAnUnknownGameModeIsRefused(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	lobby := createFFLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodPatch, ffLobbyPathFor(lobby.Code), `{"gameMode":"nonsense"}`, host.Token)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnprocessableEntity, rec.Body)
	}
}

// The prompts are drawn from the mode at kickoff, so moving it afterwards would be a
// settings card describing a board that does not exist.
func TestFFSettingsCannotMoveOnceTheGameHasStarted(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	rec := do(t, srv, http.MethodPatch, ffLobbyPathFor(game.lobbyCode), `{"gameMode":"creative"}`, game.host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "lobby_started" {
		t.Errorf("code = %q, want lobby_started", code)
	}
}

// ---------------------------------------------------------------------------
// Starting
// ---------------------------------------------------------------------------

func TestFFStartingNeedsThreePlayersAndTheHost(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)
	startPath := ffLobbyPathFor(lobby.Code) + "/start"

	rec := do(t, srv, http.MethodPost, startPath, "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("one player: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "not_enough_players" {
		t.Errorf("code = %q, want not_enough_players", code)
	}

	if rec := joinFFLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: %d", rec.Code)
	}
	if rec := do(t, srv, http.MethodPost, startPath, "", host.Token); rec.Code != http.StatusConflict {
		t.Errorf("two players: status = %d, want %d", rec.Code, http.StatusConflict)
	}

	third := newGuestSession(t, srv)
	if rec := joinFFLobby(t, srv, third.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: %d", rec.Code)
	}

	// Three is enough, but only the host may press it.
	rec = do(t, srv, http.MethodPost, startPath, "", guest.Token)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("guest starting: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}

	if rec := do(t, srv, http.MethodPost, startPath, "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("host starting: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
}

// A game has as many rounds as it has players, and each player holds exactly two prompts.
// Asserted over every table size the game allows, because the pairing is the one piece of
// this game that has to hold for all of them at once.
func TestFFEveryPlayerIsDealtExactlyTwoPrompts(t *testing.T) {
	for count := fakefiller.MinLobbyPlayers; count <= fakefiller.MaxLobbyPlayers; count++ {
		t.Run(fmt.Sprintf("%d players", count), func(t *testing.T) {
			srv, _ := newTestServerWithDB(t)

			sessions := make([]sessionResponse, count)
			for i := range sessions {
				sessions[i] = newGuestSession(t, srv)
			}
			game := startFFGame(t, srv, sessions[0], sessions[1:]...)

			for _, player := range sessions {
				body := getFFGame(t, srv, player.Token, game.gameID)

				if body.TotalRounds != count {
					t.Fatalf("%s sees %d rounds, want %d", player.User.ID, body.TotalRounds, count)
				}
				if body.Phase != string(fakefiller.PhaseWriting) {
					t.Fatalf("phase = %q, want writing", body.Phase)
				}

				mine := 0
				for _, round := range body.Rounds {
					if round.Mine {
						mine++
					}
					if round.Mine == round.CanVote {
						t.Errorf("round %d is both mine and votable (or neither)", round.Number)
					}
				}
				if mine != fakefiller.AnswersPerPlayer {
					t.Errorf("%s holds %d prompts, want %d", player.User.ID, mine, fakefiller.AnswersPerPlayer)
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Leaving, closing, abandoning, rematching
// ---------------------------------------------------------------------------

func TestFFLeavingGivesTheSeatBack(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)
	if rec := joinFFLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: %d", rec.Code)
	}

	rec := do(t, srv, http.MethodDelete, ffLobbyPlayersPath(lobby.Code)+"/me", "", guest.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("leave: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	rec = do(t, srv, http.MethodGet, ffLobbyPathFor(lobby.Code), "", host.Token)
	if got := decodeBody[ffLobbyResponse](t, rec); len(got.Players) != 1 {
		t.Errorf("room holds %d players, want 1", len(got.Players))
	}
}

func TestFFOnlyTheHostClosesTheRoom(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createFFLobby(t, srv, host.Token)
	if rec := joinFFLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: %d", rec.Code)
	}

	if rec := do(t, srv, http.MethodDelete, ffLobbyPathFor(lobby.Code), "", guest.Token); rec.Code != http.StatusForbidden {
		t.Fatalf("guest: status = %d, want %d", rec.Code, http.StatusForbidden)
	}
	if rec := do(t, srv, http.MethodDelete, ffLobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("host: status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if rec := do(t, srv, http.MethodGet, ffLobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNotFound {
		t.Errorf("after closing: status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

// Abandoning takes the game with it, which is the difference from a delete.
func TestFFAbandoningEndsTheGameToo(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	rec := do(t, srv, http.MethodPost, ffLobbyPathFor(game.lobbyCode)+"/abandon", "", game.host.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("abandon: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	body := getFFGame(t, srv, game.host.Token, game.gameID)
	if body.Status != string(fakefiller.GameAbandoned) {
		t.Errorf("status = %q, want %q", body.Status, fakefiller.GameAbandoned)
	}
}

// A rematch is refused while the game is still being played: the host would be inviting
// players elsewhere while they are still sitting at the board.
func TestFFRematchIsRefusedMidGame(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	rec := do(t, srv, http.MethodPost, ffLobbyPathFor(game.lobbyCode)+"/rematch", "", game.host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "game_not_over" {
		t.Errorf("code = %q, want game_not_over", code)
	}
}

// ---------------------------------------------------------------------------
// Reading a game
// ---------------------------------------------------------------------------

// Being at the table is the whole of the permission model, and a stranger is told the same
// thing as somebody asking about a game that does not exist.
func TestFFAStrangerCannotReadTheGame(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	stranger := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodGet, ffGamePath(game.gameID), "", stranger.Token)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
	if code := errorCode(t, rec); code != "game_not_found" {
		t.Errorf("code = %q, want game_not_found", code)
	}
}

func TestFFAnUnparseableGameIDIsNotFound(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodGet, ffGamePath("not-a-uuid"), "", host.Token)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

// A mid-game player finds the room on the reconnect list, listed by its join code rather
// than by the game id -- a room is reached by its code, and that is the screen that knows
// how to draw a game like this.
func TestFFAGameInProgressIsReconnectable(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	rec := do(t, srv, http.MethodGet, "/api/v1/reconnect-games", "", game.players[1].Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	listed := decodeBody[[]ReconnectableGame](t, rec)
	found := false
	for _, entry := range listed {
		if entry.Type != FakeFillerMultiplayer {
			continue
		}
		found = true
		if entry.ID != game.lobbyCode {
			t.Errorf("listed as %q, want the join code %q", entry.ID, game.lobbyCode)
		}
	}
	if !found {
		t.Errorf("the game is not on the reconnect list: %+v", listed)
	}
}

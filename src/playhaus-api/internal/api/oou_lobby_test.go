package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"gorm.io/gorm"

	"playhaus-api/internal/oneofus"
)

// The One of Us room, through the whole middleware chain. The helpers here are shared with oou_answer_test.go, oou_vote_test.go and oou_realtime_test.go, because a dealt table is several requests to set up and spelling that out per file would be several chances for it to drift.

const oouLobbyPath = "/api/v1/one-of-us/lobby"

func oouLobbyPathFor(code string) string     { return oouLobbyPath + "/" + code }
func oouLobbyPlayersPath(code string) string { return oouLobbyPathFor(code) + "/players" }
func oouGamePath(gameID string) string       { return "/api/v1/one-of-us/multi-device/" + gameID }
func oouAnswersPath(gameID string) string    { return oouGamePath(gameID) + "/answers" }
func oouVotesPath(gameID string) string      { return oouGamePath(gameID) + "/votes" }
func oouContinuePath(gameID string) string   { return oouGamePath(gameID) + "/continue" }

func createOOULobby(t *testing.T, h http.Handler, token string) oouLobbyResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, oouLobbyPath, `{}`, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create one of us lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[oouLobbyResponse](t, rec)
}

func joinOOULobby(t *testing.T, h http.Handler, token, code string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, oouLobbyPlayersPath(code), "", token)
}

// startedOOUGame is a dealt table waiting for its first answers, plus everything a test needs to play it.
type startedOOUGame struct {
	lobbyCode string
	gameID    string
	host      sessionResponse
	players   []sessionResponse
}

// startOOUGame opens a room, walks everybody in, and deals.
func startOOUGame(t *testing.T, h http.Handler, host sessionResponse, others ...sessionResponse) startedOOUGame {
	t.Helper()

	lobby := createOOULobby(t, h, host.Token)

	for _, other := range others {
		if rec := joinOOULobby(t, h, other.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join one of us lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
		}
	}

	rec := do(t, h, http.MethodPost, oouLobbyPathFor(lobby.Code)+"/start", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start one of us lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	started := decodeBody[oouLobbyResponse](t, rec)
	if started.GameID == "" {
		t.Fatal("a dealt room came back with no game id")
	}

	return startedOOUGame{
		lobbyCode: lobby.Code,
		gameID:    started.GameID,
		host:      host,
		players:   append([]sessionResponse{host}, others...),
	}
}

// guests is the table, as sessions.
func guests(t *testing.T, h http.Handler, count int) []sessionResponse {
	t.Helper()

	sessions := make([]sessionResponse, 0, count)
	for range count {
		sessions = append(sessions, newGuestSession(t, h))
	}
	return sessions
}

// threeHandedOOUGame is the smallest table the game allows, and the one where round one is also the last round: after a single elimination two players are left, which ends it whichever side went.
func threeHandedOOUGame(t *testing.T, h http.Handler) startedOOUGame {
	t.Helper()

	table := guests(t, h, 3)
	return startOOUGame(t, h, table[0], table[1:]...)
}

// sixHandedOOUGame is the smallest table that survives losing a civilian, so it is the one the second-round tests need.
func sixHandedOOUGame(t *testing.T, h http.Handler) startedOOUGame {
	t.Helper()

	table := guests(t, h, 6)
	return startOOUGame(t, h, table[0], table[1:]...)
}

func getOOUGame(t *testing.T, h http.Handler, token, gameID string) oouGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, oouGamePath(gameID), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get one of us game: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[oouGameResponse](t, rec)
}

// oouPlayersWithRole reads the deal out of the database, because the wire deliberately will not say it.
func oouPlayersWithRole(t *testing.T, db *gorm.DB, gameID string, role oneofus.Role) []string {
	t.Helper()

	var players []oneofus.OOUGamePlayer
	if err := db.Where("game_id = ? AND role = ?", gameID, role).Find(&players).Error; err != nil {
		t.Fatalf("read the deal: %v", err)
	}

	ids := make([]string, 0, len(players))
	for _, player := range players {
		ids = append(ids, player.UserID)
	}
	return ids
}

// sessionFor is the token belonging to a user id the database named.
func sessionFor(t *testing.T, game startedOOUGame, userID string) sessionResponse {
	t.Helper()

	for _, player := range game.players {
		if player.User.ID == userID {
			return player
		}
	}

	t.Fatalf("%s is not at this table", userID)
	return sessionResponse{}
}

func TestOOUCreateLobbyRequiresAuth(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	rec := post(t, srv, oouLobbyPath, `{}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

// The letter on the front of the code is the whole of what routes it, so a One of Us room has to mint a One of Us code.
func TestOOULobbyCodesAreOneOfUsCodes(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)

	if !strings.HasPrefix(lobby.Code, "O") {
		t.Errorf("code = %q, want it to start with an O", lobby.Code)
	}
}

// The host is a player like any other, and the first one.
func TestANewOOULobbySeatsItsHost(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)

	if lobby.HostID != host.User.ID {
		t.Errorf("hostId = %q, want %q", lobby.HostID, host.User.ID)
	}
	if len(lobby.Players) != 1 || lobby.Players[0].UserID != host.User.ID {
		t.Fatalf("players = %+v, want just the host", lobby.Players)
	}
	if lobby.MinPlayers != oneofus.MinPlayers || lobby.MaxPlayers != oneofus.MaxPlayers {
		t.Errorf("player bounds = %d..%d, want %d..%d", lobby.MinPlayers, lobby.MaxPlayers, oneofus.MinPlayers, oneofus.MaxPlayers)
	}
}

func TestOnlyTheOOUHostMayChangeTheSettings(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)
	if rec := joinOOULobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodPatch, oouLobbyPathFor(lobby.Code), `{"wordOnly":true}`, guest.Token)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("a guest changing the settings: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}

	rec = do(t, srv, http.MethodPatch, oouLobbyPathFor(lobby.Code), `{"wordOnly":true,"enabledRoles":[1]}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("the host changing the settings: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	settings := decodeBody[oouLobbyResponse](t, rec).Settings
	if !settings.WordOnly {
		t.Error("wordOnly did not stick")
	}
	if fmt.Sprint(settings.EnabledRoles) != "[1]" {
		t.Errorf("enabledRoles = %v, want just the imposter", settings.EnabledRoles)
	}
}

// A knob the settings card left out keeps what the room is already playing, rather than reverting to the default.
func TestAnOOUSettingsPatchLeavesWhatItDidNotSend(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)

	if rec := do(t, srv, http.MethodPatch, oouLobbyPathFor(lobby.Code), `{"enabledRoles":[1]}`, host.Token); rec.Code != http.StatusOK {
		t.Fatalf("first patch: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodPatch, oouLobbyPathFor(lobby.Code), `{"wordOnly":true}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("second patch: status = %d (body: %s)", rec.Code, rec.Body)
	}

	settings := decodeBody[oouLobbyResponse](t, rec).Settings
	if fmt.Sprint(settings.EnabledRoles) != "[1]" {
		t.Errorf("enabledRoles = %v, want the set the first patch chose", settings.EnabledRoles)
	}
}

func TestAnOOULobbyWillNotStartShortHanded(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)
	if rec := joinOOULobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodPost, oouLobbyPathFor(lobby.Code)+"/start", "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "not_enough_players" {
		t.Errorf("code = %q, want not_enough_players", code)
	}
}

// Starting deals the whole table in one go: a seat each, one prompt pair for the game, and the first round open for answers.
func TestStartingAnOOULobbyDealsEverybodyIn(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	board := getOOUGame(t, srv, game.host.Token, game.gameID)

	if len(board.Players) != len(game.players) {
		t.Fatalf("players = %d, want %d", len(board.Players), len(game.players))
	}
	if board.Phase != string(oneofus.PhaseAnswer) {
		t.Errorf("phase = %q, want %q", board.Phase, oneofus.PhaseAnswer)
	}
	if board.CurrentRound != 1 {
		t.Errorf("currentRound = %d, want 1", board.CurrentRound)
	}
	if board.Round == nil || board.Round.AnswersNeeded != len(game.players) {
		t.Fatalf("round = %+v, want one waiting on the whole table", board.Round)
	}
	if board.MayorID == "" {
		t.Error("nobody is wearing the chain")
	}
}

// A dealt room is one nobody else can walk into.
func TestAStartedOOULobbyRefusesANewPlayer(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)
	late := newGuestSession(t, srv)

	rec := joinOOULobby(t, srv, late.Token, game.lobbyCode)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "lobby_started" {
		t.Errorf("code = %q, want lobby_started", code)
	}
}

// Somebody who is already at the table gets back in, which is what a reconnect is.
func TestAMemberIsLetBackIntoAStartedOOULobby(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	rec := joinOOULobby(t, srv, game.players[1].Token, game.lobbyCode)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	if decodeBody[oouLobbyResponse](t, rec).GameID != game.gameID {
		t.Error("a returning player was not pointed back at their game")
	}
}

// The room you are sent back to is your own, and a guest at somebody else's table is not sent anywhere.
func TestCurrentOOULobbyIsTheHostsOnly(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)
	if rec := joinOOULobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := do(t, srv, http.MethodGet, oouLobbyPath+"/current", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("the host: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	if got := decodeBody[oouLobbyResponse](t, rec).Code; got != lobby.Code {
		t.Errorf("code = %q, want %q", got, lobby.Code)
	}

	if rec := do(t, srv, http.MethodGet, oouLobbyPath+"/current", "", guest.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("the guest: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

func TestLeavingAnOOULobbyGivesTheSeatBack(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)
	if rec := joinOOULobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if rec := do(t, srv, http.MethodDelete, oouLobbyPlayersPath(lobby.Code)+"/me", "", guest.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("leave: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	rec := do(t, srv, http.MethodGet, oouLobbyPathFor(lobby.Code), "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if players := decodeBody[oouLobbyResponse](t, rec).Players; len(players) != 1 {
		t.Errorf("players = %+v, want just the host", players)
	}
}

func TestOnlyTheOOUHostMayCloseTheRoom(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createOOULobby(t, srv, host.Token)
	if rec := joinOOULobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if rec := do(t, srv, http.MethodDelete, oouLobbyPathFor(lobby.Code), "", guest.Token); rec.Code != http.StatusForbidden {
		t.Fatalf("the guest: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
	if rec := do(t, srv, http.MethodDelete, oouLobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("the host: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}
}

// Another game's code is not a room here, and a 404 rather than a 400 is what says so.
func TestAnOOURouteRefusesAnotherGamesCode(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	host := newGuestSession(t, srv)

	other := createFFLobby(t, srv, host.Token)

	if rec := do(t, srv, http.MethodGet, oouLobbyPathFor(other.Code), "", host.Token); rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// The same three phones, dealt many times over, have to put the liar in every hand rather than in whoever joined last.
func TestAMultiDeviceDealLandsTheImposterInEveryHand(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	table := guests(t, srv, 3)

	const deals = 300
	landed := map[string]int{}

	for range deals {
		game := startOOUGame(t, srv, table[0], table[1:]...)
		for _, role := range []oneofus.Role{oneofus.Imposter, oneofus.Nitwit} {
			for _, userID := range oouPlayersWithRole(t, db, game.gameID, role) {
				landed[userID]++
			}
		}

		if rec := do(t, srv, http.MethodDelete, oouLobbyPathFor(game.lobbyCode), "", table[0].Token); rec.Code >= 300 {
			t.Fatalf("close one of us lobby: status = %d (body: %s)", rec.Code, rec.Body)
		}
	}

	// A fair deal puts about a hundred in each hand; fifty is six standard deviations short.
	for joined, player := range table {
		if landed[player.User.ID] < deals/6 {
			t.Errorf("player %d to join was dealt the liar %d times out of %d", joined+1, landed[player.User.ID], deals)
		}
	}
}

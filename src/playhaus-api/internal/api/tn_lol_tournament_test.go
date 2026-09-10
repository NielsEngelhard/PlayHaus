package api

import (
	"net/http"
	"testing"

	"playhaus-api/internal/lol"

	"gorm.io/gorm"
)

func tournamentPath(code string) string      { return lobbyPathFor(code) + "/tournament" }
func tournamentReadyPath(code string) string { return tournamentPath(code) + "/ready" }

const newTournamentBody = `{"locale":"en","kind":"tournament"}`

// seatTournamentRoom opens a tournament room and walks size-1 guests into it.
func seatTournamentRoom(t *testing.T, srv http.Handler, size int) (sessionResponse, []sessionResponse, lobbyResponse) {
	t.Helper()

	host := newGuestSession(t, srv)
	rec := do(t, srv, http.MethodPost, lobbyPath, newTournamentBody, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create tournament room: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	lobby := decodeBody[lobbyResponse](t, rec)

	guests := make([]sessionResponse, 0, size-1)
	for i := 1; i < size; i++ {
		guest := newGuestSession(t, srv)
		if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join as guest %d: status = %d (body: %s)", i, rec.Code, rec.Body)
		}
		guests = append(guests, guest)
	}

	return host, guests, lobby
}

// startTournament draws the bracket, which is what a tournament room does instead of starting a game.
func startTournament(t *testing.T, srv http.Handler, token, code string) tournamentResponse {
	t.Helper()

	rec := do(t, srv, http.MethodPost, tournamentPath(code), "", token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create tournament: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[tournamentResponse](t, rec)
}

// sessionsByUser lets a test press READY as whoever the draw put in a match.
func sessionsByUser(host sessionResponse, guests []sessionResponse) map[string]string {
	tokens := map[string]string{host.User.ID: host.Token}
	for _, guest := range guests {
		tokens[guest.User.ID] = guest.Token
	}
	return tokens
}

// playOutTournamentStage runs the clock out on every live match of the stage on the table.
func playOutTournamentStage(t *testing.T, db *gorm.DB, tournament tournamentResponse) {
	t.Helper()

	for _, match := range tournament.Matches {
		if match.Stage != tournament.Stage || match.Status != string(lol.MatchLive) {
			continue
		}

		game := gameIDForRoom(t, db, match.LobbyCode)
		finishGame(t, db, game)
	}
}

// gameIDForRoom reads the game dealt on a match room's table.
func gameIDForRoom(t *testing.T, db *gorm.DB, code string) string {
	t.Helper()

	var lobby lol.MultiplayerLeagueOfLettersLobby
	if err := db.First(&lobby, "id = ?", code).Error; err != nil {
		t.Fatalf("read match room %s: %v", code, err)
	}
	if lobby.GameID == nil {
		t.Fatalf("match room %s has no game", code)
	}
	return lobby.GameID.String()
}

func TestATournamentRoomSeatsTwelve(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	_, _, lobby := seatTournamentRoom(t, srv, lol.MaxTournamentPlayers)
	if lobby.Kind != string(lol.LobbyTournament) {
		t.Fatalf("kind = %q, want %q", lobby.Kind, lol.LobbyTournament)
	}
	if lobby.MaxPlayers != lol.MaxTournamentPlayers {
		t.Fatalf("maxPlayers = %d, want %d", lobby.MaxPlayers, lol.MaxTournamentPlayers)
	}

	thirteenth := newGuestSession(t, srv)
	rec := joinLobby(t, srv, thirteenth.Token, lobby.Code)
	if rec.Code != http.StatusConflict {
		t.Fatalf("the thirteenth player: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
}

func TestAnOrdinaryRoomStillSeatsFour(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	session := newGuestSession(t, srv)

	lobby := createLobby(t, srv, session.Token)
	if lobby.Kind != string(lol.LobbyMultiplayer) {
		t.Fatalf("kind = %q, want %q", lobby.Kind, lol.LobbyMultiplayer)
	}
	if lobby.MaxPlayers != lol.MaxLobbyPlayers {
		t.Fatalf("maxPlayers = %d, want %d", lobby.MaxPlayers, lol.MaxLobbyPlayers)
	}
}

func TestAnUnknownLobbyKindIsRefused(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	session := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodPost, lobbyPath, `{"locale":"en","kind":"knockout"}`, session.Token)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnprocessableEntity, rec.Body)
	}
}

func TestATournamentNeedsFourAtTheTable(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	host, _, lobby := seatTournamentRoom(t, srv, lol.MinTournamentPlayers-1)

	rec := do(t, srv, http.MethodPost, tournamentPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "not_enough_players" {
		t.Fatalf("code = %q, want not_enough_players", code)
	}
}

func TestOnlyTheHostDrawsTheBracket(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	_, guests, lobby := seatTournamentRoom(t, srv, 4)

	rec := do(t, srv, http.MethodPost, tournamentPath(lobby.Code), "", guests[0].Token)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
}

func TestAnOrdinaryRoomHasNoTournamentToRead(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	session := newGuestSession(t, srv)

	lobby := createLobby(t, srv, session.Token)

	rec := do(t, srv, http.MethodGet, tournamentPath(lobby.Code), "", session.Token)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
	if code := errorCode(t, rec); code != "tournament_not_found" {
		t.Fatalf("code = %q, want tournament_not_found", code)
	}
}

func TestATournamentRoomIsNotStartedLikeAGame(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	host, _, lobby := seatTournamentRoom(t, srv, 4)

	rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "tournament_room" {
		t.Fatalf("code = %q, want tournament_room", code)
	}
}

// The bracket screen draws itself from this one answer, so everything it needs is in it.
func TestTheBracketAnswersWithEveryMatchAndItsRoom(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	host, guests, lobby := seatTournamentRoom(t, srv, 4)
	tournament := startTournament(t, srv, host.Token, lobby.Code)

	if tournament.Code != lobby.Code {
		t.Fatalf("code = %q, want %q", tournament.Code, lobby.Code)
	}
	if tournament.Stage != 1 {
		t.Fatalf("stage = %d, want 1", tournament.Stage)
	}
	if tournament.StageOver {
		t.Fatal("the first stage is over before it has been played")
	}
	if len(tournament.Players) != 4 {
		t.Fatalf("%d players in the bracket, want 4", len(tournament.Players))
	}
	if tournament.ReadyNeeded != 4 {
		t.Fatalf("readyNeeded = %d, want 4", tournament.ReadyNeeded)
	}

	matches := tournament.Matches
	if len(matches) != 2 {
		t.Fatalf("%d matches drawn, want 2", len(matches))
	}
	for _, match := range matches {
		if match.LobbyCode == "" {
			t.Fatalf("match %s opened no room", match.ID)
		}
		if match.Status != string(lol.MatchLive) {
			t.Fatalf("match %s is %q, want live", match.ID, match.Status)
		}
		if len(match.Players) != 2 {
			t.Fatalf("match %s seats %d players, want 2", match.ID, len(match.Players))
		}
		for _, player := range match.Players {
			if player.Name == "" {
				t.Fatalf("match %s left a player unnamed", match.ID)
			}
		}
	}

	// Every competitor can read the bracket, not only the host.
	rec := do(t, srv, http.MethodGet, tournamentPath(lobby.Code), "", guests[0].Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("guest reading the bracket: status = %d (body: %s)", rec.Code, rec.Body)
	}
}

// A match room is an ordinary room, and points back at the bracket it belongs to.
func TestAMatchRoomPointsBackAtItsBracket(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	host, guests, lobby := seatTournamentRoom(t, srv, 4)
	tournament := startTournament(t, srv, host.Token, lobby.Code)

	match := tournament.Matches[0]
	competitor := sessionsByUser(host, guests)[match.Players[0].UserID]

	rec := do(t, srv, http.MethodGet, lobbyPathFor(match.LobbyCode), "", competitor)
	if rec.Code != http.StatusOK {
		t.Fatalf("read match room: status = %d (body: %s)", rec.Code, rec.Body)
	}

	room := decodeBody[lobbyResponse](t, rec)
	if room.TournamentCode != lobby.Code {
		t.Fatalf("tournamentCode = %q, want %q", room.TournamentCode, lobby.Code)
	}
	if room.Status != string(lol.LobbyStarted) {
		t.Fatalf("a match room opened %q, want started", room.Status)
	}
	if room.GameID == "" {
		t.Fatal("a match room opened without a game")
	}
}

func TestReadyingIsRefusedWhileTheStageIsStillBeingPlayed(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	host, _, lobby := seatTournamentRoom(t, srv, 4)
	startTournament(t, srv, host.Token, lobby.Code)

	rec := do(t, srv, http.MethodPost, tournamentReadyPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "stage_not_over" {
		t.Fatalf("code = %q, want stage_not_over", code)
	}
}

// The whole thing, end to end: four players, every match run out on the clock, a champion.
func TestAFourPlayerTournamentPlaysToAChampion(t *testing.T) {
	srv, db := newTestServerWithDB(t)

	host, guests, lobby := seatTournamentRoom(t, srv, 4)
	tokens := sessionsByUser(host, guests)
	tournament := startTournament(t, srv, host.Token, lobby.Code)

	for stage := 0; tournament.Status != string(lol.TournamentCompleted); stage++ {
		if stage > 8 {
			t.Fatal("the bracket never crowned a champion")
		}

		playOutTournamentStage(t, db, tournament)

		rec := do(t, srv, http.MethodGet, tournamentPath(lobby.Code), "", host.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("read bracket: status = %d (body: %s)", rec.Code, rec.Body)
		}
		tournament = decodeBody[tournamentResponse](t, rec)
		if tournament.Status == string(lol.TournamentCompleted) {
			break
		}

		if !tournament.StageOver {
			t.Fatalf("stage %d is not over after every match was played out", tournament.Stage)
		}

		var readied tournamentResponse
		for _, player := range tournament.Players {
			if player.Eliminated {
				continue
			}

			rec := do(t, srv, http.MethodPost, tournamentReadyPath(lobby.Code), "", tokens[player.UserID])
			if rec.Code != http.StatusOK {
				t.Fatalf("ready as %s: status = %d (body: %s)", player.UserID, rec.Code, rec.Body)
			}
			readied = decodeBody[tournamentResponse](t, rec)
		}

		if readied.Stage != tournament.Stage+1 {
			t.Fatalf("the last READY left the bracket on stage %d, want %d", readied.Stage, tournament.Stage+1)
		}
		tournament = readied
	}

	if tournament.WinnerID == "" {
		t.Fatal("the tournament finished without a champion")
	}

	placed := map[int]bool{}
	for _, player := range tournament.Players {
		if player.Placement == 0 {
			t.Fatalf("%s finished without a placement", player.UserID)
		}
		if placed[player.Placement] {
			t.Fatalf("two players finished %d", player.Placement)
		}
		placed[player.Placement] = true

		if player.UserID == tournament.WinnerID && player.Placement != 1 {
			t.Fatalf("the champion placed %d, want 1", player.Placement)
		}
	}

	for place := 1; place <= 4; place++ {
		if !placed[place] {
			t.Fatalf("nobody finished %d", place)
		}
	}

	// The bracket is over, so there is nothing left to ready for.
	rec := do(t, srv, http.MethodPost, tournamentReadyPath(lobby.Code), "", host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("readying a finished bracket: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if code := errorCode(t, rec); code != "tournament_over" {
		t.Fatalf("code = %q, want tournament_over", code)
	}
}

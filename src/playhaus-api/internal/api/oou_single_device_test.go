package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"playhaus-api/internal/oneofus"
)

const oouSingleDevicePath = "/api/v1/one-of-us/single-device"

type oouCreatedResponse struct {
	GameID string `json:"gameId"`
}

type oouPlayerResponse struct {
	PlayerID   string `json:"playerId"`
	Name       string `json:"name"`
	Role       int    `json:"role"`
	IsVotedOut bool   `json:"isVotedOut"`
}

type oouGameResponse struct {
	ID               string              `json:"id"`
	Locale           string              `json:"locale"`
	ActualQuestion   string              `json:"actualQuestion"`
	ImposterQuestion string              `json:"imposterQuestion"`
	FinishedAt       *string             `json:"finishedAt"`
	CiviliansWon     *bool               `json:"civiliansWon"`
	Players          []oouPlayerResponse `json:"players"`
}

type oouVoteResponse struct {
	PlayerID     string `json:"playerId"`
	PlayerRole   int    `json:"playerRole"`
	GameEnded    bool   `json:"gameEnded"`
	CiviliansWon bool   `json:"civiliansWon"`
}

func oouCreateBody(t *testing.T, locale string, wordOnly bool, names ...string) string {
	t.Helper()

	// Marshalled from the handler's own request type, so a field renamed there fails
	// this test rather than silently going out as an unknown key -- decode runs with
	// DisallowUnknownFields, which turns any drift into a 400.
	body, err := json.Marshal(createOneOfUsOneDeviceGameRequest{
		Locale:      &locale,
		PlayerNames: names,
		WordOnly:    wordOnly,
	})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	return string(body)
}

// startedOouGame opens a game and reads it back, which is also the reconnect path.
func startedOouGame(t *testing.T, h http.Handler, token string, names ...string) oouGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, oouSingleDevicePath, oouCreateBody(t, "en", true, names...), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("create game: status = %d, want 200 (body: %s)", rec.Code, rec.Body)
	}

	created := decodeBody[oouCreatedResponse](t, rec)
	if created.GameID == "" {
		t.Fatal("create game answered without a gameId")
	}

	return fetchOouGame(t, h, token, created.GameID)
}

func fetchOouGame(t *testing.T, h http.Handler, token, gameID string) oouGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, oouSingleDevicePath+"/"+gameID, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get game %s: status = %d, want 200 (body: %s)", gameID, rec.Code, rec.Body)
	}
	return decodeBody[oouGameResponse](t, rec)
}

func voteOutPlayer(t *testing.T, h http.Handler, token, gameID, playerID string) oouVoteResponse {
	t.Helper()

	path := fmt.Sprintf("%s/%s/vote/%s", oouSingleDevicePath, gameID, playerID)
	rec := do(t, h, http.MethodPost, path, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("vote out %s: status = %d, want 200 (body: %s)", playerID, rec.Code, rec.Body)
	}
	return decodeBody[oouVoteResponse](t, rec)
}

// The deal, as the app receives it: a word pair, and a table where everybody can be
// told apart and one in three is lying.
//
// The identity check is the point. The player id was an unexported field, so it reached
// the app as no field at all -- every seat arrived indistinguishable and there was
// nothing to address a vote to.
func TestCreateSingleDeviceOneOfUsGameDealsAnAddressableTable(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	names := []string{"Niels", "Sanne", "Tom", "Eva", "Ravi", "Iris"}
	game := startedOouGame(t, h, session.Token, names...)

	if len(game.Players) != len(names) {
		t.Fatalf("dealt %d players, want %d", len(game.Players), len(names))
	}

	if game.ActualQuestion == "" || game.ImposterQuestion == "" {
		t.Error("dealt a game with a half-empty word pair")
	}
	if game.ActualQuestion == game.ImposterQuestion {
		t.Error("the imposters were given the civilians word")
	}
	if game.FinishedAt != nil {
		t.Error("a game that has just started is already finished")
	}

	seen := map[string]bool{}
	imposters := 0

	for seat, player := range game.Players {
		if player.PlayerID == "" || player.PlayerID == "00000000-0000-0000-0000-000000000000" {
			t.Errorf("seat %d (%s) has no usable playerId: %q", seat, player.Name, player.PlayerID)
		}
		if seen[player.PlayerID] {
			t.Errorf("seat %d reuses playerId %s", seat, player.PlayerID)
		}
		seen[player.PlayerID] = true

		if player.Name != names[seat] {
			t.Errorf("seat %d is %s, want %s -- the table is not in input order", seat, player.Name, names[seat])
		}
		if player.IsVotedOut {
			t.Errorf("%s starts the game already voted out", player.Name)
		}
		if player.Role == int(oneofus.Imposter) {
			imposters++
		}
	}

	if want := oneofus.ImpostersFor(len(names)); imposters != want {
		t.Errorf("dealt %d imposters for %d players, want %d", imposters, len(names), want)
	}
}

// A whole game, played the way the app plays it: vote out imposters until the civilians
// have them all, then read the finished game back.
func TestVotingOutEveryImposterEndsTheGameForTheCivilians(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	game := startedOouGame(t, h, session.Token, "Niels", "Sanne", "Tom", "Eva", "Ravi", "Iris")

	var imposters []oouPlayerResponse
	for _, player := range game.Players {
		if player.Role == int(oneofus.Imposter) {
			imposters = append(imposters, player)
		}
	}
	if len(imposters) != 2 {
		t.Fatalf("six players dealt %d imposters, want 2", len(imposters))
	}

	// The first one out leaves four civilians against one, which is nowhere near
	// parity: the game has to carry on. This is the assertion the old aliasing bug
	// failed -- it counted the player it had just removed and ended the game early.
	first := voteOutPlayer(t, h, session.Token, game.ID, imposters[0].PlayerID)
	if first.PlayerRole != int(oneofus.Imposter) {
		t.Errorf("vote answered role %d, want imposter", first.PlayerRole)
	}
	if first.GameEnded {
		t.Fatal("game ended with an imposter still in it")
	}

	second := voteOutPlayer(t, h, session.Token, game.ID, imposters[1].PlayerID)
	if !second.GameEnded || !second.CiviliansWon {
		t.Errorf("last imposter out: gameEnded=%v civiliansWon=%v, want true/true",
			second.GameEnded, second.CiviliansWon)
	}

	// The finished game is still readable. It used to be deleted here, which 404'd the
	// reconnect endpoint on the one screen a table actually comes back to.
	finished := fetchOouGame(t, h, session.Token, game.ID)
	if finished.FinishedAt == nil {
		t.Error("a game that ended has no finishedAt")
	}
	if finished.CiviliansWon == nil || !*finished.CiviliansWon {
		t.Errorf("finished game reports civiliansWon = %v, want true", finished.CiviliansWon)
	}

	out := 0
	for _, player := range finished.Players {
		if player.IsVotedOut {
			out++
		}
	}
	if out != 2 {
		t.Errorf("finished game has %d players voted out, want 2", out)
	}
}

// A game belongs to the phone that started it.
func TestSingleDeviceOneOfUsGameIsPrivateToItsOwner(t *testing.T) {
	h := newTestServer(t)
	owner := newGuestSession(t, h)
	stranger := newGuestSession(t, h)

	game := startedOouGame(t, h, owner.Token, "Niels", "Sanne", "Tom", "Eva")

	rec := do(t, h, http.MethodGet, oouSingleDevicePath+"/"+game.ID, "", stranger.Token)
	if rec.Code == http.StatusOK {
		t.Errorf("a stranger read the game: status = %d", rec.Code)
	}

	path := fmt.Sprintf("%s/%s/vote/%s", oouSingleDevicePath, game.ID, game.Players[0].PlayerID)
	if rec := do(t, h, http.MethodPost, path, "", stranger.Token); rec.Code == http.StatusOK {
		t.Errorf("a stranger voted somebody out: status = %d", rec.Code)
	}
}

// The table limits the app offers are the ones the API actually enforces.
func TestCreateSingleDeviceOneOfUsGameRejectsAnUnplayableTable(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	tooFew := make([]string, oneofus.MinPlayers-1)
	for i := range tooFew {
		tooFew[i] = fmt.Sprintf("Player %d", i)
	}

	tooMany := make([]string, oneofus.MaxPlayers+1)
	for i := range tooMany {
		tooMany[i] = fmt.Sprintf("Player %d", i)
	}

	for name, names := range map[string][]string{
		"too few":    tooFew,
		"too many":   tooMany,
		"blank name": {"Niels", "  ", "Tom"},
	} {
		body := oouCreateBody(t, "en", false, names...)
		rec := do(t, h, http.MethodPost, oouSingleDevicePath, body, session.Token)

		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: status = %d, want %d (body: %s)",
				name, rec.Code, http.StatusUnprocessableEntity, rec.Body)
		}
	}
}

// The imposters' ending, played out over the wire: they never have to be found, only
// to survive until the civilians cannot outvote them.
//
// Four players is one imposter and three civilians. Two civilians out leaves 1 against
// 1, which is parity -- and the game has to end there rather than run on to a final
// round the civilians could not win anyway.
func TestVotingOutCiviliansToParityEndsTheGameForTheImposters(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	game := startedOouGame(t, h, session.Token, "Niels", "Sanne", "Tom", "Eva")

	var civilians []oouPlayerResponse
	for _, player := range game.Players {
		if player.Role == int(oneofus.Civilian) {
			civilians = append(civilians, player)
		}
	}
	if len(civilians) != 3 {
		t.Fatalf("four players dealt %d civilians, want 3", len(civilians))
	}

	if first := voteOutPlayer(t, h, session.Token, game.ID, civilians[0].PlayerID); first.GameEnded {
		t.Fatal("game ended at 2 civilians against 1 imposter")
	}

	second := voteOutPlayer(t, h, session.Token, game.ID, civilians[1].PlayerID)
	if !second.GameEnded {
		t.Fatal("game did not end at parity")
	}
	if second.CiviliansWon {
		t.Error("civilians won a game that reached parity with an imposter alive")
	}

	finished := fetchOouGame(t, h, session.Token, game.ID)
	if finished.CiviliansWon == nil || *finished.CiviliansWon {
		t.Errorf("finished game reports civiliansWon = %v, want false", finished.CiviliansWon)
	}
}

// The biggest table the app offers is one the API will actually deal.
func TestSingleDeviceOneOfUsGameSeatsAFullTable(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	names := make([]string, oneofus.MaxPlayers)
	for i := range names {
		names[i] = fmt.Sprintf("Player %d", i+1)
	}

	game := startedOouGame(t, h, session.Token, names...)

	if len(game.Players) != oneofus.MaxPlayers {
		t.Fatalf("seated %d of %d players", len(game.Players), oneofus.MaxPlayers)
	}

	imposters, nitwits := 0, 0
	for _, player := range game.Players {
		switch oneofus.Role(player.Role) {
		case oneofus.Imposter:
			imposters++
		case oneofus.Nitwit:
			nitwits++
		}
	}

	// Nine is three threes, which is the whole reason the app stops there. One of the
	// three is the nitwit -- dealt out of the imposters' share rather than on top of it,
	// so the side is still three deep.
	if imposters+nitwits != 3 {
		t.Errorf("a full table dealt %d in the dark (%d imposters, %d nitwits), want 3",
			imposters+nitwits, imposters, nitwits)
	}
	if nitwits != oneofus.NitwitsFor(oneofus.MaxPlayers) {
		t.Errorf("a full table dealt %d nitwits, want %d",
			nitwits, oneofus.NitwitsFor(oneofus.MaxPlayers))
	}
}

// Nobody goes home twice. The vote screen only lists the living, but a double tap or a
// phone left open on a stale board can still send the same name twice.
func TestVotingOutTheSamePlayerTwiceIsRefused(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	game := startedOouGame(t, h, session.Token, "Niels", "Sanne", "Tom", "Eva", "Ravi", "Iris")

	var civilian oouPlayerResponse
	for _, player := range game.Players {
		if player.Role == int(oneofus.Civilian) {
			civilian = player
			break
		}
	}

	voteOutPlayer(t, h, session.Token, game.ID, civilian.PlayerID)

	path := fmt.Sprintf("%s/%s/vote/%s", oouSingleDevicePath, game.ID, civilian.PlayerID)
	if rec := do(t, h, http.MethodPost, path, "", session.Token); rec.Code == http.StatusOK {
		t.Errorf("voted the same player out twice: status = %d", rec.Code)
	}
}

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
	IsMayor    bool   `json:"isMayor"`
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
	PlayerID      string  `json:"playerId"`
	PlayerRole    int     `json:"playerRole"`
	GameEnded     bool    `json:"gameEnded"`
	CiviliansWon  bool    `json:"civiliansWon"`
	MayorPlayerID *string `json:"mayorPlayerId"`
}

// mayorOf is the seat wearing the chain in a game as the app receives it, or an empty
// string for a table with none.
func mayorOf(game oouGameResponse) string {
	for _, player := range game.Players {
		if player.IsMayor {
			return player.PlayerID
		}
	}

	return ""
}

func oouCreateBody(t *testing.T, locale string, wordOnly bool, names ...string) string {
	t.Helper()

	// nil rather than the whole set spelled out, because that is what every client that
	// predates the roles row sends and the default is the thing worth exercising by
	// default. The tests that care pass a set through oouCreateBodyWithRoles.
	return oouCreateBodyWithRoles(t, locale, wordOnly, nil, names...)
}

func oouCreateBodyWithRoles(t *testing.T, locale string, wordOnly bool, enabledRoles []int, names ...string) string {
	t.Helper()

	// Marshalled from the handler's own request type, so a field renamed there fails
	// this test rather than silently going out as an unknown key -- decode runs with
	// DisallowUnknownFields, which turns any drift into a 400.
	body, err := json.Marshal(createOneOfUsOneDeviceGameRequest{
		Locale:       &locale,
		PlayerNames:  names,
		WordOnly:     wordOnly,
		EnabledRoles: enabledRoles,
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

// The deal reaches the app with exactly one mayor on it.
//
// It has to arrive on the game rather than be worked out by the phone: the vote screen
// names the mayor every round, and a table that reloaded mid-game would otherwise be
// told a different name than the one it had been arguing in front of.
func TestSingleDeviceOneOfUsGameIsDealtOneMayor(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	game := startedOouGame(t, h, session.Token, "Niels", "Sanne", "Tom", "Eva", "Ravi")

	mayors := 0
	for _, player := range game.Players {
		if player.IsMayor {
			mayors++
		}
	}

	if mayors != oneofus.MayorsPerTable {
		t.Fatalf("the deal arrived with %d mayors, want %d", mayors, oneofus.MayorsPerTable)
	}
}

// Voting the mayor out hands the chain on, in the same answer that says who left.
//
// Six seats, so one elimination cannot end the game -- the point being tested is the
// succession, and a finished game has no next vote to break a tie for.
func TestVotingOutTheMayorHandsTheChainOn(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	game := startedOouGame(t, h, session.Token, "Niels", "Sanne", "Tom", "Eva", "Ravi", "Iris")

	mayor := mayorOf(game)
	if mayor == "" {
		t.Fatal("the deal arrived without a mayor")
	}

	voted := voteOutPlayer(t, h, session.Token, game.ID, mayor)
	if voted.GameEnded {
		t.Fatal("one elimination ended a six-player game; the succession cannot be tested")
	}

	if voted.MayorPlayerID == nil {
		t.Fatal("voting the mayor out answered with no mayor at all")
	}

	if *voted.MayorPlayerID == mayor {
		t.Error("the chain is still on the player who was just voted out")
	}

	// Read back rather than trusted: the response is the app's shortcut, the stored
	// table is what a reload sees, and the two disagreeing is the bug this guards.
	after := fetchOouGame(t, h, session.Token, game.ID)

	stored := mayorOf(after)
	if stored != *voted.MayorPlayerID {
		t.Errorf("the game says the mayor is %s, the vote said %s", stored, *voted.MayorPlayerID)
	}

	for _, player := range after.Players {
		if player.IsMayor && player.IsVotedOut {
			t.Errorf("%s is wearing the chain and is voted out", player.Name)
		}
	}
}

// Voting out anybody else leaves the office where it was.
func TestVotingOutAnybodyElseLeavesTheMayorAlone(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	game := startedOouGame(t, h, session.Token, "Niels", "Sanne", "Tom", "Eva", "Ravi", "Iris")

	mayor := mayorOf(game)
	if mayor == "" {
		t.Fatal("the deal arrived without a mayor")
	}

	var other string
	for _, player := range game.Players {
		if player.PlayerID != mayor {
			other = player.PlayerID
			break
		}
	}

	voted := voteOutPlayer(t, h, session.Token, game.ID, other)
	if voted.MayorPlayerID == nil || *voted.MayorPlayerID != mayor {
		t.Errorf("voting out a bystander moved the chain to %v, want %s", voted.MayorPlayerID, mayor)
	}

	if stored := mayorOf(fetchOouGame(t, h, session.Token, game.ID)); stored != mayor {
		t.Errorf("the stored mayor is %s, want %s", stored, mayor)
	}
}

// A role the host switched off is a role the API will not deal.
//
// A full table, because nine is the only size that reaches the nitwit at all: at any
// smaller table NitwitsFor already says none, and a test that passed there would prove
// nothing about the setting.
func TestCreateSingleDeviceOneOfUsGameHonoursTheRolesSetting(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	names := make([]string, oneofus.MaxPlayers)
	for i := range names {
		names[i] = fmt.Sprintf("Player %d", i+1)
	}

	cases := map[string]struct {
		enabled  []int
		imposter int
		nitwit   int
	}{
		// The nitwit off is the table that wants the game as it was before the role.
		"imposters only": {[]int{int(oneofus.Imposter)}, 3, 0},
		// The imposter off is the whole side playing blind. MaxNitwits caps the mixed
		// deal at one; with nothing to sit beside there is nothing for it to cap.
		"nitwits only": {[]int{int(oneofus.Nitwit)}, 0, 3},
		// Both on has to be exactly what the game dealt before the field existed --
		// see TestSingleDeviceOneOfUsGameSeatsAFullTable, which asks for it by omission.
		"the whole set": {[]int{int(oneofus.Imposter), int(oneofus.Nitwit)}, 2, 1},
	}

	for name, test := range cases {
		body := oouCreateBodyWithRoles(t, "en", true, test.enabled, names...)

		rec := do(t, h, http.MethodPost, oouSingleDevicePath, body, session.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: create game: status = %d (body: %s)", name, rec.Code, rec.Body)
		}

		created := decodeBody[struct {
			GameID string `json:"gameId"`
		}](t, rec)

		game := fetchOouGame(t, h, session.Token, created.GameID)

		imposters, nitwits := 0, 0
		for _, player := range game.Players {
			switch oneofus.Role(player.Role) {
			case oneofus.Imposter:
				imposters++
			case oneofus.Nitwit:
				nitwits++
			}
		}

		if imposters != test.imposter || nitwits != test.nitwit {
			t.Errorf("%s: dealt %d imposters and %d nitwits, want %d and %d",
				name, imposters, nitwits, test.imposter, test.nitwit)
		}
	}
}

// A roles set the game cannot be dealt from is a 422 on that field, not a strange game.
func TestCreateSingleDeviceOneOfUsGameRejectsAnUndealableRoleSet(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	names := []string{"Niels", "Sanne", "Tom", "Eva"}

	for name, enabled := range map[string][]int{
		// Sent, and empty: a table with nobody to find, which the civilians cannot win
		// and the imposters have already won. Distinct from the field being absent,
		// which is every older client and means the whole set.
		"no roles at all": {},
		// The two that are always in the game, arriving as though they were switches.
		"the civilian":         {int(oneofus.Civilian)},
		"a civilian alongside": {int(oneofus.Imposter), int(oneofus.Civilian)},
		// A client that knows about a role this build does not.
		"an unknown role":     {int(oneofus.Nitwit), 7},
		"the same role twice": {int(oneofus.Imposter), int(oneofus.Imposter)},
	} {
		body := oouCreateBodyWithRoles(t, "en", true, enabled, names...)

		rec := do(t, h, http.MethodPost, oouSingleDevicePath, body, session.Token)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: status = %d, want 422 (body: %s)", name, rec.Code, rec.Body)
			continue
		}

		problems := decodeBody[struct {
			Errors map[string]string `json:"errors"`
		}](t, rec)

		if _, named := problems.Errors["enabledRoles"]; !named {
			t.Errorf("%s: 422 did not name enabledRoles (errors: %v)", name, problems.Errors)
		}
	}
}

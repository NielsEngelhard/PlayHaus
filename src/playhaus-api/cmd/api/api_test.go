package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"playhausapi/internal/auth"
	"playhausapi/internal/database"
	"playhausapi/internal/leagueofletters"
	"playhausapi/internal/migrate"
	"playhausapi/internal/user"
)

// These tests drive the real router over the real store against a real SQLite
// file in a temp directory. Nothing is mocked: the point is to cover the parts
// that only exist when the layers are wired together — routing, auth, the
// transaction in the guess path, and what does and does not appear in a
// response body.
//
// A file rather than :memory: because the read and write pools are separate
// connections, and an in-memory database is private to the connection that
// opened it. t.TempDir is removed when the test ends.

type testAPI struct {
	t       *testing.T
	handler http.Handler
	db      *database.DB

	// token is sent as the bearer credential on every request once set.
	token string
}

func newTestAPI(t *testing.T) *testAPI {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close test database: %v", err)
		}
	})

	if err := migrate.Run(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	return &testAPI{
		t:  t,
		db: db,
		handler: routes(
			auth.New(db, false),
			user.New(db),
			leagueofletters.New(db),
		),
	}
}

func (a *testAPI) do(method, path string, body any) *httptest.ResponseRecorder {
	a.t.Helper()

	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			a.t.Fatalf("marshal request body: %v", err)
		}
		reader = bytes.NewReader(raw)
	}

	return a.doRaw(method, path, reader)
}

func (a *testAPI) doRaw(method, path string, body io.Reader) *httptest.ResponseRecorder {
	a.t.Helper()

	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Content-Type", "application/json")
	if a.token != "" {
		req.Header.Set("Authorization", "Bearer "+a.token)
	}

	rec := httptest.NewRecorder()
	a.handler.ServeHTTP(rec, req)
	return rec
}

// signInAsGuest replaces the current session with a brand new guest account.
func (a *testAPI) signInAsGuest() {
	a.t.Helper()

	a.token = ""
	rec := a.do(http.MethodPost, "/api/v1/guest", struct{}{})
	requireStatus(a.t, rec, http.StatusCreated)

	var out struct {
		Token string `json:"token"`
	}
	decodeInto(a.t, rec, &out)

	if out.Token == "" {
		a.t.Fatal("guest sign-in returned an empty token")
	}
	a.token = out.Token
}

func (a *testAPI) createSoloGame(wordLength int) leagueofletters.GameResponse {
	a.t.Helper()

	rec := a.do(http.MethodPost, "/api/v1/league-of-letters/games", map[string]any{
		"mode":       "solo",
		"language":   "en",
		"wordLength": wordLength,
	})
	requireStatus(a.t, rec, http.StatusCreated)

	var game leagueofletters.GameResponse
	decodeInto(a.t, rec, &game)
	return game
}

func (a *testAPI) guess(gameID, word string) *httptest.ResponseRecorder {
	a.t.Helper()
	return a.do(http.MethodPost, "/api/v1/league-of-letters/games/"+gameID+"/guesses",
		map[string]any{"word": word})
}

// currentWord reads the answer straight out of the database. Only a test may do
// this — it is exactly what the API is built never to hand over.
func (a *testAPI) currentWord(gameID string) string {
	a.t.Helper()

	var word string
	err := a.db.Read.
		Raw("SELECT word FROM lol_rounds WHERE game_id = ? ORDER BY number DESC LIMIT 1", gameID).
		Scan(&word).Error
	if err != nil {
		a.t.Fatalf("read current word: %v", err)
	}
	if word == "" {
		a.t.Fatalf("game %s has no round", gameID)
	}
	return word
}

func requireStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, want, rec.Body.String())
	}
}

func decodeInto(t *testing.T, rec *httptest.ResponseRecorder, dst any) {
	t.Helper()
	if err := json.Unmarshal(rec.Body.Bytes(), dst); err != nil {
		t.Fatalf("decode response: %v; body: %s", err, rec.Body.String())
	}
}

// errorCode pulls the stable code out of an error envelope.
func errorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()

	var out struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	decodeInto(t, rec, &out)
	return out.Error.Code
}

func TestSoloGameCanBeWon(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	game := api.createSoloGame(5)
	if game.Status != "active" {
		t.Fatalf("new solo game status = %q, want active", game.Status)
	}
	if game.Round == nil {
		t.Fatal("new solo game has no round; a solo game is created with one already drawn")
	}
	if game.Round.Word != "" {
		t.Errorf("the answer was handed over with a game still in play: %q", game.Round.Word)
	}
	if game.Round.FirstLetter == "" {
		t.Error("round has no first letter; it is meant to be on the board from the start")
	}

	word := api.currentWord(game.ID)

	// A deliberate miss first, so the win is not the only guess on the board.
	rec := api.guess(game.ID, "zzzzz")
	requireStatus(t, rec, http.StatusCreated)

	var afterMiss leagueofletters.GameResponse
	decodeInto(t, rec, &afterMiss)
	if afterMiss.Status != "active" {
		t.Fatalf("status after one wrong guess = %q, want active", afterMiss.Status)
	}
	if afterMiss.Round.Word != "" {
		t.Errorf("the answer leaked after a wrong guess: %q", afterMiss.Round.Word)
	}

	rec = api.guess(game.ID, strings.ToUpper(word)) // upper case, to prove it is normalized
	requireStatus(t, rec, http.StatusCreated)

	var won leagueofletters.GameResponse
	decodeInto(t, rec, &won)

	if won.Status != "finished" {
		t.Errorf("status after solving = %q, want finished", won.Status)
	}
	if won.Round.Word != word {
		t.Errorf("solved round word = %q, want %q — the answer is released once it is found", won.Round.Word, word)
	}
	if len(won.Round.Guesses) != 2 {
		t.Fatalf("round has %d guesses, want 2", len(won.Round.Guesses))
	}
	if len(won.Players) != 1 || won.Players[0].Score <= 0 {
		t.Errorf("solving scored nothing: %+v", won.Players)
	}
}

func TestSoloGameEndsAfterSixGuesses(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	game := api.createSoloGame(5)

	// Six distinct words of the right shape, none of which is a real answer.
	misses := []string{"aaaaa", "bbbbb", "ccccc", "ddddd", "eeeee", "fffff"}

	var last leagueofletters.GameResponse
	for _, miss := range misses {
		rec := api.guess(game.ID, miss)
		requireStatus(t, rec, http.StatusCreated)
		decodeInto(t, rec, &last)
	}

	if last.Status != "finished" {
		t.Errorf("status after %d guesses = %q, want finished", leagueofletters.MaxGuesses, last.Status)
	}
	if last.Round.Word == "" {
		t.Error("the answer is still hidden after the game ended; nothing can be done with it now")
	}

	// A seventh guess is refused because the game is over, not because the
	// player is out of guesses — a solo game closes itself on the last one.
	rec := api.guess(game.ID, "ggggg")
	requireStatus(t, rec, http.StatusConflict)
	if code := errorCode(t, rec); code != "GAME_NOT_ACTIVE" {
		t.Errorf("error code = %q, want GAME_NOT_ACTIVE", code)
	}
}

func TestGuessMustFitTheGame(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()
	game := api.createSoloGame(5)

	cases := map[string]string{
		"too short":     "abcd",
		"too long":      "abcdef",
		"has a digit":   "abc4e",
		"has a space":   "ab de",
		"not a-z":       "café1",
		"empty":         "",
		"accented":      "café",
		"still letters": "ABCD",
	}

	for name, word := range cases {
		t.Run(name, func(t *testing.T) {
			rec := api.guess(game.ID, word)
			requireStatus(t, rec, http.StatusBadRequest)
			if code := errorCode(t, rec); code != "BAD_GUESS" {
				t.Errorf("error code = %q, want BAD_GUESS", code)
			}
		})
	}
}

func TestRepeatedGuessIsRefused(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()
	game := api.createSoloGame(5)

	requireStatus(t, api.guess(game.ID, "aaaaa"), http.StatusCreated)

	rec := api.guess(game.ID, "aaaaa")
	requireStatus(t, rec, http.StatusConflict)
	if code := errorCode(t, rec); code != "ALREADY_GUESSED" {
		t.Errorf("error code = %q, want ALREADY_GUESSED", code)
	}
}

func TestGameIsInvisibleToOtherPlayers(t *testing.T) {
	api := newTestAPI(t)

	api.signInAsGuest()
	game := api.createSoloGame(5)

	// A different account entirely.
	api.signInAsGuest()

	rec := api.do(http.MethodGet, "/api/v1/league-of-letters/games/"+game.ID, nil)
	requireStatus(t, rec, http.StatusNotFound)
	if code := errorCode(t, rec); code != "GAME_NOT_FOUND" {
		// Not "forbidden": whether the id is real is not something a stranger
		// gets to learn by asking.
		t.Errorf("error code = %q, want GAME_NOT_FOUND", code)
	}

	rec = api.guess(game.ID, "aaaaa")
	requireStatus(t, rec, http.StatusNotFound)
}

func TestAuthenticationIsRequired(t *testing.T) {
	api := newTestAPI(t)

	protected := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/v1/me"},
		{http.MethodPut, "/api/v1/me"},
		{http.MethodGet, "/api/v1/users"},
		{http.MethodPost, "/api/v1/league-of-letters/games"},
		{http.MethodGet, "/api/v1/league-of-letters/games/whatever"},
		{http.MethodPost, "/api/v1/league-of-letters/games/whatever/guesses"},
	}

	for _, route := range protected {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			rec := api.do(route.method, route.path, struct{}{})
			requireStatus(t, rec, http.StatusUnauthorized)
		})
	}
}

func TestSignupValidatesInput(t *testing.T) {
	api := newTestAPI(t)

	cases := []struct {
		name string
		body map[string]any
		code string
	}{
		{"empty name", map[string]any{"name": "  ", "email": "a@b.com", "password": "longenough"}, "NAME_REQUIRED"},
		{"name too long", map[string]any{"name": strings.Repeat("x", 17), "email": "a@b.com", "password": "longenough"}, "NAME_TOO_LONG"},
		{"missing email", map[string]any{"name": "Nel", "password": "longenough"}, "EMAIL_INVALID"},
		{"malformed email", map[string]any{"name": "Nel", "email": "not-an-address", "password": "longenough"}, "EMAIL_INVALID"},
		{"display-name email", map[string]any{"name": "Nel", "email": "Nel <a@b.com>", "password": "longenough"}, "EMAIL_INVALID"},
		{"short password", map[string]any{"name": "Nel", "email": "a@b.com", "password": "short"}, "PASSWORD_TOO_SHORT"},
		{"no password", map[string]any{"name": "Nel", "email": "a@b.com"}, "PASSWORD_TOO_SHORT"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := api.do(http.MethodPost, "/api/v1/user", c.body)
			requireStatus(t, rec, http.StatusBadRequest)
			if code := errorCode(t, rec); code != c.code {
				t.Errorf("error code = %q, want %q", code, c.code)
			}
		})
	}
}

// The signup endpoint used to take isGuestAccount from the body, which let
// anyone create a passwordless account holding somebody else's address — and a
// passwordless account can never be logged into, so the address was then stuck.
func TestSignupCannotCreateAGuestAccount(t *testing.T) {
	api := newTestAPI(t)

	rec := api.do(http.MethodPost, "/api/v1/user", map[string]any{
		"name":           "Nel",
		"email":          "nel@example.com",
		"password":       "longenough",
		"isGuestAccount": true,
	})
	requireStatus(t, rec, http.StatusCreated)

	var created struct {
		IsGuestAccount bool `json:"isGuestAccount"`
	}
	decodeInto(t, rec, &created)
	if created.IsGuestAccount {
		t.Error("signup created a guest account; only POST /guest may do that")
	}

	// And the account really is usable, i.e. it has a password.
	login := api.do(http.MethodPost, "/api/v1/login", map[string]any{
		"email":    "nel@example.com",
		"password": "longenough",
	})
	requireStatus(t, login, http.StatusOK)
}

func TestEmailIsCaseInsensitive(t *testing.T) {
	api := newTestAPI(t)

	signup := api.do(http.MethodPost, "/api/v1/user", map[string]any{
		"name":     "Nel",
		"email":    "  Nel@Example.COM ",
		"password": "longenough",
	})
	requireStatus(t, signup, http.StatusCreated)

	var created struct {
		Email string `json:"email"`
	}
	decodeInto(t, signup, &created)
	if created.Email != "nel@example.com" {
		t.Errorf("stored email = %q, want it normalized to nel@example.com", created.Email)
	}

	// The same address in a different case is the same account, both to log in
	// with and to collide with.
	login := api.do(http.MethodPost, "/api/v1/login", map[string]any{
		"email":    "NEL@example.com",
		"password": "longenough",
	})
	requireStatus(t, login, http.StatusOK)

	duplicate := api.do(http.MethodPost, "/api/v1/user", map[string]any{
		"name":     "Someone Else",
		"email":    "nel@EXAMPLE.com",
		"password": "longenough",
	})
	requireStatus(t, duplicate, http.StatusConflict)
	if code := errorCode(t, duplicate); code != "EMAIL_IN_USE" {
		t.Errorf("error code = %q, want EMAIL_IN_USE", code)
	}
}

func TestWrongCredentialsAreIndistinguishable(t *testing.T) {
	api := newTestAPI(t)

	requireStatus(t, api.do(http.MethodPost, "/api/v1/user", map[string]any{
		"name": "Nel", "email": "nel@example.com", "password": "longenough",
	}), http.StatusCreated)

	unknown := api.do(http.MethodPost, "/api/v1/login", map[string]any{
		"email": "nobody@example.com", "password": "longenough",
	})
	wrongPassword := api.do(http.MethodPost, "/api/v1/login", map[string]any{
		"email": "nel@example.com", "password": "not-the-password",
	})

	requireStatus(t, unknown, http.StatusUnauthorized)
	requireStatus(t, wrongPassword, http.StatusUnauthorized)

	if unknown.Body.String() != wrongPassword.Body.String() {
		t.Errorf("an unknown email and a wrong password give different answers:\n %s\n %s",
			unknown.Body.String(), wrongPassword.Body.String())
	}
}

// The account list was returning every row in the table, email addresses
// included, to anyone holding a session — and POST /guest hands one to anybody
// who asks.
func TestListUsersNeverReturnsEmailAddresses(t *testing.T) {
	api := newTestAPI(t)

	requireStatus(t, api.do(http.MethodPost, "/api/v1/user", map[string]any{
		"name": "Nel", "email": "secret@example.com", "password": "longenough",
	}), http.StatusCreated)

	api.signInAsGuest()

	rec := api.do(http.MethodGet, "/api/v1/users", nil)
	requireStatus(t, rec, http.StatusOK)

	if body := rec.Body.String(); strings.Contains(body, "secret@example.com") {
		t.Errorf("the user list leaked an email address: %s", body)
	}
	if body := rec.Body.String(); strings.Contains(body, "passwordHash") {
		t.Errorf("the user list leaked a password hash: %s", body)
	}
}

func TestListUsersPaginates(t *testing.T) {
	api := newTestAPI(t)

	// Five accounts, each of which is also a session we do not need.
	for range 5 {
		api.signInAsGuest()
	}

	rec := api.do(http.MethodGet, "/api/v1/users?limit=2", nil)
	requireStatus(t, rec, http.StatusOK)

	var page struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	decodeInto(t, rec, &page)

	if len(page.Data) != 2 {
		t.Fatalf("?limit=2 returned %d rows, want 2", len(page.Data))
	}
}

func TestProfileUpdateRejectsUnknownAvatarColour(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	rec := api.do(http.MethodPut, "/api/v1/me", map[string]any{"avatarColorId": "chartreuse"})
	requireStatus(t, rec, http.StatusBadRequest)
	if code := errorCode(t, rec); code != "UNKNOWN_AVATAR_COLOR" {
		t.Errorf("error code = %q, want UNKNOWN_AVATAR_COLOR", code)
	}
}

// A false preference has to survive the round trip: GORM's struct updates skip
// zero values, which is why the handler builds a map instead.
func TestProfileUpdateCanTurnAPreferenceOff(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	rec := api.do(http.MethodPut, "/api/v1/me", map[string]any{"soundEnabled": false})
	requireStatus(t, rec, http.StatusOK)

	var profile struct {
		SoundEnabled     bool `json:"soundEnabled"`
		VibrationEnabled bool `json:"vibrationEnabled"`
	}
	decodeInto(t, rec, &profile)

	if profile.SoundEnabled {
		t.Error("soundEnabled is still true after being turned off")
	}
	if !profile.VibrationEnabled {
		t.Error("vibrationEnabled was changed by an update that did not mention it")
	}
}

func TestLogoutInvalidatesTheSession(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	requireStatus(t, api.do(http.MethodGet, "/api/v1/me", nil), http.StatusOK)
	requireStatus(t, api.do(http.MethodPost, "/api/v1/logout", nil), http.StatusNoContent)

	// The token is now worthless, even though the client still holds it.
	requireStatus(t, api.do(http.MethodGet, "/api/v1/me", nil), http.StatusUnauthorized)
}

func TestOversizedBodyIsRejected(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	// Valid JSON, just far larger than anything this API accepts.
	huge := `{"word":"` + strings.Repeat("a", 2<<20) + `"}`

	rec := api.doRaw(http.MethodPost, "/api/v1/league-of-letters/games/x/guesses", strings.NewReader(huge))
	requireStatus(t, rec, http.StatusRequestEntityTooLarge)
	if code := errorCode(t, rec); code != "BODY_TOO_LARGE" {
		t.Errorf("error code = %q, want BODY_TOO_LARGE", code)
	}
}

func TestMalformedBodyIsRejected(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	rec := api.doRaw(http.MethodPost, "/api/v1/league-of-letters/games", strings.NewReader("{not json"))
	requireStatus(t, rec, http.StatusBadRequest)
	if code := errorCode(t, rec); code != "BAD_JSON" {
		t.Errorf("error code = %q, want BAD_JSON", code)
	}
}

func TestUnknownGameSettingsAreRejected(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	cases := []struct {
		name string
		body map[string]any
		code string
	}{
		{"mode", map[string]any{"mode": "battle-royale", "language": "en", "wordLength": 5}, "UNKNOWN_MODE"},
		{"language", map[string]any{"mode": "solo", "language": "kl", "wordLength": 5}, "UNSUPPORTED_LANGUAGE"},
		{"word length", map[string]any{"mode": "solo", "language": "en", "wordLength": 12}, "UNSUPPORTED_WORD_LENGTH"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := api.do(http.MethodPost, "/api/v1/league-of-letters/games", c.body)
			requireStatus(t, rec, http.StatusBadRequest)
			if code := errorCode(t, rec); code != c.code {
				t.Errorf("error code = %q, want %q", code, c.code)
			}
		})
	}
}

// A multiplayer game is created in the lobby: a code, no round, and therefore
// no word burned on a room nobody joins.
func TestMultiplayerGameStartsInTheLobby(t *testing.T) {
	api := newTestAPI(t)
	api.signInAsGuest()

	rec := api.do(http.MethodPost, "/api/v1/league-of-letters/games", map[string]any{
		"mode": "multiplayer", "language": "en", "wordLength": 5,
	})
	requireStatus(t, rec, http.StatusCreated)

	var game leagueofletters.GameResponse
	decodeInto(t, rec, &game)

	if game.Status != "lobby" {
		t.Errorf("status = %q, want lobby", game.Status)
	}
	if game.Code == nil || len(*game.Code) != leagueofletters.CodeLength {
		t.Errorf("code = %v, want %d characters", game.Code, leagueofletters.CodeLength)
	}
	if game.Round != nil {
		t.Error("a lobby has a round already drawn; the word should wait for the host to start")
	}
}

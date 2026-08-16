package api

import (
	"net/http"
	"strings"
	"testing"
)

const soloPath = "/api/v1/league-of-letters/solo"
const soloRounds = 3

func createSoloGame(t *testing.T, h http.Handler, token, body string) soloGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, soloPath, body, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create solo game: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[soloGameResponse](t, rec)
}

// The whole point of the auth work: the owner comes from the session, so the
// two endpoints need no user id in the body or the path.
func TestCreateSoloGameRequiresAuth(t *testing.T) {
	srv := newTestServer(t)

	rec := do(t, srv, http.MethodPost, soloPath, `{"wordLength":5}`, "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestGetSoloGameRequiresAuth(t *testing.T) {
	srv := newTestServer(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5}`)

	rec := do(t, srv, http.MethodGet, soloPath+"/"+game.ID, "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestCreateSoloGame(t *testing.T) {
	srv := newTestServer(t)
	token := newGuestSession(t, srv).Token

	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	if game.ID == "" {
		t.Error("no game id returned")
	}
	if game.WordLength != 5 {
		t.Errorf("WordLength = %d, want 5", game.WordLength)
	}
	if game.Locale != "en" {
		t.Errorf("Locale = %q, want %q", game.Locale, "en")
	}
	if game.CurrentRound != 1 {
		t.Errorf("CurrentRound = %d, want 1", game.CurrentRound)
	}
	if game.Status != "in_progress" {
		t.Errorf("Status = %q, want %q", game.Status, "in_progress")
	}
	if len(game.Rounds) != 3 {
		t.Fatalf("got %d rounds, want 3", len(game.Rounds))
	}
	for i, r := range game.Rounds {
		if r.RoundNumber != i+1 {
			t.Errorf("round %d: RoundNumber = %d, want %d", i, r.RoundNumber, i+1)
		}
	}
}

// The answers are the thing the player is trying to guess, so they must never
// appear in a response -- not even the round the game is currently on.
func TestCreateSoloGameDoesNotLeakAnswers(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token

	rec := do(t, srv, http.MethodPost, soloPath, `{"wordLength":5,"locale":"en"}`, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	game := decodeBody[soloGameResponse](t, rec)

	var words []string
	if err := db.Raw(`SELECT word FROM solo_lol_rounds WHERE game_id = ?`, game.ID).Scan(&words).Error; err != nil {
		t.Fatalf("read words: %v", err)
	}
	if len(words) != 3 {
		t.Fatalf("stored %d words, want 3", len(words))
	}

	body := rec.Body.String()
	for _, word := range words {
		if strings.Contains(strings.ToLower(body), strings.ToLower(word)) {
			t.Errorf("response leaked the answer %q", word)
		}
	}

	// And again on the read path.
	got := do(t, srv, http.MethodGet, soloPath+"/"+game.ID, "", token)
	for _, word := range words {
		if strings.Contains(strings.ToLower(got.Body.String()), strings.ToLower(word)) {
			t.Errorf("get leaked the answer %q", word)
		}
	}
}

func TestCreateSoloGameValidation(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"valid", `{"wordLength":5}`, http.StatusCreated},
		{"smallest allowed", `{"wordLength":4}`, http.StatusCreated},
		{"largest allowed", `{"wordLength":8}`, http.StatusCreated},
		{"word too short", `{"wordLength":3}`, http.StatusUnprocessableEntity},
		{"word too long", `{"wordLength":9}`, http.StatusUnprocessableEntity},
		{"empty body defaults to zero", `{}`, http.StatusUnprocessableEntity},
		{"malformed json", `{"wordLength":`, http.StatusBadRequest},
		{"unknown field", `{"wordLength":5,"cheat":true}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t) // fresh db per subtest
			token := newGuestSession(t, srv).Token

			rec := do(t, srv, http.MethodPost, soloPath, tt.body, token)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// Locale comes from the body, then Accept-Language, then the default.
func TestCreateSoloGameLocale(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		acceptLanguage string
		want           string
	}{
		{"from body", `{"wordLength":5,"locale":"en"}`, "", "en"},
		{"body beats header", `{"wordLength":5,"locale":"en"}`, "nl-NL", "en"},
		{"from header", `{"wordLength":5}`, "en-GB", "en"},
		{"unsupported falls back", `{"wordLength":5,"locale":"de"}`, "", "nl"},
		{"nothing supplied", `{"wordLength":5}`, "", "nl"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t)
			token := newGuestSession(t, srv).Token

			req := newRequest(t, http.MethodPost, soloPath, tt.body)
			req.Header.Set("Authorization", "Bearer "+token)
			if tt.acceptLanguage != "" {
				req.Header.Set("Accept-Language", tt.acceptLanguage)
			}

			rec := serve(srv, req)
			if rec.Code != http.StatusCreated {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
			}
			if got := decodeBody[soloGameResponse](t, rec).Locale; got != tt.want {
				t.Errorf("Locale = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGetSoloGameReturnsTheGame(t *testing.T) {
	srv := newTestServer(t)
	token := newGuestSession(t, srv).Token
	created := createSoloGame(t, srv, token, `{"wordLength":6,"locale":"nl"}`)

	rec := do(t, srv, http.MethodGet, soloPath+"/"+created.ID, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	got := decodeBody[soloGameResponse](t, rec)
	if got.ID != created.ID {
		t.Errorf("ID = %q, want %q", got.ID, created.ID)
	}
	if got.WordLength != 6 {
		t.Errorf("WordLength = %d, want 6", got.WordLength)
	}
	if len(got.Rounds) != soloRounds {
		t.Errorf("got %d rounds, want %d", len(got.Rounds), soloRounds)
	}
}

// Someone else's game is a 404, not a 403: a distinct status would confirm the
// id exists and let a caller enumerate games.
func TestGetSoloGameHidesOtherPlayersGames(t *testing.T) {
	srv := newTestServer(t)

	ownerToken := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, ownerToken, `{"wordLength":5}`)

	intruderToken := newGuestSession(t, srv).Token
	if intruderToken == ownerToken {
		t.Fatal("two guests share a token")
	}

	rec := do(t, srv, http.MethodGet, soloPath+"/"+game.ID, "", intruderToken)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

func TestGetSoloGameUnknownID(t *testing.T) {
	srv := newTestServer(t)
	token := newGuestSession(t, srv).Token

	tests := map[string]string{
		"well-formed but unknown": "b3f1c2d4-5e6a-4b8c-9d0e-1f2a3b4c5d6e",
		"not a uuid":              "not-a-uuid",
	}

	for name, id := range tests {
		t.Run(name, func(t *testing.T) {
			rec := do(t, srv, http.MethodGet, soloPath+"/"+id, "", token)
			if rec.Code != http.StatusNotFound {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
			}
		})
	}
}

// Each game gets its own words, and a round never repeats a word within a game.
func TestSoloGameWordsArePersistedAndDistinct(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	token := newGuestSession(t, srv).Token
	game := createSoloGame(t, srv, token, `{"wordLength":5,"locale":"en"}`)

	var words []string
	if err := db.Raw(`SELECT word FROM solo_lol_rounds WHERE game_id = ?`, game.ID).Scan(&words).Error; err != nil {
		t.Fatalf("read words: %v", err)
	}
	if len(words) != soloRounds {
		t.Fatalf("stored %d words, want %d", len(words), soloRounds)
	}

	seen := map[string]bool{}
	for _, w := range words {
		if len([]rune(w)) != 5 {
			t.Errorf("word %q is not 5 letters", w)
		}
		if seen[w] {
			t.Errorf("word %q appears in more than one round", w)
		}
		seen[w] = true
	}
}

// The owner column has to hold the caller from the session, which is what the
// old // TODO: How to determine this?! left blank.
func TestSoloGameIsOwnedByTheCaller(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	session := newGuestSession(t, srv)
	game := createSoloGame(t, srv, session.Token, `{"wordLength":5}`)

	var ownerID string
	if err := db.Raw(`SELECT owner_id FROM solo_lol_games WHERE id = ?`, game.ID).Scan(&ownerID).Error; err != nil {
		t.Fatalf("read owner: %v", err)
	}
	if ownerID != session.User.ID {
		t.Errorf("owner_id = %q, want %q", ownerID, session.User.ID)
	}
}

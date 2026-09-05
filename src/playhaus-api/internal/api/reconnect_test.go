package api

import (
	"net/http"
	"testing"

	"playhaus-api/internal/oneofus"
)

const reconnectPath = "/api/v1/reconnect-games"

func TestGetReconnectableGamesRequiresAuth(t *testing.T) {
	srv := newTestServer(t)

	rec := serve(srv, newRequest(t, http.MethodGet, reconnectPath, ""))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestGetReconnectableGamesListsTheCallersSoloGames(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	game := createSoloGame(t, srv, session.Token, `{"wordLength":5,"locale":"nl"}`)

	// Somebody else's game, which must not turn up in this caller's list.
	other := newGuestSession(t, srv)
	createSoloGame(t, srv, other.Token, `{"wordLength":5,"locale":"nl"}`)

	rec := do(t, srv, http.MethodGet, reconnectPath, "", session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	games := decodeBody[[]ReconnectableGame](t, rec)
	if len(games) != 1 {
		t.Fatalf("got %d games, want 1 (body: %s)", len(games), rec.Body)
	}

	if games[0].ID != game.ID {
		t.Errorf("id = %q, want %q", games[0].ID, game.ID)
	}
	if games[0].Type != LeagueOfLettersSolo {
		t.Errorf("type = %q, want %q", games[0].Type, LeagueOfLettersSolo)
	}
	// The app formats this into "gestart 3 uur geleden", so an empty or
	// unparseable timestamp is a line it cannot draw.
	if games[0].CreatedAt == "" {
		t.Error("createdAt is empty")
	}
}

// A finished One of Us table has nothing left to reconnect to, so it must drop off
// this list the moment the last vote ends the game -- even though the row itself
// stays in the database for its own results screen (fetchOouGame in
// oou_single_device_test.go).
func TestGetReconnectableGamesDropsAFinishedOneOfUsGame(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	game := startedOouGame(t, h, session.Token, "Niels", "Sanne", "Tom", "Eva")

	rec := do(t, h, http.MethodGet, reconnectPath, "", session.Token)
	games := decodeBody[[]ReconnectableGame](t, rec)
	if len(games) != 1 {
		t.Fatalf("got %d games before the table finished, want 1 (body: %s)", len(games), rec.Body)
	}

	var civilian oouPlayerResponse
	for _, player := range game.Players {
		if player.Role == int(oneofus.Civilian) {
			civilian = player
			break
		}
	}
	// Four players, one imposter: voting out two civilians reaches parity and ends
	// the game (see TestVotingOutCiviliansToParityEndsTheGameForTheImposters).
	var second oouPlayerResponse
	for _, player := range game.Players {
		if player.Role == int(oneofus.Civilian) && player.PlayerID != civilian.PlayerID {
			second = player
			break
		}
	}
	voteOutPlayer(t, h, session.Token, game.ID, civilian.PlayerID)
	if final := voteOutPlayer(t, h, session.Token, game.ID, second.PlayerID); !final.GameEnded {
		t.Fatal("voting out two of three civilians did not end the game")
	}

	rec = do(t, h, http.MethodGet, reconnectPath, "", session.Token)
	games = decodeBody[[]ReconnectableGame](t, rec)
	if len(games) != 0 {
		t.Errorf("got %d games after the table finished, want 0 (body: %s)", len(games), rec.Body)
	}

	// The row itself is untouched -- only dropped from the reconnect list.
	fetchOouGame(t, h, session.Token, game.ID)
}

// A player with nothing running gets an answer, not an error -- the page's empty
// state is built on this being an ordinary 200.
func TestGetReconnectableGamesWithNothingRunning(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodGet, reconnectPath, "", session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	games := decodeBody[[]ReconnectableGame](t, rec)
	if len(games) != 0 {
		t.Fatalf("got %d games, want none (body: %s)", len(games), rec.Body)
	}
}

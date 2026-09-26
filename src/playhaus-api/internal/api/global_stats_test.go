package api

import (
	"net/http"
	"testing"
)

const gamesPlayedPath = "/api/v1/stats/games-played"

func gamesPlayed(t *testing.T, h http.Handler, token string) gamesPlayedResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, gamesPlayedPath, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("games played: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[gamesPlayedResponse](t, rec)
}

func TestGlobalStatsStartAtZero(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	if got := gamesPlayed(t, srv, session.Token); got != (gamesPlayedResponse{}) {
		t.Errorf("games played = %+v, want all zero", got)
	}
}

func TestGlobalStatsRequiresAuth(t *testing.T) {
	srv := newTestServer(t)

	rec := do(t, srv, http.MethodGet, gamesPlayedPath, "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

func TestCreatingAGameCountsIt(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	createSoloGame(t, srv, session.Token, `{"wordLength":5}`)
	createSoloGame(t, srv, session.Token, `{"wordLength":5}`)
	startDaily(t, srv, session.Token)
	startedOouGame(t, srv, session.Token, "Ann", "Bob", "Cas", "Dirk")

	want := gamesPlayedResponse{LolSoloPlayed: 2, LolWodPlayed: 1, OouSingleDevicePlayed: 1}
	if got := gamesPlayed(t, srv, session.Token); got != want {
		t.Errorf("games played = %+v, want %+v", got, want)
	}
}

// A refused start made nothing, so it counts nothing.
func TestARefusedStartIsNotCounted(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	startDaily(t, srv, session.Token)
	if rec := do(t, srv, http.MethodPost, dailyPath, `{"locale":"en"}`, session.Token); rec.Code != http.StatusConflict {
		t.Fatalf("second start: status = %d, want %d", rec.Code, http.StatusConflict)
	}

	if got := gamesPlayed(t, srv, session.Token).LolWodPlayed; got != 1 {
		t.Errorf("lolWodPlayed = %d, want 1", got)
	}
}

func TestCreatingALobbyDoesNotCountStartingItDoes(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)
	lobby := createLobby(t, srv, host.Token)

	if rec := joinLobby(t, srv, newGuestSession(t, srv).Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if got := gamesPlayed(t, srv, host.Token).LolMpPlayed; got != 0 {
		t.Fatalf("lolMpPlayed before start = %d, want 0", got)
	}

	if rec := do(t, srv, http.MethodPost, lobbyStartPath(lobby.Code), "", host.Token); rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if got := gamesPlayed(t, srv, host.Token).LolMpPlayed; got != 1 {
		t.Errorf("lolMpPlayed after start = %d, want 1", got)
	}
}

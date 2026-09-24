package api

import (
	"fmt"
	"net/http"
	"testing"
)

const pqLobbiesPath = "/api/v1/pubquizr/multi-device/lobby"

// startedPQRoom opens a room of two in the play mode asked for, deals it, and reads the evening back.
func startedPQRoom(t *testing.T, hostScreen bool) (pqLobbyResponse, quizSessionResponse) {
	t.Helper()

	h, _ := newQuizServer(t)
	host := newGuestSession(t, h)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, host.Token, "locale=nl")

	opening := fmt.Sprintf(`{"locale":"nl","hostScreen":%t}`, hostScreen)
	rec := do(t, h, http.MethodPost, pqLobbiesPath, opening, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	lobby := decodeBody[pqLobbyResponse](t, rec)
	room := pqLobbiesPath + "/" + lobby.Code

	body := fmt.Sprintf(`{"quizId":%q}`, quiz.ID)
	rec = do(t, h, http.MethodPatch, room, body, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("update setup: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	lobby = decodeBody[pqLobbyResponse](t, rec)

	rec = do(t, h, http.MethodPost, room+"/players", `{}`, guest.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("join lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	rec = do(t, h, http.MethodPost, room+"/start", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	rec = do(t, h, http.MethodGet, "/api/v1/pubquizr/multi-device/"+lobby.Code, "", guest.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("read session: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	return lobby, decodeBody[quizSessionResponse](t, rec)
}

func TestPQRoomPlaysWithoutAHostScreenByDefault(t *testing.T) {
	lobby, session := startedPQRoom(t, false)

	if lobby.Setup.HostScreen {
		t.Error("lobby setup hostScreen = true, want false")
	}
	if session.HostScreen {
		t.Error("session hostScreen = true, want false")
	}
}

func TestPQRoomFreezesTheHostScreenOntoTheEvening(t *testing.T) {
	lobby, session := startedPQRoom(t, true)

	if !lobby.Setup.HostScreen {
		t.Error("lobby setup hostScreen = false, want true")
	}
	if !session.HostScreen {
		t.Error("session hostScreen = false, want true")
	}
}

func TestPQRoomOpensWithTheScreenTheHostAskedFor(t *testing.T) {
	h := newTestServer(t)
	host := newGuestSession(t, h)

	rec := do(t, h, http.MethodPost, pqLobbiesPath, `{"locale":"nl","hostScreen":true}`, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	if !decodeBody[pqLobbyResponse](t, rec).Setup.HostScreen {
		t.Error("lobby setup hostScreen = false, want true")
	}
}

func TestPQRoomModeCannotChangeOnceOpen(t *testing.T) {
	h := newTestServer(t)
	host := newGuestSession(t, h)

	rec := do(t, h, http.MethodPost, pqLobbiesPath, `{"locale":"nl","hostScreen":true}`, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	room := pqLobbiesPath + "/" + decodeBody[pqLobbyResponse](t, rec).Code

	rec = do(t, h, http.MethodPatch, room, `{"hostScreen":false}`, host.Token)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("update setup: status = %d, want %d (body: %s)", rec.Code, http.StatusBadRequest, rec.Body)
	}

	rec = do(t, h, http.MethodPatch, room, `{"zenMode":true}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("update setup: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	if !decodeBody[pqLobbyResponse](t, rec).Setup.HostScreen {
		t.Error("lobby setup hostScreen = false after an unrelated change, want true")
	}
}

package api

import (
	"fmt"
	"net/http"
	"testing"
)

const pqLobbiesPath = "/api/v1/pubquizr/multi-device/lobby"

// startedPQRoom opens a room of two with the host's setup applied, deals it, and reads the evening back.
func startedPQRoom(t *testing.T, setup string) (pqLobbyResponse, quizSessionResponse) {
	t.Helper()

	h, _ := newQuizServer(t)
	host := newGuestSession(t, h)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, host.Token, "locale=nl")

	rec := do(t, h, http.MethodPost, pqLobbiesPath, `{"locale":"nl"}`, host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	lobby := decodeBody[pqLobbyResponse](t, rec)
	room := pqLobbiesPath + "/" + lobby.Code

	body := fmt.Sprintf(`{"quizId":%q%s}`, quiz.ID, setup)
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
	lobby, session := startedPQRoom(t, "")

	if lobby.Setup.HostScreen {
		t.Error("lobby setup hostScreen = true, want false")
	}
	if session.HostScreen {
		t.Error("session hostScreen = true, want false")
	}
}

func TestPQRoomFreezesTheHostScreenOntoTheEvening(t *testing.T) {
	lobby, session := startedPQRoom(t, `,"hostScreen":true`)

	if !lobby.Setup.HostScreen {
		t.Error("lobby setup hostScreen = false, want true")
	}
	if !session.HostScreen {
		t.Error("session hostScreen = false, want true")
	}
}

package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"playhaus-api/internal/oneofus"
)

// The answer phase, where the whole point is that nothing anybody typed leaves this process until the last one is in.

func submitOOUAnswer(t *testing.T, h http.Handler, token, gameID string, roundNumber int, text string) *httptest.ResponseRecorder {
	t.Helper()

	body := fmt.Sprintf(`{"roundNumber":%d,"text":%q}`, roundNumber, text)
	return do(t, h, http.MethodPost, oouAnswersPath(gameID), body, token)
}

// oouAnswerText is one player's answer, distinctive enough that finding it in the wrong body is proof of a leak.
func oouAnswerText(player sessionResponse) string {
	return "answer-of-" + player.User.ID
}

// livingOOUPlayers is everybody the board still lets act, paired back with their session.
func livingOOUPlayers(t *testing.T, board oouGameResponse, game startedOOUGame) []sessionResponse {
	t.Helper()

	living := make([]sessionResponse, 0, len(board.Players))
	for _, player := range board.Players {
		if player.IsVotedOut {
			continue
		}
		living = append(living, sessionFor(t, game, player.UserID))
	}
	return living
}

// answerOOURound writes for everybody still in, which is what opens the vote.
func answerOOURound(t *testing.T, h http.Handler, game startedOOUGame, board oouGameResponse) []sessionResponse {
	t.Helper()

	living := livingOOUPlayers(t, board, game)
	for _, player := range living {
		rec := submitOOUAnswer(t, h, player.Token, game.gameID, board.CurrentRound, oouAnswerText(player))
		if rec.Code != http.StatusCreated {
			t.Fatalf("submit one of us answer: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
		}
	}
	return living
}

// slotOf finds the slot an answer landed in, which is how a test knows which pick is its own.
func slotOf(t *testing.T, round *oouRoundResponse, text string) int {
	t.Helper()

	if round == nil {
		t.Fatal("no round to look in")
	}
	for _, answer := range round.Answers {
		if answer.Text == text {
			return answer.Slot
		}
	}

	t.Fatalf("%q is not among this round's answers", text)
	return oneofus.UnassignedSlot
}

// The vote opens on the last answer and not a moment before, because until then somebody is still writing.
func TestOOUVotingOpensOnTheLastAnswer(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	for index, player := range game.players {
		rec := submitOOUAnswer(t, srv, player.Token, game.gameID, 1, oouAnswerText(player))
		if rec.Code != http.StatusCreated {
			t.Fatalf("player %d: status = %d, want %d (body: %s)", index, rec.Code, http.StatusCreated, rec.Body)
		}

		progress := decodeBody[oouAnswerProgressResponse](t, rec)
		if progress.AnswersIn != index+1 {
			t.Errorf("player %d: answersIn = %d, want %d", index, progress.AnswersIn, index+1)
		}
		if progress.AnswersNeeded != len(game.players) {
			t.Errorf("player %d: answersNeeded = %d, want %d", index, progress.AnswersNeeded, len(game.players))
		}

		last := index == len(game.players)-1
		if progress.VotingOpened != last {
			t.Errorf("player %d: votingOpened = %v, want %v", index, progress.VotingOpened, last)
		}
	}

	board := getOOUGame(t, srv, game.host.Token, game.gameID)
	if board.Phase != string(oneofus.PhaseVote) {
		t.Errorf("phase = %q, want %q", board.Phase, oneofus.PhaseVote)
	}
}

// Nobody's text has left this process while the table is still writing, and the raw body is what proves it.
func TestNoOOUAnswerIsVisibleWhileTheTableIsWriting(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	writers := game.players[:2]
	for _, player := range writers {
		if rec := submitOOUAnswer(t, srv, player.Token, game.gameID, 1, oouAnswerText(player)); rec.Code != http.StatusCreated {
			t.Fatalf("submit: status = %d (body: %s)", rec.Code, rec.Body)
		}
	}

	for _, reader := range game.players {
		rec := do(t, srv, http.MethodGet, oouGamePath(game.gameID), "", reader.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("get board: status = %d (body: %s)", rec.Code, rec.Body)
		}
		raw := rec.Body.String()

		for _, writer := range writers {
			if writer.User.ID == reader.User.ID {
				continue
			}
			if strings.Contains(raw, oouAnswerText(writer)) {
				t.Fatalf("%s can read %s's answer while the table is still writing", reader.User.ID, writer.User.ID)
			}
		}

		board := decodeBody[oouGameResponse](t, rec)
		if board.Round == nil {
			t.Fatal("no round on the board")
		}
		if len(board.Round.Answers) != 0 {
			t.Errorf("answers = %+v, want none until the vote opens", board.Round.Answers)
		}
	}
}

// Your own answer comes back to you, so a reconnect redraws the box you had already filled in.
func TestAnOOUPlayerIsToldTheirOwnAnswer(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	writer := game.players[0]
	if rec := submitOOUAnswer(t, srv, writer.Token, game.gameID, 1, oouAnswerText(writer)); rec.Code != http.StatusCreated {
		t.Fatalf("submit: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if got := getOOUGame(t, srv, writer.Token, game.gameID).MyAnswer; got != oouAnswerText(writer) {
		t.Errorf("myAnswer = %q, want %q", got, oouAnswerText(writer))
	}
	if got := getOOUGame(t, srv, game.players[1].Token, game.gameID).MyAnswer; got != "" {
		t.Errorf("somebody who has not written yet has myAnswer = %q", got)
	}
}

func TestAnOOUPlayerMayNotAnswerTwice(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	writer := game.players[0]
	if rec := submitOOUAnswer(t, srv, writer.Token, game.gameID, 1, "first"); rec.Code != http.StatusCreated {
		t.Fatalf("first submit: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := submitOOUAnswer(t, srv, writer.Token, game.gameID, 1, "second")
	if rec.Code != http.StatusConflict {
		t.Fatalf("second submit: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "already_answered" {
		t.Errorf("code = %q, want already_answered", code)
	}
}

// A round that has not been opened yet is not one you may write into.
func TestAnOOUAnswerMustBeForARoundThatExists(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	rec := submitOOUAnswer(t, srv, game.host.Token, game.gameID, 2, "early")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
	if code := errorCode(t, rec); code != "round_not_found" {
		t.Errorf("code = %q, want round_not_found", code)
	}
}

// Somebody who is not at the table reads the same as no such game.
func TestAnOOUBoardIsOnlyForItsOwnTable(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)
	stranger := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodGet, oouGamePath(game.gameID), "", stranger.Token)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
	if code := errorCode(t, rec); code != "game_not_found" {
		t.Errorf("code = %q, want game_not_found", code)
	}
}

// The heart of it: a civilian and an imposter are handed the same board with one line different, so neither can work out which they are by comparing notes.
func TestALivingOOUCivilianAndImposterSeeTheSameBoard(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	imposters := oouPlayersWithRole(t, db, game.gameID, oneofus.Imposter)
	if len(imposters) != 1 {
		t.Fatalf("imposters = %v, want exactly one at a three-handed table", imposters)
	}
	civilians := oouPlayersWithRole(t, db, game.gameID, oneofus.Civilian)
	if len(civilians) == 0 {
		t.Fatal("no civilians were dealt")
	}

	imposter := sessionFor(t, game, imposters[0])
	civilian := sessionFor(t, game, civilians[0])

	imposterBoard := oouBoardAsMap(t, srv, imposter.Token, game.gameID)
	civilianBoard := oouBoardAsMap(t, srv, civilian.Token, game.gameID)

	if imposterBoard["myPrompt"] == civilianBoard["myPrompt"] {
		t.Error("the imposter was handed the real prompt")
	}
	if imposterBoard["myPrompt"] == "" || civilianBoard["myPrompt"] == "" {
		t.Error("somebody who knows a word was handed nothing")
	}

	delete(imposterBoard, "myPrompt")
	delete(civilianBoard, "myPrompt")

	if !reflect.DeepEqual(imposterBoard, civilianBoard) {
		t.Errorf("the two boards differ by more than the prompt:\nimposter: %v\ncivilian: %v", imposterBoard, civilianBoard)
	}
}

// No living player's role is on the wire, whoever is reading.
func TestALivingOOUPlayerHasNoRoleOnTheWire(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	for _, reader := range game.players {
		board := getOOUGame(t, srv, reader.Token, game.gameID)
		for _, player := range board.Players {
			if player.Role != nil {
				t.Errorf("%s is told %s is a %v", reader.User.ID, player.UserID, *player.Role)
			}
		}
	}
}

// The nitwit is the one player who is told something about themselves, because they have to know why they were handed nothing.
func TestOnlyTheOOUNitwitIsToldSo(t *testing.T) {
	srv, db := newTestServerWithDB(t)

	table := guests(t, srv, oneofus.MaxPlayers)
	game := startOOUGame(t, srv, table[0], table[1:]...)

	nitwits := oouPlayersWithRole(t, db, game.gameID, oneofus.Nitwit)
	if len(nitwits) != 1 {
		t.Fatalf("nitwits = %v, want exactly one at a full table", nitwits)
	}

	for _, player := range game.players {
		board := getOOUGame(t, srv, player.Token, game.gameID)
		isNitwit := player.User.ID == nitwits[0]

		if board.AmNitwit != isNitwit {
			t.Errorf("%s: amNitwit = %v, want %v", player.User.ID, board.AmNitwit, isNitwit)
		}
		if isNitwit && board.MyPrompt != "" {
			t.Errorf("the nitwit was handed %q", board.MyPrompt)
		}
		if !isNitwit && board.MyPrompt == "" {
			t.Errorf("%s knows a word but was handed nothing", player.User.ID)
		}
	}
}

// oouBoardAsMap is the board as it actually goes out, so a test can compare two readers' bytes rather than two structs.
func oouBoardAsMap(t *testing.T, h http.Handler, token, gameID string) map[string]any {
	t.Helper()

	rec := do(t, h, http.MethodGet, oouGamePath(gameID), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get board: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode board: %v", err)
	}
	return body
}

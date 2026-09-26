package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"playhaus-api/internal/joincode"
	"playhaus-api/internal/wittywars"
)

// The Witty Wars room, through the whole middleware chain. The helpers at the top are shared with the other ww_ files.

const wwLobbyPath = "/api/v1/witty-wars/lobby"

func wwLobbyPathFor(code string) string { return wwLobbyPath + "/" + code }
func wwGamePath(gameID string) string   { return "/api/v1/witty-wars/game/" + gameID }
func wwAnswersPath(gameID string) string {
	return wwGamePath(gameID) + "/answers"
}
func wwVotesPath(gameID string) string   { return wwGamePath(gameID) + "/votes" }
func wwAdvancePath(gameID string) string { return wwGamePath(gameID) + "/advance" }

func createWWLobby(t *testing.T, h http.Handler, token, body string) wwLobbyResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, wwLobbyPath, body, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create witty wars lobby: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[wwLobbyResponse](t, rec)
}

func joinWWLobby(t *testing.T, h http.Handler, token, code string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, wwLobbyPathFor(code)+"/players", "", token)
}

type startedWWGame struct {
	lobbyCode string
	gameID    string
	host      sessionResponse
	players   []sessionResponse
}

func startWWGame(t *testing.T, h http.Handler, host sessionResponse, others ...sessionResponse) startedWWGame {
	t.Helper()

	lobby := createWWLobby(t, h, host.Token, `{}`)
	for _, other := range others {
		if rec := joinWWLobby(t, h, other.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join witty wars lobby: status = %d (body: %s)", rec.Code, rec.Body)
		}
	}

	rec := do(t, h, http.MethodPost, wwLobbyPathFor(lobby.Code)+"/start", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start witty wars lobby: status = %d (body: %s)", rec.Code, rec.Body)
	}
	started := decodeBody[wwLobbyResponse](t, rec)

	return startedWWGame{
		lobbyCode: lobby.Code,
		gameID:    started.GameID,
		host:      host,
		players:   append([]sessionResponse{host}, others...),
	}
}

func threeHandedWWGame(t *testing.T, h http.Handler) startedWWGame {
	t.Helper()
	return startWWGame(t, h, newGuestSession(t, h), newGuestSession(t, h), newGuestSession(t, h))
}

func getWWGame(t *testing.T, h http.Handler, token, gameID string) wwGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, wwGamePath(gameID), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get witty wars game: status = %d (body: %s)", rec.Code, rec.Body)
	}
	return decodeBody[wwGameResponse](t, rec)
}

// wwAnswer is what a given player writes for a given round; distinctive, so redaction tests can look for it.
func wwAnswer(userID string, roundNumber int) string {
	return fmt.Sprintf("quip-%s-r%d", userID, roundNumber)
}

// wwBatch is one player's full set of answers, as a request body.
func wwBatch(t *testing.T, game wwGameResponse, userID string) string {
	t.Helper()

	var answers []map[string]any
	for _, round := range game.Rounds {
		if round.Mine {
			answers = append(answers, map[string]any{"roundNumber": round.Number, "answer": wwAnswer(userID, round.Number)})
		}
	}
	body, err := json.Marshal(map[string]any{"answers": answers})
	if err != nil {
		t.Fatalf("encode batch: %v", err)
	}
	return string(body)
}

func submitWWBatch(t *testing.T, h http.Handler, player sessionResponse, gameID string) wwAnswerResponse {
	t.Helper()

	board := getWWGame(t, h, player.Token, gameID)
	rec := do(t, h, http.MethodPost, wwAnswersPath(gameID), wwBatch(t, board, player.User.ID), player.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("submit batch: status = %d (body: %s)", rec.Code, rec.Body)
	}
	return decodeBody[wwAnswerResponse](t, rec)
}

func writeEveryWWAnswer(t *testing.T, h http.Handler, game startedWWGame) wwAnswerResponse {
	t.Helper()

	var last wwAnswerResponse
	for _, player := range game.players {
		last = submitWWBatch(t, h, player, game.gameID)
	}
	if !last.VotingOpened {
		t.Fatalf("the last batch did not open the voting: %+v", last)
	}
	return last
}

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------

func TestWWLobbyCodesAreWittyWarsCodes(t *testing.T) {
	srv := newTestServer(t)
	lobby := createWWLobby(t, srv, newGuestSession(t, srv).Token, `{}`)

	if game, ok := joincode.GameFor(lobby.Code); !ok || game != joincode.WittyWars {
		t.Errorf("code %q is not a witty wars code", lobby.Code)
	}
	if lobby.Settings.GameMode != string(wittywars.GameModeFamily) || lobby.Settings.AnswersPerPlayer != wittywars.DefaultAnswersPerPlayer {
		t.Errorf("a new room opened on %+v", lobby.Settings)
	}
}

func TestWWFakeFillerRoutesRefuseAWittyWarsCode(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)
	lobby := createWWLobby(t, srv, host.Token, `{}`)

	if rec := do(t, srv, http.MethodGet, ffLobbyPathFor(lobby.Code), "", host.Token); rec.Code != http.StatusNotFound {
		t.Errorf("a witty wars code on a fake filler route: status = %d, want 404", rec.Code)
	}
}

func TestWWOnlyTheHostMovesTheSettings(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)
	lobby := createWWLobby(t, srv, host.Token, `{}`)
	joinWWLobby(t, srv, guest.Token, lobby.Code)

	if rec := do(t, srv, http.MethodPatch, wwLobbyPathFor(lobby.Code), `{"gameMode":"rude"}`, guest.Token); rec.Code != http.StatusForbidden {
		t.Errorf("a guest's patch: status = %d, want 403", rec.Code)
	}

	rec := do(t, srv, http.MethodPatch, wwLobbyPathFor(lobby.Code), `{"gameMode":"caliente","answersPerPlayer":4}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("the host's patch: status = %d (body: %s)", rec.Code, rec.Body)
	}
	saved := decodeBody[wwLobbyResponse](t, rec)
	if saved.Settings.GameMode != "caliente" || saved.Settings.AnswersPerPlayer != 4 {
		t.Errorf("saved settings = %+v", saved.Settings)
	}

	if rec := do(t, srv, http.MethodPatch, wwLobbyPathFor(lobby.Code), `{"answersPerPlayer":5}`, host.Token); rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("five answers each: status = %d, want 422", rec.Code)
	}
	if rec := do(t, srv, http.MethodPatch, wwLobbyPathFor(lobby.Code), `{"gameMode":"facts"}`, host.Token); rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("another game's mode: status = %d, want 422", rec.Code)
	}
}

func TestWWStartingNeedsThreePlayers(t *testing.T) {
	srv := newTestServer(t)
	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)
	lobby := createWWLobby(t, srv, host.Token, `{}`)
	joinWWLobby(t, srv, guest.Token, lobby.Code)

	rec := do(t, srv, http.MethodPost, wwLobbyPathFor(lobby.Code)+"/start", "", host.Token)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "not_enough_players") {
		t.Errorf("start with two: status = %d (body: %s)", rec.Code, rec.Body)
	}
}

func TestWWAGameInProgressIsReconnectable(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)

	rec := do(t, srv, http.MethodGet, "/api/v1/reconnect-games", "", game.players[1].Token)
	if !strings.Contains(rec.Body.String(), string(WittyWarsMultiplayer)) || !strings.Contains(rec.Body.String(), game.lobbyCode) {
		t.Errorf("reconnect list does not offer the game: %s", rec.Body)
	}
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

func TestWWEveryPromptIsDealtToTwoPlayersAndTheNameIsFilledIn(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)
	board := getWWGame(t, srv, game.host.Token, game.gameID)

	names := map[string]string{}
	for _, player := range board.Players {
		names[player.UserID] = player.Name
	}

	for _, round := range board.Rounds {
		if strings.Contains(round.Line, wittywars.Placeholder) {
			t.Errorf("round %d still carries the placeholder: %q", round.Number, round.Line)
		}
		if round.SubjectID != "" && !strings.Contains(round.Line, names[round.SubjectID]) {
			t.Errorf("round %d names %q but reads %q", round.Number, names[round.SubjectID], round.Line)
		}
	}
	if board.AnswersNeeded != 2*board.TotalRounds {
		t.Errorf("answersNeeded = %d for %d rounds", board.AnswersNeeded, board.TotalRounds)
	}
}

func TestWWOneBatchPerPlayerOpensTheVoting(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)

	for i, player := range game.players {
		result := submitWWBatch(t, srv, player, game.gameID)
		if last := i == len(game.players)-1; result.VotingOpened != last {
			t.Errorf("after batch %d votingOpened = %v", i+1, result.VotingOpened)
		}
	}
	if board := getWWGame(t, srv, game.host.Token, game.gameID); board.Phase != string(wittywars.PhaseVoting) {
		t.Errorf("phase = %s, want voting", board.Phase)
	}
}

func TestWWAnIncompleteOrOverlongBatchSavesNothing(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)
	player := game.players[0]
	board := getWWGame(t, srv, player.Token, game.gameID)

	var mine []wwRoundResponse
	for _, round := range board.Rounds {
		if round.Mine {
			mine = append(mine, round)
		}
	}

	partial := fmt.Sprintf(`{"answers":[{"roundNumber":%d,"answer":"only one"}]}`, mine[0].Number)
	rec := do(t, srv, http.MethodPost, wwAnswersPath(game.gameID), partial, player.Token)
	if rec.Code != http.StatusUnprocessableEntity || !strings.Contains(rec.Body.String(), "incomplete_answers") {
		t.Errorf("a partial batch: status = %d (body: %s)", rec.Code, rec.Body)
	}

	var answers []string
	for i, round := range mine {
		text := "fine"
		if i == len(mine)-1 {
			text = strings.Repeat("x", wittywars.MaxAnswerLength+1)
		}
		answers = append(answers, fmt.Sprintf(`{"roundNumber":%d,"answer":%q}`, round.Number, text))
	}
	rec = do(t, srv, http.MethodPost, wwAnswersPath(game.gameID), `{"answers":[`+strings.Join(answers, ",")+`]}`, player.Token)
	if rec.Code != http.StatusUnprocessableEntity || !strings.Contains(rec.Body.String(), "answer_too_long") {
		t.Errorf("an overlong answer: status = %d (body: %s)", rec.Code, rec.Body)
	}

	after := getWWGame(t, srv, player.Token, game.gameID)
	if after.AnswersIn != 0 {
		t.Errorf("answersIn = %d after two refused batches, want 0", after.AnswersIn)
	}
}

func TestWWASecondBatchIsRefused(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)
	player := game.players[0]

	submitWWBatch(t, srv, player, game.gameID)

	board := getWWGame(t, srv, player.Token, game.gameID)
	rec := do(t, srv, http.MethodPost, wwAnswersPath(game.gameID), wwBatch(t, board, player.User.ID), player.Token)
	if rec.Code != http.StatusConflict {
		t.Errorf("a second batch: status = %d, want 409 (body: %s)", rec.Code, rec.Body)
	}
}

func TestWWNobodyReadsAnotherPlayersAnswerBeforeVoting(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)
	author := game.players[0]
	submitWWBatch(t, srv, author, game.gameID)

	rec := do(t, srv, http.MethodGet, wwGamePath(game.gameID), "", game.players[1].Token)
	if strings.Contains(rec.Body.String(), "quip-"+author.User.ID) {
		t.Fatalf("another player's board carried the author's answer: %s", rec.Body)
	}
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

func TestWWAVotePaysTheWriterAndAClosingSweepPaysTheBonus(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)
	writeEveryWWAnswer(t, srv, game)

	board := getWWGame(t, srv, game.host.Token, game.gameID)
	round := board.Rounds[0]
	if len(round.Options) != 2 {
		t.Fatalf("the first round shows %d answers, want 2", len(round.Options))
	}
	for _, option := range round.Options {
		if option.AuthorID != "" || len(option.Voters) != 0 {
			t.Fatalf("an open round told its authors: %+v", option)
		}
	}

	var voter, writer sessionResponse
	for _, player := range game.players {
		mine := getWWGame(t, srv, player.Token, game.gameID).Rounds[0]
		if mine.CanVote {
			voter = player
		} else {
			writer = player
		}
	}

	if rec := do(t, srv, http.MethodPost, wwVotesPath(game.gameID), `{"roundNumber":1,"slot":0}`, writer.Token); rec.Code != http.StatusForbidden {
		t.Errorf("a writer voting: status = %d, want 403", rec.Code)
	}

	rec := do(t, srv, http.MethodPost, wwVotesPath(game.gameID), `{"roundNumber":1,"slot":0}`, voter.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("vote: status = %d (body: %s)", rec.Code, rec.Body)
	}
	vote := decodeBody[wwVoteResponse](t, rec)
	if !vote.RoundOver || vote.Reveal == nil {
		t.Fatalf("the only voter's vote did not reveal the round: %+v", vote)
	}

	var winner wwOptionResponse
	for _, option := range vote.Reveal.Options {
		if option.Slot == 0 {
			winner = option
		}
	}
	if !winner.Sweep || winner.Points != wittywars.VotePoints+wittywars.SweepBonus {
		t.Errorf("the picked answer: %+v, want a sweep worth %d", winner, wittywars.VotePoints+wittywars.SweepBonus)
	}
	for _, player := range vote.Players {
		if player.UserID == winner.AuthorID && player.Score != wittywars.VotePoints+wittywars.SweepBonus {
			t.Errorf("the winner's score = %d", player.Score)
		}
	}

	if rec := do(t, srv, http.MethodPost, wwAdvancePath(game.gameID), `{"roundNumber":1}`, game.players[1].Token); rec.Code != http.StatusForbidden {
		t.Errorf("a guest advancing: status = %d, want 403", rec.Code)
	}
	rec = do(t, srv, http.MethodPost, wwAdvancePath(game.gameID), `{"roundNumber":1}`, game.host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("advance: status = %d (body: %s)", rec.Code, rec.Body)
	}
	if moved := decodeBody[wwAdvanceResponse](t, rec); moved.CurrentRound != 2 || moved.NextRound == nil {
		t.Errorf("advance left the table on %+v", moved)
	}
}

func TestWWPlayingEveryRoundEndsTheGame(t *testing.T) {
	srv := newTestServer(t)
	game := threeHandedWWGame(t, srv)
	writeEveryWWAnswer(t, srv, game)

	total := getWWGame(t, srv, game.host.Token, game.gameID).TotalRounds
	for number := 1; number <= total; number++ {
		for _, player := range game.players {
			board := getWWGame(t, srv, player.Token, game.gameID)
			if board.Rounds[number-1].CanVote {
				body := fmt.Sprintf(`{"roundNumber":%d,"slot":0}`, number)
				if rec := do(t, srv, http.MethodPost, wwVotesPath(game.gameID), body, player.Token); rec.Code != http.StatusCreated {
					t.Fatalf("vote on round %d: status = %d (body: %s)", number, rec.Code, rec.Body)
				}
			}
		}
		body := fmt.Sprintf(`{"roundNumber":%d}`, number)
		if rec := do(t, srv, http.MethodPost, wwAdvancePath(game.gameID), body, game.host.Token); rec.Code != http.StatusCreated {
			t.Fatalf("advance round %d: status = %d (body: %s)", number, rec.Code, rec.Body)
		}
	}

	final := getWWGame(t, srv, game.host.Token, game.gameID)
	if final.Status != string(wittywars.GameCompleted) {
		t.Fatalf("status = %s, want completed", final.Status)
	}
	sum := 0
	for _, player := range final.Players {
		sum += player.Score
	}
	// One voter a round, so every round is a sweep: a point for the vote and one for the sweep.
	if want := total * (wittywars.VotePoints + wittywars.SweepBonus); sum != want {
		t.Errorf("scores sum to %d, want %d", sum, want)
	}

	if rec := do(t, srv, http.MethodPost, wwLobbyPathFor(game.lobbyCode)+"/rematch", "", game.host.Token); rec.Code != http.StatusCreated {
		t.Errorf("rematch: status = %d (body: %s)", rec.Code, rec.Body)
	}
}

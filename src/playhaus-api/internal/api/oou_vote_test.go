package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"playhaus-api/internal/oneofus"
)

// Voting, the reveal, and the beat between two rounds.

func castOOUVote(t *testing.T, h http.Handler, token, gameID string, roundNumber, slot int) *httptest.ResponseRecorder {
	t.Helper()

	body := fmt.Sprintf(`{"roundNumber":%d,"slot":%d}`, roundNumber, slot)
	return do(t, h, http.MethodPost, oouVotesPath(gameID), body, token)
}

// voteOOUPlayerOut sends the whole table at one player, with that player's own vote parked on somebody else so plurality has a clear leader.
func voteOOUPlayerOut(t *testing.T, h http.Handler, game startedOOUGame, board oouGameResponse, target sessionResponse) oouVoteResponse {
	t.Helper()

	living := livingOOUPlayers(t, board, game)
	targetSlot := slotOf(t, board.Round, oouAnswerText(target))

	var parked sessionResponse
	for _, player := range living {
		if player.User.ID != target.User.ID {
			parked = player
			break
		}
	}
	parkedSlot := slotOf(t, board.Round, oouAnswerText(parked))

	var last oouVoteResponse
	for _, voter := range living {
		slot := targetSlot
		if voter.User.ID == target.User.ID {
			slot = parkedSlot
		}

		rec := castOOUVote(t, h, voter.Token, game.gameID, board.CurrentRound, slot)
		if rec.Code != http.StatusCreated {
			t.Fatalf("cast one of us vote: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
		}
		last = decodeBody[oouVoteResponse](t, rec)
	}

	return last
}

// An open vote is answers with nothing attached to them, which is the whole of what "anonymously" means here.
func TestAnOpenOOUVoteNamesNobody(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	for _, reader := range game.players {
		board := getOOUGame(t, srv, reader.Token, game.gameID)
		if board.Round == nil {
			t.Fatal("no round on the board")
		}
		if len(board.Round.Answers) != len(game.players) {
			t.Fatalf("answers = %d, want %d", len(board.Round.Answers), len(game.players))
		}
		if board.Round.Revealed {
			t.Error("the round says it is revealed while the vote is still open")
		}

		for _, answer := range board.Round.Answers {
			if answer.Text == "" {
				t.Error("an answer came through with no text to vote on")
			}
			if answer.AuthorID != "" {
				t.Errorf("slot %d already names %s", answer.Slot, answer.AuthorID)
			}
			if answer.Voters != nil {
				t.Errorf("slot %d already lists its voters", answer.Slot)
			}
		}
	}
}

// Your own answer is on the board, and your own slot is the one thing you may not pick.
func TestAnOOUPlayerMayNotVoteForTheirOwnAnswer(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	voter := game.players[0]
	board := getOOUGame(t, srv, voter.Token, game.gameID)
	own := slotOf(t, board.Round, oouAnswerText(voter))

	rec := castOOUVote(t, srv, voter.Token, game.gameID, board.CurrentRound, own)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
	if code := errorCode(t, rec); code != "cannot_vote_self" {
		t.Errorf("code = %q, want cannot_vote_self", code)
	}
}

func TestAnOOUPlayerMayNotVoteTwice(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := sixHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	voter := game.players[0]
	board := getOOUGame(t, srv, voter.Token, game.gameID)
	slot := slotOf(t, board.Round, oouAnswerText(game.players[1]))

	if rec := castOOUVote(t, srv, voter.Token, game.gameID, board.CurrentRound, slot); rec.Code != http.StatusCreated {
		t.Fatalf("first vote: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := castOOUVote(t, srv, voter.Token, game.gameID, board.CurrentRound, slot)
	if rec.Code != http.StatusConflict {
		t.Fatalf("second vote: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "already_voted" {
		t.Errorf("code = %q, want already_voted", code)
	}
}

// A vote nobody wrote is not a vote.
func TestAnOOUVoteMustNameASlotThatExists(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	rec := castOOUVote(t, srv, game.host.Token, game.gameID, 1, len(game.players)+5)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
	if code := errorCode(t, rec); code != "answer_not_found" {
		t.Errorf("code = %q, want answer_not_found", code)
	}
}

// The counter is what the table watches, and it counts the living rather than the seats.
func TestTheOOUVoteCounterAdvancesUntilTheLastVote(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := sixHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	board := getOOUGame(t, srv, game.host.Token, game.gameID)
	target := game.players[1]
	targetSlot := slotOf(t, board.Round, oouAnswerText(target))
	parkedSlot := slotOf(t, board.Round, oouAnswerText(game.players[0]))

	for index, voter := range game.players {
		slot := targetSlot
		if voter.User.ID == target.User.ID {
			slot = parkedSlot
		}

		rec := castOOUVote(t, srv, voter.Token, game.gameID, 1, slot)
		if rec.Code != http.StatusCreated {
			t.Fatalf("voter %d: status = %d (body: %s)", index, rec.Code, rec.Body)
		}

		vote := decodeBody[oouVoteResponse](t, rec)
		if vote.VotesIn != index+1 {
			t.Errorf("voter %d: votesIn = %d, want %d", index, vote.VotesIn, index+1)
		}
		if vote.VotesNeeded != len(game.players) {
			t.Errorf("voter %d: votesNeeded = %d, want %d", index, vote.VotesNeeded, len(game.players))
		}

		last := index == len(game.players)-1
		if vote.RoundClosed != last {
			t.Errorf("voter %d: roundClosed = %v, want %v", index, vote.RoundClosed, last)
		}
	}
}

// The reveal is the moment the answers get their names, and the eliminated player their role.
func TestClosingAnOOURoundNamesEveryAuthor(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := sixHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	civilians := oouPlayersWithRole(t, db, game.gameID, oneofus.Civilian)
	if len(civilians) == 0 {
		t.Fatal("no civilians were dealt")
	}
	target := sessionFor(t, game, civilians[0])

	closing := voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), target)

	if !closing.RoundClosed {
		t.Fatalf("the last vote did not close the round: %+v", closing)
	}
	if closing.Reveal == nil {
		t.Fatal("a closed round came back with no reveal")
	}
	if closing.Reveal.VotedOut.UserID != target.User.ID {
		t.Errorf("votedOut = %q, want %q", closing.Reveal.VotedOut.UserID, target.User.ID)
	}
	if closing.Reveal.VotedOut.Votes != len(game.players)-1 {
		t.Errorf("votes = %d, want %d", closing.Reveal.VotedOut.Votes, len(game.players)-1)
	}
	if closing.Reveal.VotedOut.TieBrokenByMayor {
		t.Error("a clear plurality was reported as a tie the mayor broke")
	}
	if closing.Reveal.VotedOut.Role != oneofus.Civilian {
		t.Errorf("role = %v, want civilian", closing.Reveal.VotedOut.Role)
	}

	for _, answer := range closing.Reveal.Answers {
		if answer.AuthorID == "" {
			t.Errorf("slot %d was revealed with no author", answer.Slot)
		}
	}

	// Everybody who is still in keeps their secret; the one who went does not.
	for _, player := range closing.Players {
		switch {
		case player.UserID == target.User.ID:
			if player.Role == nil {
				t.Error("the eliminated player's role was not revealed")
			}
			if !player.IsVotedOut {
				t.Error("the eliminated player is not marked out")
			}
		case player.Role != nil:
			t.Errorf("%s is still in but their role was revealed", player.UserID)
		}
	}
}

// The reveal reaches the table as one body, so a reader's own board says the same as the closing voter's.
func TestAnOOURevealIsTheSameOnEveryBoard(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := sixHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	civilians := oouPlayersWithRole(t, db, game.gameID, oneofus.Civilian)
	target := sessionFor(t, game, civilians[0])
	voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), target)

	for _, reader := range game.players {
		board := getOOUGame(t, srv, reader.Token, game.gameID)
		if board.Phase != string(oneofus.PhaseReveal) {
			t.Fatalf("%s: phase = %q, want %q", reader.User.ID, board.Phase, oneofus.PhaseReveal)
		}
		if board.Round == nil || !board.Round.Revealed {
			t.Fatalf("%s: round = %+v, want a revealed one", reader.User.ID, board.Round)
		}
		if board.Round.VotedOut == nil || board.Round.VotedOut.UserID != target.User.ID {
			t.Errorf("%s: votedOut = %+v, want %q", reader.User.ID, board.Round.VotedOut, target.User.ID)
		}

		for _, answer := range board.Round.Answers {
			if answer.AuthorID == "" {
				t.Errorf("%s: slot %d has no author on a revealed round", reader.User.ID, answer.Slot)
			}
		}
	}
}

// Only one tap moves the table on, however many people tap.
func TestOnlyOneTapOpensTheNextOOURound(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := sixHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	civilians := oouPlayersWithRole(t, db, game.gameID, oneofus.Civilian)
	target := sessionFor(t, game, civilians[0])

	closing := voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), target)
	if closing.GameOver {
		t.Fatal("losing one civilian out of six ended the game")
	}

	// The host may well be the one who just went, and the eliminated have no buttons left.
	living := livingOOUPlayers(t, getOOUGame(t, srv, game.host.Token, game.gameID), game)

	first := continueOOURound(t, srv, living[0].Token, game.gameID, 1)
	if !first.Opened {
		t.Fatalf("the first tap did not open the round: %+v", first)
	}
	if first.RoundNumber != 2 {
		t.Errorf("roundNumber = %d, want 2", first.RoundNumber)
	}
	if first.AnswersNeeded != len(game.players)-1 {
		t.Errorf("answersNeeded = %d, want %d -- the eliminated must not be waited for", first.AnswersNeeded, len(game.players)-1)
	}

	second := continueOOURound(t, srv, living[1].Token, game.gameID, 1)
	if second.Opened {
		t.Error("a second tap opened a second round")
	}
	if second.RoundNumber != 2 {
		t.Errorf("the second tap reports roundNumber = %d, want 2", second.RoundNumber)
	}

	board := getOOUGame(t, srv, game.host.Token, game.gameID)
	if board.Phase != string(oneofus.PhaseAnswer) || board.CurrentRound != 2 {
		t.Errorf("board = %q round %d, want the answer phase of round 2", board.Phase, board.CurrentRound)
	}
	if board.Round == nil || len(board.Round.Answers) != 0 {
		t.Errorf("round = %+v, want a fresh one with nothing written", board.Round)
	}
}

// Being voted out ends your game without ending your connection: you keep the board and lose the buttons.
func TestAnEliminatedOOUPlayerMayNoLongerAct(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := sixHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	civilians := oouPlayersWithRole(t, db, game.gameID, oneofus.Civilian)
	target := sessionFor(t, game, civilians[0])

	voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), target)

	// The host may be the one who just went, and the eliminated have no buttons left.
	living := livingOOUPlayers(t, getOOUGame(t, srv, game.host.Token, game.gameID), game)
	if out := continueOOURound(t, srv, living[0].Token, game.gameID, 1); !out.Opened {
		t.Fatalf("the next round did not open: %+v", out)
	}

	board := getOOUGame(t, srv, target.Token, game.gameID)
	if !board.AmOut {
		t.Error("the eliminated player is not told they are out")
	}

	rec := submitOOUAnswer(t, srv, target.Token, game.gameID, 2, "still here")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("answering: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
	if code := errorCode(t, rec); code != "voted_out" {
		t.Errorf("code = %q, want voted_out", code)
	}
}

// A three-handed table cannot survive a round: two players left is the end whichever side went.
func TestAThreeHandedOOUGameEndsOnItsFirstElimination(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)
	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))

	imposters := oouPlayersWithRole(t, db, game.gameID, oneofus.Imposter)
	if len(imposters) != 1 {
		t.Fatalf("imposters = %v, want exactly one", imposters)
	}
	target := sessionFor(t, game, imposters[0])

	closing := voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), target)

	if !closing.GameOver {
		t.Fatalf("catching the only imposter did not end the game: %+v", closing)
	}
	if closing.Status != string(oneofus.GameCompleted) {
		t.Errorf("status = %q, want %q", closing.Status, oneofus.GameCompleted)
	}
	if closing.CiviliansWon == nil || !*closing.CiviliansWon {
		t.Errorf("civiliansWon = %v, want true", Deref(closing.CiviliansWon, false))
	}

	// A finished game has no secrets left.
	for _, player := range closing.Players {
		if player.Role == nil {
			t.Errorf("%s's role is still hidden after the game ended", player.UserID)
		}
	}
}

// The room can be played again once, and only once it is actually over.
func TestAnOOURematchWaitsForTheGameToFinish(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	rec := do(t, srv, http.MethodPost, oouLobbyPathFor(game.lobbyCode)+"/rematch", "", game.host.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("mid-game: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "game_not_over" {
		t.Errorf("code = %q, want game_not_over", code)
	}

	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))
	imposters := oouPlayersWithRole(t, db, game.gameID, oneofus.Imposter)
	voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), sessionFor(t, game, imposters[0]))

	rec = do(t, srv, http.MethodPost, oouLobbyPathFor(game.lobbyCode)+"/rematch", "", game.host.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("after the game: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	next := decodeBody[oouLobbyResponse](t, rec)
	if next.Code == game.lobbyCode {
		t.Error("the rematch reused the old room's code")
	}

	// The old room points at the new one, which is how everybody else gets there.
	old := do(t, srv, http.MethodGet, oouLobbyPathFor(game.lobbyCode), "", game.host.Token)
	if got := decodeBody[oouLobbyResponse](t, old).RematchCode; got != next.Code {
		t.Errorf("rematchCode = %q, want %q", got, next.Code)
	}
}

func continueOOURound(t *testing.T, h http.Handler, token, gameID string, roundNumber int) oouRoundOpenedResponse {
	t.Helper()

	body := fmt.Sprintf(`{"roundNumber":%d}`, roundNumber)
	rec := do(t, h, http.MethodPost, oouContinuePath(gameID), body, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("continue one of us game: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[oouRoundOpenedResponse](t, rec)
}

// The pair the game was played on is the whole secret while it runs, and public the moment it is over.
func TestTheOOUWordsAreOnlyToldOnceTheGameIsOver(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	game := threeHandedOOUGame(t, srv)

	running := oouBoardAsMap(t, srv, game.host.Token, game.gameID)
	if _, told := running["word"]; told {
		t.Errorf("the civilians' word is on the wire while the game is still being played: %v", running["word"])
	}
	if _, told := running["imposterWord"]; told {
		t.Errorf("the imposters' word is on the wire while the game is still being played: %v", running["imposterWord"])
	}

	answerOOURound(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID))
	imposters := oouPlayersWithRole(t, db, game.gameID, oneofus.Imposter)
	voteOOUPlayerOut(t, srv, game, getOOUGame(t, srv, game.host.Token, game.gameID), sessionFor(t, game, imposters[0]))

	over := getOOUGame(t, srv, game.host.Token, game.gameID)
	if over.Word == "" || over.ImposterWord == "" {
		t.Fatalf("a finished game did not tell the words: word = %q, imposterWord = %q", over.Word, over.ImposterWord)
	}
	if over.Word == over.ImposterWord {
		t.Errorf("both sides were dealt %q", over.Word)
	}
}

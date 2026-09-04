package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"playhaus-api/internal/fakefiller"
)

// The voting phase: the table walks the rounds one at a time, everybody who did not write
// for a round votes on it, and the last vote in reveals it and moves the game on by itself.
//
// Nearly all of these are played three-handed, which is the smallest table the game allows
// and the one where a round has exactly one voter -- so the first vote is also the last,
// and a test can drive a whole game without tracking who still owes one. The tests that
// are about several voters arriving at the same round say so and seat five.

func castFFVote(t *testing.T, h http.Handler, token, gameID string, roundNumber, slot int) *httptest.ResponseRecorder {
	t.Helper()

	body, err := json.Marshal(map[string]any{"roundNumber": roundNumber, "slot": slot})
	if err != nil {
		t.Fatalf("encode vote: %v", err)
	}
	return do(t, h, http.MethodPost, ffVotesPath(gameID), string(body), token)
}

// ffVoterFor is the player who may vote on a round, and fails unless there is exactly one
// -- a test using this on a bigger table would be silently picking one of several.
func ffVoterFor(t *testing.T, h http.Handler, game startedFFGame, roundNumber int) (sessionResponse, ffRoundResponse) {
	t.Helper()

	var found []sessionResponse
	var round ffRoundResponse

	for _, player := range game.players {
		body := getFFGame(t, h, player.Token, game.gameID)
		for _, r := range body.Rounds {
			if r.Number == roundNumber && r.CanVote {
				found = append(found, player)
				round = r
			}
		}
	}

	if len(found) != 1 {
		t.Fatalf("round %d has %d eligible voters, want exactly 1", roundNumber, len(found))
	}
	return found[0], round
}

// ffTruthSlot is where the real answer is sitting, worked out the only way a test can: the
// options the test did not write are the one it did not write.
//
// The point of doing it this way round is that it is also an assertion. The voting body
// says nothing about which option is true -- if it did, this would not be necessary.
func ffTruthSlot(t *testing.T, round ffRoundResponse) int {
	t.Helper()

	for _, option := range round.Options {
		if len(option.Fills) > 0 && !strings.HasPrefix(option.Fills[0], "fake-") {
			return option.Slot
		}
	}

	t.Fatalf("round %d has no option that the test did not write: %+v", round.Number, round.Options)
	return -1
}

// ffFakeSlot is a slot holding a fake, and not the one whose author is skip.
func ffFakeSlot(t *testing.T, round ffRoundResponse, truthSlot int) int {
	t.Helper()

	for _, option := range round.Options {
		if option.Slot != truthSlot {
			return option.Slot
		}
	}

	t.Fatalf("round %d has no fake to vote for", round.Number)
	return -1
}

// ---------------------------------------------------------------------------
// A whole game
// ---------------------------------------------------------------------------

// The full arc, three-handed: open a room, deal it, write six answers, vote three rounds,
// and end up completed with a scoreboard.
//
// Every voter picks the truth, which is the case with a known answer: each player is the
// sole voter on exactly one round, so everybody ends on one point and nobody has fooled
// anybody.
func TestFFAThreeHandedGamePlaysThroughToGameOver(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	total := getFFGame(t, srv, game.host.Token, game.gameID).TotalRounds
	if total != len(game.players) {
		t.Fatalf("the game has %d rounds for %d players", total, len(game.players))
	}

	for number := 1; number <= total; number++ {
		voter, round := ffVoterFor(t, srv, game, number)

		if len(round.Options) != fakefiller.OptionsPerRound(fakefiller.GameModeFacts) {
			t.Fatalf("round %d shows %d options, want %d",
				number, len(round.Options), fakefiller.OptionsPerRound(fakefiller.GameModeFacts))
		}

		rec := castFFVote(t, srv, voter.Token, game.gameID, number, ffTruthSlot(t, round))
		if rec.Code != http.StatusCreated {
			t.Fatalf("vote on round %d: status = %d, want %d (body: %s)",
				number, rec.Code, http.StatusCreated, rec.Body)
		}

		body := decodeBody[ffVoteResponse](t, rec)
		if !body.RoundOver {
			t.Fatalf("round %d: the only vote did not close it (%+v)", number, body)
		}
		if want := number == total; body.GameOver != want {
			t.Errorf("round %d: gameOver = %v, want %v", number, body.GameOver, want)
		}
		if body.Reveal == nil {
			t.Fatalf("round %d closed without a reveal", number)
		}
		if body.Reveal.RoundNumber != number {
			t.Errorf("the reveal is for round %d, want %d", body.Reveal.RoundNumber, number)
		}
		if len(body.Reveal.Authors) != 2 {
			t.Errorf("the reveal names %d authors, want 2", len(body.Reveal.Authors))
		}
		if body.GameOver != (body.NextRound == nil) {
			t.Errorf("round %d: gameOver = %v but nextRound = %v", number, body.GameOver, body.NextRound)
		}
	}

	final := getFFGame(t, srv, game.host.Token, game.gameID)
	if final.Status != string(fakefiller.GameCompleted) {
		t.Fatalf("status = %q, want %q", final.Status, fakefiller.GameCompleted)
	}

	for _, player := range final.Players {
		if player.Score != fakefiller.TruthPoints {
			t.Errorf("%s scored %d, want %d -- everybody found the truth exactly once",
				player.UserID, player.Score, fakefiller.TruthPoints)
		}
	}

	// Every round is revealed once the game is over, and the truth is finally named.
	for _, round := range final.Rounds {
		if !round.Revealed {
			t.Errorf("round %d is not revealed on a finished game", round.Number)
		}
		truths := 0
		for _, option := range round.Options {
			if option.AuthorID == "" {
				t.Errorf("round %d option in slot %d was revealed without its author", round.Number, option.Slot)
			}
			if option.IsTruth {
				truths++
			}
		}
		if truths != 1 {
			t.Errorf("round %d reveals %d truths, want 1", round.Number, truths)
		}
	}
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

// Picking the truth pays the voter and nobody else -- there is no author to pay.
func TestFFFindingTheTruthScoresTheVoterAlone(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	voter, round := ffVoterFor(t, srv, game, 1)

	rec := castFFVote(t, srv, voter.Token, game.gameID, 1, ffTruthSlot(t, round))
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	body := decodeBody[ffVoteResponse](t, rec)
	for _, player := range body.Players {
		want := 0
		if player.UserID == voter.User.ID {
			want = fakefiller.TruthPoints
		}
		if player.Score != want {
			t.Errorf("%s scored %d, want %d", player.UserID, player.Score, want)
		}
	}
}

// Picking a fake pays its author and not the voter, who got it wrong.
func TestFFBeingPickedScoresTheAuthorAlone(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	voter, round := ffVoterFor(t, srv, game, 1)
	fake := ffFakeSlot(t, round, ffTruthSlot(t, round))

	rec := castFFVote(t, srv, voter.Token, game.gameID, 1, fake)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	body := decodeBody[ffVoteResponse](t, rec)
	if body.Reveal == nil {
		t.Fatal("the round closed without a reveal")
	}

	var author string
	for _, option := range body.Reveal.Options {
		if option.Slot == fake {
			author = option.AuthorID
		}
	}
	if author == "" || author == fakefiller.TruthAuthorID {
		t.Fatalf("slot %d was revealed as %q, want a player", fake, author)
	}

	for _, player := range body.Players {
		want := 0
		if player.UserID == author {
			want = fakefiller.FooledPoints
		}
		if player.Score != want {
			t.Errorf("%s scored %d, want %d", player.UserID, player.Score, want)
		}
	}
	if author == voter.User.ID {
		t.Error("the voter was paid for their own fake, which they cannot have voted for")
	}
}

// creative has no truth, so a round is two options and the only points are for being
// picked.
func TestFFCreativeRoundsHaveNoTruthToFind(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	host := newGuestSession(t, srv)
	lobby := createFFLobby(t, srv, host.Token)

	rec := do(t, srv, http.MethodPatch, ffLobbyPathFor(lobby.Code), `{"gameMode":"creative"}`, host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("set creative: status = %d (body: %s)", rec.Code, rec.Body)
	}

	others := []sessionResponse{newGuestSession(t, srv), newGuestSession(t, srv)}
	for _, other := range others {
		if rec := joinFFLobby(t, srv, other.Token, lobby.Code); rec.Code != http.StatusOK {
			t.Fatalf("join: %d", rec.Code)
		}
	}
	rec = do(t, srv, http.MethodPost, ffLobbyPathFor(lobby.Code)+"/start", "", host.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("start: status = %d (body: %s)", rec.Code, rec.Body)
	}

	game := startedFFGame{
		lobbyCode: lobby.Code,
		gameID:    decodeBody[ffLobbyResponse](t, rec).GameID,
		host:      host,
		players:   append([]sessionResponse{host}, others...),
	}
	writeEveryFFAnswer(t, srv, game)

	voter, round := ffVoterFor(t, srv, game, 1)
	if len(round.Options) != fakefiller.OptionsPerRound(fakefiller.GameModeCreative) {
		t.Fatalf("a creative round shows %d options, want %d",
			len(round.Options), fakefiller.OptionsPerRound(fakefiller.GameModeCreative))
	}
	for _, option := range round.Options {
		if len(option.Fills) > 0 && !strings.HasPrefix(option.Fills[0], "fake-") {
			t.Errorf("a creative round carries an option nobody wrote: %v", option.Fills)
		}
	}

	rec = castFFVote(t, srv, voter.Token, game.gameID, 1, round.Options[0].Slot)
	if rec.Code != http.StatusCreated {
		t.Fatalf("vote: status = %d (body: %s)", rec.Code, rec.Body)
	}

	body := decodeBody[ffVoteResponse](t, rec)
	total := 0
	for _, player := range body.Players {
		total += player.Score
		if player.UserID == voter.User.ID && player.Score != 0 {
			t.Errorf("the voter scored %d in creative mode, want 0 -- there is no truth to find", player.Score)
		}
	}
	if total != fakefiller.FooledPoints {
		t.Errorf("the round paid out %d in total, want %d", total, fakefiller.FooledPoints)
	}
	for _, option := range body.Reveal.Options {
		if option.IsTruth {
			t.Error("a creative round revealed a truth")
		}
	}
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

// You cannot vote on a prompt you wrote for: you know which one is yours, and in facts
// mode that halves the field.
func TestFFAnAuthorCannotVoteOnTheirOwnPrompt(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	voter, _ := ffVoterFor(t, srv, game, 1)

	for _, player := range game.players {
		if player.User.ID == voter.User.ID {
			continue
		}

		rec := castFFVote(t, srv, player.Token, game.gameID, 1, 0)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("author voting: status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
		}
		if code := errorCode(t, rec); code != "cannot_vote_own_prompt" {
			t.Errorf("code = %q, want cannot_vote_own_prompt", code)
		}
	}
}

func TestFFVotingIsRefusedDuringTheWritingPhase(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	rec := castFFVote(t, srv, game.players[0].Token, game.gameID, 1, 0)
	if rec.Code != http.StatusConflict && rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want a refusal (body: %s)", rec.Code, rec.Body)
	}
}

// The table walks the rounds in order, so a client that is behind is told so rather than
// having its vote scored into a round that is finished.
func TestFFVotingOnARoundTheTableHasLeftIsRefused(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	voter, round := ffVoterFor(t, srv, game, 1)
	if rec := castFFVote(t, srv, voter.Token, game.gameID, 1, round.Options[0].Slot); rec.Code != http.StatusCreated {
		t.Fatalf("close round 1: status = %d (body: %s)", rec.Code, rec.Body)
	}

	// Round 1 is gone. Its voter has already voted, so try somebody who had not.
	for _, player := range game.players {
		if player.User.ID == voter.User.ID {
			continue
		}
		rec := castFFVote(t, srv, player.Token, game.gameID, 1, 0)
		if rec.Code != http.StatusForbidden && rec.Code != http.StatusConflict {
			t.Fatalf("late vote: status = %d, want a refusal (body: %s)", rec.Code, rec.Body)
		}
	}

	// And a round the table has not reached yet is refused just the same.
	ahead, _ := ffVoterFor(t, srv, game, 3)
	rec := castFFVote(t, srv, ahead.Token, game.gameID, 3, 0)
	if rec.Code != http.StatusConflict {
		t.Fatalf("early vote: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "wrong_round" {
		t.Errorf("code = %q, want wrong_round", code)
	}
}

// Seated five-handed so the round stays open after the first vote: with three players the
// first vote closes it, and a second would be refused for being late rather than for being
// a second.
func TestFFAPlayerCannotVoteTwiceOnOneRound(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	sessions := make([]sessionResponse, 5)
	for i := range sessions {
		sessions[i] = newGuestSession(t, srv)
	}
	game := startFFGame(t, srv, sessions[0], sessions[1:]...)
	writeEveryFFAnswer(t, srv, game)

	// One of the three people who may vote on round 1.
	var voter sessionResponse
	var round ffRoundResponse
	for _, player := range game.players {
		body := getFFGame(t, srv, player.Token, game.gameID)
		for _, r := range body.Rounds {
			if r.Number == 1 && r.CanVote {
				voter, round = player, r
			}
		}
		if voter.Token != "" {
			break
		}
	}
	if voter.Token == "" {
		t.Fatal("round 1 has no eligible voter")
	}

	if rec := castFFVote(t, srv, voter.Token, game.gameID, 1, round.Options[0].Slot); rec.Code != http.StatusCreated {
		t.Fatalf("first vote: status = %d (body: %s)", rec.Code, rec.Body)
	}

	rec := castFFVote(t, srv, voter.Token, game.gameID, 1, round.Options[1].Slot)
	if rec.Code != http.StatusConflict {
		t.Fatalf("second vote: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "already_voted" {
		t.Errorf("code = %q, want already_voted", code)
	}
}

// A vote for a slot nobody is sitting in is a 404 rather than a 500.
func TestFFVotingForASlotThatDoesNotExistIsRefused(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	voter, _ := ffVoterFor(t, srv, game, 1)

	rec := castFFVote(t, srv, voter.Token, game.gameID, 1, 99)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
	if code := errorCode(t, rec); code != "option_not_found" {
		t.Errorf("code = %q, want option_not_found", code)
	}
}

// ---------------------------------------------------------------------------
// Redaction while voting
// ---------------------------------------------------------------------------

// While a round is open, an option is a slot and its fills and nothing else. An author id
// would name the writer, and one of the three author ids is the string "__truth__" -- so
// either would end the round before it was voted on.
func TestFFAnOpenRoundNamesNoAuthors(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	for _, player := range game.players {
		rec := do(t, srv, http.MethodGet, ffGamePath(game.gameID), "", player.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("get game: status = %d (body: %s)", rec.Code, rec.Body)
		}
		if strings.Contains(rec.Body.String(), fakefiller.TruthAuthorID) {
			t.Fatalf("%s was sent the truth sentinel mid-voting", player.User.ID)
		}

		body := decodeBody[ffGameResponse](t, rec)
		for _, round := range body.Rounds {
			if round.Revealed {
				t.Errorf("round %d is revealed before anybody has voted", round.Number)
			}
			for _, option := range round.Options {
				if option.AuthorID != "" || option.IsTruth || len(option.Voters) != 0 {
					t.Errorf("round %d slot %d was sent with author %q, isTruth %v, voters %v",
						round.Number, option.Slot, option.AuthorID, option.IsTruth, option.Voters)
				}
			}
		}
	}
}

// Only the round being voted on carries options. A round the table has not reached would
// otherwise be one a player could read ahead in and decide on early.
func TestFFOnlyTheCurrentRoundShowsItsOptions(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	body := getFFGame(t, srv, game.host.Token, game.gameID)
	for _, round := range body.Rounds {
		hasOptions := len(round.Options) > 0
		if want := round.Number == body.CurrentRound; hasOptions != want {
			t.Errorf("round %d (current is %d) carries options = %v, want %v",
				round.Number, body.CurrentRound, hasOptions, want)
		}
	}
}

// The order the options are shown in is written down when voting opens and never touched
// again, so two reads of the same unchanged round agree -- which is what makes a reconnect
// mid-decision safe.
func TestFFTheOptionOrderIsStableAcrossReads(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	first := ffOptionOrder(t, getFFGame(t, srv, game.host.Token, game.gameID), 1)
	for range 3 {
		again := ffOptionOrder(t, getFFGame(t, srv, game.host.Token, game.gameID), 1)
		if !slices.Equal(first, again) {
			t.Fatalf("the options moved between reads: %v then %v", first, again)
		}
	}
}

// And every player is shown the same order, because it is one persisted order rather than
// a shuffle per request.
func TestFFEverybodySeesTheSameOptionOrder(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	want := ffOptionOrder(t, getFFGame(t, srv, game.players[0].Token, game.gameID), 1)
	for _, player := range game.players[1:] {
		got := ffOptionOrder(t, getFFGame(t, srv, player.Token, game.gameID), 1)
		if !slices.Equal(want, got) {
			t.Errorf("%s sees %v, want %v", player.User.ID, got, want)
		}
	}
}

// ffOptionOrder is a round's options as a list of their first fill, in slot order.
func ffOptionOrder(t *testing.T, game ffGameResponse, roundNumber int) []string {
	t.Helper()

	for _, round := range game.Rounds {
		if round.Number != roundNumber {
			continue
		}
		order := make([]string, 0, len(round.Options))
		for _, option := range round.Options {
			if len(option.Fills) == 0 {
				t.Fatalf("round %d slot %d has no fills", roundNumber, option.Slot)
			}
			order = append(order, option.Fills[0])
		}
		if len(order) == 0 {
			t.Fatalf("round %d carries no options", roundNumber)
		}
		return order
	}

	t.Fatalf("the game has no round %d", roundNumber)
	return nil
}

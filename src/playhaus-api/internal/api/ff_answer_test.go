package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"playhaus-api/internal/fakefiller"
)

// The writing phase: everybody fills in the two prompts they were dealt, at once, and the
// last answer in opens the voting.
//
// Half of these are redaction tests, because half of what this phase does is refuse to
// say things. What a player wrote must not reach anybody else until the options are
// shuffled and shown -- not in a response body, not in a socket frame, not in a count.

// ffFill is what a given player writes into a given blank. Distinctive on purpose: the
// tests find their own answers again by looking for these strings, and the redaction tests
// assert that a body does *not* contain one.
func ffFill(userID string, roundNumber, blank int) string {
	return fmt.Sprintf("fake-%s-r%d-b%d", userID, roundNumber, blank)
}

func submitFFAnswer(t *testing.T, h http.Handler, token, gameID string, roundNumber int, fills []string) *httptest.ResponseRecorder {
	t.Helper()

	body, err := json.Marshal(map[string]any{"roundNumber": roundNumber, "fills": fills})
	if err != nil {
		t.Fatalf("encode answer: %v", err)
	}
	return do(t, h, http.MethodPost, ffAnswersPath(gameID), string(body), token)
}

// answerOnePrompt writes one player's fake for one round, with fills that name them.
func answerOnePrompt(t *testing.T, h http.Handler, player sessionResponse, gameID string, round ffRoundResponse) ffAnswerResponse {
	t.Helper()

	fills := make([]string, round.Blanks)
	for blank := range fills {
		fills[blank] = ffFill(player.User.ID, round.Number, blank)
	}

	rec := submitFFAnswer(t, h, player.Token, gameID, round.Number, fills)
	if rec.Code != http.StatusCreated {
		t.Fatalf("submit answer for round %d: status = %d, want %d (body: %s)",
			round.Number, rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[ffAnswerResponse](t, rec)
}

// writeEveryFFAnswer plays the whole writing phase out, which is what every voting test
// needs before it can start. Answers the last response, which is the one that opened the
// voting.
func writeEveryFFAnswer(t *testing.T, h http.Handler, game startedFFGame) ffAnswerResponse {
	t.Helper()

	var last ffAnswerResponse
	for _, player := range game.players {
		body := getFFGame(t, h, player.Token, game.gameID)
		for _, round := range body.Rounds {
			if round.Mine && !round.Answered {
				last = answerOnePrompt(t, h, player, game.gameID, round)
			}
		}
	}

	if !last.VotingOpened {
		t.Fatalf("the last answer did not open the voting: %+v", last)
	}
	return last
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

// The count climbs by one per answer and the voting opens on the last one, and on no
// other. This is the whole of what makes the phase change happen at all: there is no host
// button and nothing on a timer.
func TestFFVotingOpensOnlyWhenEveryAnswerIsIn(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	expected := fakefiller.AnswersFor(len(game.players))
	written := 0

	for _, player := range game.players {
		body := getFFGame(t, srv, player.Token, game.gameID)
		for _, round := range body.Rounds {
			if !round.Mine || round.Answered {
				continue
			}

			written++
			answered := answerOnePrompt(t, srv, player, game.gameID, round)

			if answered.AnswersIn != written {
				t.Errorf("after %d answers the server counted %d", written, answered.AnswersIn)
			}
			if answered.AnswersNeeded != expected {
				t.Errorf("answersNeeded = %d, want %d", answered.AnswersNeeded, expected)
			}
			if want := written == expected; answered.VotingOpened != want {
				t.Errorf("after %d of %d answers votingOpened = %v, want %v",
					written, expected, answered.VotingOpened, want)
			}
		}
	}

	if written != expected {
		t.Fatalf("wrote %d answers, want %d", written, expected)
	}

	after := getFFGame(t, srv, game.host.Token, game.gameID)
	if after.Phase != string(fakefiller.PhaseVoting) {
		t.Errorf("phase = %q, want voting", after.Phase)
	}
	if after.CurrentRound != 1 {
		t.Errorf("currentRound = %d, want 1", after.CurrentRound)
	}
}

// Two prompts each, and no third: a player who tries to write for somebody else's is
// refused rather than quietly given a third option row on it.
func TestFFAPlayerCannotAnswerAPromptThatIsNotTheirs(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	player := game.players[0]
	body := getFFGame(t, srv, player.Token, game.gameID)

	var theirs *ffRoundResponse
	for i := range body.Rounds {
		if !body.Rounds[i].Mine {
			theirs = &body.Rounds[i]
			break
		}
	}
	if theirs == nil {
		t.Fatal("every round was dealt to one player")
	}

	rec := submitFFAnswer(t, srv, player.Token, game.gameID, theirs.Number, []string{"nope", "nope"})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusForbidden, rec.Body)
	}
	if code := errorCode(t, rec); code != "not_your_prompt" {
		t.Errorf("code = %q, want not_your_prompt", code)
	}
}

// One value per blank. A prompt rendered with a blank still in it is not a fake anybody
// can vote on.
func TestFFAnAnswerMustFillEveryBlank(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	player := game.players[0]
	round := firstMineFFRound(t, getFFGame(t, srv, player.Token, game.gameID))

	rec := submitFFAnswer(t, srv, player.Token, game.gameID, round.Number, []string{"only one"})
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("too few fills: status = %d, want %d (body: %s)", rec.Code, http.StatusUnprocessableEntity, rec.Body)
	}

	blank := make([]string, round.Blanks)
	for i := range blank {
		blank[i] = "   "
	}
	rec = submitFFAnswer(t, srv, player.Token, game.gameID, round.Number, blank)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("empty fills: status = %d, want %d (body: %s)", rec.Code, http.StatusUnprocessableEntity, rec.Body)
	}

	rec = submitFFAnswer(t, srv, player.Token, game.gameID, round.Number, nil)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("no fills at all: status = %d, want %d (body: %s)", rec.Code, http.StatusUnprocessableEntity, rec.Body)
	}
}

func TestFFAPromptCannotBeAnsweredTwice(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	player := game.players[0]
	round := firstMineFFRound(t, getFFGame(t, srv, player.Token, game.gameID))
	answerOnePrompt(t, srv, player, game.gameID, round)

	rec := submitFFAnswer(t, srv, player.Token, game.gameID, round.Number,
		make([]string, round.Blanks))
	if rec.Code != http.StatusUnprocessableEntity && rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want a refusal (body: %s)", rec.Code, rec.Body)
	}

	// With real fills it is specifically "you have already filled that one in".
	fills := make([]string, round.Blanks)
	for i := range fills {
		fills[i] = "a second attempt"
	}
	rec = submitFFAnswer(t, srv, player.Token, game.gameID, round.Number, fills)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "already_answered" {
		t.Errorf("code = %q, want already_answered", code)
	}
}

func TestFFAnswersAreRefusedOnceVotingHasOpened(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)
	writeEveryFFAnswer(t, srv, game)

	player := game.players[0]
	rec := submitFFAnswer(t, srv, player.Token, game.gameID, 1, []string{"too", "late"})
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if code := errorCode(t, rec); code != "wrong_phase" && code != "already_answered" {
		t.Errorf("code = %q, want wrong_phase or already_answered", code)
	}
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

// The whole game rests on this: what one player wrote does not reach anybody else until
// the options are shuffled and shown.
//
// Asserted on the raw response body rather than on the decoded struct, because the
// question is not "did a field carry it" but "did the answer leave the server at all" --
// a field added later that carried it would slip past a struct assertion.
func TestFFAPlayerCannotReadAnotherPlayersFillsBeforeVotingOpens(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	author := game.players[0]
	round := firstMineFFRound(t, getFFGame(t, srv, author.Token, game.gameID))
	answerOnePrompt(t, srv, author, game.gameID, round)

	secret := ffFill(author.User.ID, round.Number, 0)

	for _, other := range game.players[1:] {
		rec := do(t, srv, http.MethodGet, ffGamePath(game.gameID), "", other.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("get game: status = %d (body: %s)", rec.Code, rec.Body)
		}
		if strings.Contains(rec.Body.String(), secret) {
			t.Fatalf("%s was sent %s's answer %q", other.User.ID, author.User.ID, secret)
		}

		// And nothing else leaks it either: no options before voting opens.
		body := decodeBody[ffGameResponse](t, rec)
		for _, r := range body.Rounds {
			if len(r.Options) != 0 {
				t.Errorf("round %d carried %d options during the writing phase", r.Number, len(r.Options))
			}
			if r.Number == round.Number && r.AnswerCount != 1 {
				t.Errorf("round %d reports %d answers in, want 1", r.Number, r.AnswerCount)
			}
		}
	}

	// The author does get their own back, which is what lets a reconnect redraw a prompt
	// they had already filled in.
	own := getFFGame(t, srv, author.Token, game.gameID)
	for _, r := range own.Rounds {
		if r.Number != round.Number {
			continue
		}
		if !r.Answered {
			t.Error("the author's own round does not report itself answered")
		}
		if len(r.MyFills) == 0 || r.MyFills[0] != secret {
			t.Errorf("myFills = %v, want it to start with %q", r.MyFills, secret)
		}
	}
}

// The answer-progress body is broadcast to the whole table, so it must carry counts and
// nothing else -- what a player is writing is exactly what this phase is hiding.
func TestFFAnswerProgressCarriesCountsAndNoContent(t *testing.T) {
	srv, _ := newTestServerWithDB(t)
	game := threeHandedFFGame(t, srv)

	author := game.players[0]
	round := firstMineFFRound(t, getFFGame(t, srv, author.Token, game.gameID))

	fills := make([]string, round.Blanks)
	for blank := range fills {
		fills[blank] = ffFill(author.User.ID, round.Number, blank)
	}

	rec := submitFFAnswer(t, srv, author.Token, game.gameID, round.Number, fills)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	for _, fill := range fills {
		if strings.Contains(rec.Body.String(), fill) {
			t.Fatalf("the answer response echoed the fill %q back; it is broadcast to the table", fill)
		}
	}

	body := decodeBody[ffAnswerResponse](t, rec)
	if body.AnswersIn != 1 || body.AnswersNeeded != fakefiller.AnswersFor(len(game.players)) {
		t.Errorf("counts = %d/%d, want 1/%d", body.AnswersIn, body.AnswersNeeded, fakefiller.AnswersFor(len(game.players)))
	}
	if body.Phase != string(fakefiller.PhaseWriting) {
		t.Errorf("phase = %q, want writing", body.Phase)
	}
}

// firstMineFFRound is one of the two prompts the reader was dealt.
func firstMineFFRound(t *testing.T, game ffGameResponse) ffRoundResponse {
	t.Helper()

	for _, round := range game.Rounds {
		if round.Mine && !round.Answered {
			return round
		}
	}

	t.Fatal("the reader holds no unanswered prompt")
	return ffRoundResponse{}
}

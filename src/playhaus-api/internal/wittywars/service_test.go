package wittywars

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/platform/database/databasetest"
)

func newTestService(t *testing.T) *Service {
	t.Helper()
	return NewService(NewGormStore(databasetest.Open(t)))
}

// startedGame opens a room for `count` players, starts it, and returns the game and the players' ids.
func startedGame(t *testing.T, svc *Service, count int) (*WWMultiDeviceGame, []string) {
	t.Helper()
	ctx := context.Background()

	players := make([]string, count)
	for i := range players {
		players[i] = fmt.Sprintf("player-%c", 'a'+i)
	}

	lobby, err := svc.CreateLobby(ctx, players[0], i18n.EN, GameModeFamily)
	if err != nil {
		t.Fatalf("create lobby: %v", err)
	}
	for _, id := range players[1:] {
		if _, err := svc.JoinLobby(ctx, lobby.ID, id); err != nil {
			t.Fatalf("join lobby: %v", err)
		}
	}
	_, game, err := svc.StartLobby(ctx, lobby.ID, players[0])
	if err != nil {
		t.Fatalf("start lobby: %v", err)
	}
	return game, players
}

// answersFor is a full batch for one player, every answer distinct.
func answersFor(game *WWMultiDeviceGame, userID string) []RoundAnswer {
	var out []RoundAnswer
	for _, round := range game.RoundsFor(userID) {
		out = append(out, RoundAnswer{RoundNumber: round.Number, Answer: fmt.Sprintf("%s on %d", userID, round.Number)})
	}
	return out
}

func TestAStartedGameDealsEveryPromptToTwoDifferentPlayers(t *testing.T) {
	svc := newTestService(t)
	game, players := startedGame(t, svc, 4)

	if got, want := len(game.Rounds), RoundsFor(4, DefaultAnswersPerPlayer); got != want {
		t.Fatalf("dealt %d rounds, want %d", got, want)
	}
	for _, round := range game.Rounds {
		if round.AuthorOneUserID == round.AuthorTwoUserID {
			t.Errorf("round %d was dealt to one player twice", round.Number)
		}
		if HasPlaceholder(round.Line) != (round.SubjectUserID != "") {
			t.Errorf("round %d: line %q has subject %q", round.Number, round.Line, round.SubjectUserID)
		}
	}
	for _, id := range players {
		if len(game.RoundsFor(id)) < DefaultAnswersPerPlayer {
			t.Errorf("%s was dealt %d prompts", id, len(game.RoundsFor(id)))
		}
	}
}

func TestAThreePlayerTableIsTheFloor(t *testing.T) {
	svc := newTestService(t)
	ctx := context.Background()

	lobby, err := svc.CreateLobby(ctx, "host", i18n.EN, GameModeRude)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.JoinLobby(ctx, lobby.ID, "guest"); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.StartLobby(ctx, lobby.ID, "host"); !errors.Is(err, ErrNotEnoughPlayers) {
		t.Errorf("start with two: %v, want ErrNotEnoughPlayers", err)
	}
}

func TestAPartialBatchIsRefusedAndNothingIsSaved(t *testing.T) {
	svc := newTestService(t)
	ctx := context.Background()
	game, players := startedGame(t, svc, 3)

	batch := answersFor(game, players[0])
	_, err := svc.SubmitAnswers(ctx, SubmitAnswersInput{GameID: game.ID, UserID: players[0], Answers: batch[:len(batch)-1]})
	if !errors.Is(err, ErrIncompleteAnswers) {
		t.Fatalf("partial batch: %v, want ErrIncompleteAnswers", err)
	}

	// A batch whose last answer is too long must not leave the others behind.
	batch[len(batch)-1].Answer = strings.Repeat("a", MaxAnswerLength+1)
	if _, err := svc.SubmitAnswers(ctx, SubmitAnswersInput{GameID: game.ID, UserID: players[0], Answers: batch}); !errors.Is(err, ErrAnswerTooLong) {
		t.Fatalf("too long: %v, want ErrAnswerTooLong", err)
	}

	fresh, err := svc.Game(ctx, game.ID, players[0])
	if err != nil {
		t.Fatal(err)
	}
	for _, round := range fresh.Rounds {
		if len(round.Options) != 0 {
			t.Errorf("round %d holds %d answers after two refused batches", round.Number, len(round.Options))
		}
	}
}

func TestTheLastBatchOpensTheVotingAndAVotePaysWithASweep(t *testing.T) {
	svc := newTestService(t)
	ctx := context.Background()
	game, players := startedGame(t, svc, 3)

	var outcome *AnswerOutcome
	for i, id := range players {
		var err error
		outcome, err = svc.SubmitAnswers(ctx, SubmitAnswersInput{GameID: game.ID, UserID: id, Answers: answersFor(game, id)})
		if err != nil {
			t.Fatalf("submit for %s: %v", id, err)
		}
		if last := i == len(players)-1; outcome.VotingOpened != last {
			t.Fatalf("after %s VotingOpened = %v", id, outcome.VotingOpened)
		}
	}
	if outcome.Game.Phase != PhaseVoting {
		t.Fatalf("phase = %s, want voting", outcome.Game.Phase)
	}

	if _, err := svc.SubmitAnswers(ctx, SubmitAnswersInput{GameID: game.ID, UserID: players[0], Answers: answersFor(game, players[0])}); !errors.Is(err, ErrWrongPhase) {
		t.Errorf("a second batch once voting opened: %v, want ErrWrongPhase", err)
	}

	round := outcome.Game.Round(1)
	var voter string
	for _, id := range players {
		if !round.WrittenBy(id) {
			voter = id
		}
	}
	if _, err := svc.CastVote(ctx, CastVoteInput{GameID: game.ID, UserID: round.AuthorOneUserID, RoundNumber: 1, Slot: 0}); !errors.Is(err, ErrCannotVoteOwnPrompt) {
		t.Errorf("a writer voting: %v, want ErrCannotVoteOwnPrompt", err)
	}

	picked := round.OptionInSlot(0).AuthorID
	vote, err := svc.CastVote(ctx, CastVoteInput{GameID: game.ID, UserID: voter, RoundNumber: 1, Slot: 0})
	if err != nil {
		t.Fatalf("vote: %v", err)
	}
	if !vote.RoundOver || vote.Game.Phase != PhaseReveal {
		t.Fatalf("the only voter's vote left the round open: %+v", vote)
	}
	// The only voter took the only vote there was, which is a sweep.
	if got := vote.Game.Score(picked); got != VotePoints+SweepBonus {
		t.Errorf("the picked writer scored %d, want %d", got, VotePoints+SweepBonus)
	}

	advanced, err := svc.Advance(ctx, AdvanceInput{GameID: game.ID, UserID: players[0], RoundNumber: 1})
	if err != nil || !advanced.Advanced || advanced.Game.CurrentRound != 2 {
		t.Fatalf("advance: %+v, %v", advanced, err)
	}
}

package oneofus

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// startedMultiDeviceGame writes a room and the game it dealt, with roles in seat order and the chain on seat nought.
func startedMultiDeviceGame(t *testing.T, db *gorm.DB, roles ...Role) *OOUMultiDeviceGame {
	t.Helper()

	now := time.Now().UTC()
	code := "OTEST"

	lobby := &OOULobby{
		ID:           code,
		OwnerID:      "u0",
		Locale:       i18n.NL,
		GameMode:     Sentence,
		EnabledRoles: RoleSet(ImposterRoles()),
		Status:       LobbyStarted,
		CreatedAt:    now,
	}
	if err := db.Create(lobby).Error; err != nil {
		t.Fatalf("insert lobby: %v", err)
	}

	game := &OOUMultiDeviceGame{
		ID:               uuid.New(),
		LobbyID:          code,
		OwnerID:          "u0",
		Locale:           i18n.NL,
		GameMode:         Sentence,
		ActualQuestion:   "real",
		ImposterQuestion: "fake",
		Phase:            PhaseAnswer,
		CurrentRound:     1,
		Status:           GameInProgress,
		CreatedAt:        now,
	}

	for seat, role := range roles {
		game.Players = append(game.Players, OOUGamePlayer{
			GameID:  game.ID,
			UserID:  userIDForSeat(seat),
			Seat:    seat,
			Role:    role,
			IsMayor: seat == 0,
		})
	}

	game.Rounds = []OOURound{{
		ID:          uuid.New(),
		GameID:      game.ID,
		Number:      1,
		LivingCount: len(roles),
		CreatedAt:   now,
	}}

	if err := db.Create(game).Error; err != nil {
		t.Fatalf("insert game: %v", err)
	}

	return game
}

func userIDForSeat(seat int) string {
	return fmt.Sprintf("u%d", seat)
}

func answer(round uuid.UUID, userID, text string) *OOUAnswer {
	return &OOUAnswer{RoundID: round, UserID: userID, Text: text, Slot: UnassignedSlot, CreatedAt: time.Now().UTC()}
}

func TestSaveAnswerCountsWhatTheRoundHolds(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Imposter)
	round := game.Rounds[0]

	for seat := range 3 {
		answered, err := store.SaveAnswer(ctx, SaveAnswerInput{
			GameID:      game.ID,
			RoundNumber: 1,
			Answer:      answer(round.ID, userIDForSeat(seat), "something"),
		})
		if err != nil {
			t.Fatalf("save answer for seat %d: %v", seat, err)
		}
		if answered != seat+1 {
			t.Errorf("after seat %d the round holds %d answers, want %d", seat, answered, seat+1)
		}
	}
}

func TestSaveAnswerRefusesASecondAnswerFromTheSamePlayer(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Imposter)
	round := game.Rounds[0]

	if _, err := store.SaveAnswer(ctx, SaveAnswerInput{GameID: game.ID, RoundNumber: 1, Answer: answer(round.ID, "u0", "first")}); err != nil {
		t.Fatalf("save answer: %v", err)
	}

	_, err := store.SaveAnswer(ctx, SaveAnswerInput{GameID: game.ID, RoundNumber: 1, Answer: answer(round.ID, "u0", "second")})
	if !errors.Is(err, ErrAlreadyAnswered) {
		t.Fatalf("second answer returned %v, want ErrAlreadyAnswered", err)
	}

	assertRowCount(t, db, "oou_answers", 1)
}

func TestSaveAnswerRefusesOnceVotingHasOpened(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Imposter)
	round := game.Rounds[0]

	if err := db.Model(&OOUMultiDeviceGame{}).Where("id = ?", game.ID).Update("phase", PhaseVote).Error; err != nil {
		t.Fatalf("move phase: %v", err)
	}

	_, err := store.SaveAnswer(ctx, SaveAnswerInput{GameID: game.ID, RoundNumber: 1, Answer: answer(round.ID, "u0", "late")})
	if !errors.Is(err, ErrWrongPhase) {
		t.Fatalf("late answer returned %v, want ErrWrongPhase", err)
	}
}

func TestOpenVotingWritesTheSlotsAndOnlyTheFirstCallerWins(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Imposter)
	round := game.Rounds[0]

	for seat := range 3 {
		if _, err := store.SaveAnswer(ctx, SaveAnswerInput{GameID: game.ID, RoundNumber: 1, Answer: answer(round.ID, userIDForSeat(seat), "something")}); err != nil {
			t.Fatalf("save answer: %v", err)
		}
	}

	in := OpenVotingInput{GameID: game.ID, RoundNumber: 1, Slots: []SlotAssignment{
		{RoundID: round.ID, UserID: "u0", Slot: 2},
		{RoundID: round.ID, UserID: "u1", Slot: 0},
		{RoundID: round.ID, UserID: "u2", Slot: 1},
	}}

	opened, err := store.OpenVoting(ctx, in)
	if err != nil {
		t.Fatalf("open voting: %v", err)
	}
	if !opened {
		t.Fatal("the first caller did not open the voting")
	}

	again, err := store.OpenVoting(ctx, in)
	if err != nil {
		t.Fatalf("open voting again: %v", err)
	}
	if again {
		t.Error("a second caller also opened the voting")
	}

	fresh, err := store.MultiDeviceGameByID(ctx, game.ID)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}
	if fresh.Phase != PhaseVote {
		t.Errorf("phase is %q, want %q", fresh.Phase, PhaseVote)
	}
	if got := fresh.Round(1).AnswerInSlot(0); got == nil || got.UserID != "u1" {
		t.Errorf("slot 0 holds %+v, want u1's answer", got)
	}
}

func TestRecordVoteRefusesASecondVoteFromTheSamePlayer(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Imposter)
	round := game.Rounds[0]

	if err := db.Model(&OOUMultiDeviceGame{}).Where("id = ?", game.ID).Update("phase", PhaseVote).Error; err != nil {
		t.Fatalf("move phase: %v", err)
	}

	votes, err := store.RecordVote(ctx, RecordVoteInput{GameID: game.ID, RoundNumber: 1, Vote: &OOUVote{
		RoundID: round.ID, VoterUserID: "u0", AccusedUserID: "u2", CreatedAt: time.Now().UTC(),
	}})
	if err != nil {
		t.Fatalf("record vote: %v", err)
	}
	if votes != 1 {
		t.Errorf("the round holds %d votes, want 1", votes)
	}

	_, err = store.RecordVote(ctx, RecordVoteInput{GameID: game.ID, RoundNumber: 1, Vote: &OOUVote{
		RoundID: round.ID, VoterUserID: "u0", AccusedUserID: "u1", CreatedAt: time.Now().UTC(),
	}})
	if !errors.Is(err, ErrAlreadyVoted) {
		t.Fatalf("second vote returned %v, want ErrAlreadyVoted", err)
	}

	assertRowCount(t, db, "oou_votes", 1)
}

func TestCloseRoundTakesThePlayerAndHandsOnTheChain(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	// Four players so the game carries on after one civilian is gone.
	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Civilian, Imposter)
	round := game.Rounds[0]

	if err := db.Model(&OOUMultiDeviceGame{}).Where("id = ?", game.ID).Update("phase", PhaseVote).Error; err != nil {
		t.Fatalf("move phase: %v", err)
	}

	closed, err := store.CloseRound(ctx, CloseRoundInput{
		GameID:           game.ID,
		RoundID:          round.ID,
		RoundNumber:      1,
		EliminatedUserID: "u0",
		EliminatedRole:   Civilian,
		EliminatedVotes:  3,
		MayorOrder:       []string{"u2", "u1"},
	})
	if err != nil {
		t.Fatalf("close round: %v", err)
	}
	if !closed {
		t.Fatal("the first caller did not close the round")
	}

	again, err := store.CloseRound(ctx, CloseRoundInput{GameID: game.ID, RoundID: round.ID, RoundNumber: 1, EliminatedUserID: "u1", EliminatedRole: Civilian})
	if err != nil {
		t.Fatalf("close round again: %v", err)
	}
	if again {
		t.Error("a second caller also closed the round")
	}

	fresh, err := store.MultiDeviceGameByID(ctx, game.ID)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}
	if fresh.Phase != PhaseReveal {
		t.Errorf("phase is %q, want %q", fresh.Phase, PhaseReveal)
	}
	if fresh.Status != GameInProgress {
		t.Errorf("status is %q, want the game to carry on", fresh.Status)
	}

	out := fresh.Player("u0")
	if !out.IsVotedOut || out.IsMayor {
		t.Errorf("u0 is %+v, want voted out and without the chain", out)
	}
	if out.VotedOutRound == nil || *out.VotedOutRound != 1 {
		t.Errorf("u0 was voted out in round %v, want 1", out.VotedOutRound)
	}
	if mayor := fresh.Player("u2"); !mayor.IsMayor {
		t.Error("the chain did not go to the first living candidate in the order given")
	}

	closedRound := fresh.Round(1)
	if closedRound.ClosedAt == nil {
		t.Error("the round was not stamped closed")
	}
	if closedRound.EliminatedUserID == nil || *closedRound.EliminatedUserID != "u0" {
		t.Errorf("the round names %v as eliminated, want u0", closedRound.EliminatedUserID)
	}
	if closedRound.EliminatedVotes != 3 {
		t.Errorf("the round records %d votes, want 3", closedRound.EliminatedVotes)
	}
}

func TestCloseRoundFinishesAGameThatTheEliminationEnded(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Imposter)
	round := game.Rounds[0]

	if err := db.Model(&OOUMultiDeviceGame{}).Where("id = ?", game.ID).Update("phase", PhaseVote).Error; err != nil {
		t.Fatalf("move phase: %v", err)
	}

	if _, err := store.CloseRound(ctx, CloseRoundInput{
		GameID:           game.ID,
		RoundID:          round.ID,
		RoundNumber:      1,
		EliminatedUserID: "u2",
		EliminatedRole:   Imposter,
		EliminatedVotes:  2,
		GameEnded:        true,
		CiviliansWon:     true,
	}); err != nil {
		t.Fatalf("close round: %v", err)
	}

	fresh, err := store.MultiDeviceGameByID(ctx, game.ID)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}
	if fresh.Status != GameCompleted {
		t.Errorf("status is %q, want %q", fresh.Status, GameCompleted)
	}
	if fresh.CiviliansWon == nil || !*fresh.CiviliansWon {
		t.Errorf("civiliansWon is %v, want true", fresh.CiviliansWon)
	}
	if fresh.FinishedAt == nil {
		t.Error("a finished game has no finishedAt")
	}
	// The reveal is the last thing the table sees, so the phase stays on it.
	if fresh.Phase != PhaseReveal {
		t.Errorf("phase is %q, want %q", fresh.Phase, PhaseReveal)
	}
}

func TestOpenRoundAdvancesTheGameOnceOnly(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	game := startedMultiDeviceGame(t, db, Civilian, Civilian, Civilian, Imposter)

	if err := db.Model(&OOUMultiDeviceGame{}).Where("id = ?", game.ID).Update("phase", PhaseReveal).Error; err != nil {
		t.Fatalf("move phase: %v", err)
	}

	next := &OOURound{ID: uuid.New(), GameID: game.ID, Number: 2, LivingCount: 3, CreatedAt: time.Now().UTC()}

	opened, err := store.OpenRound(ctx, OpenRoundInput{GameID: game.ID, FromRound: 1, Round: next})
	if err != nil {
		t.Fatalf("open round: %v", err)
	}
	if !opened {
		t.Fatal("the first caller did not open the round")
	}

	again, err := store.OpenRound(ctx, OpenRoundInput{
		GameID:    game.ID,
		FromRound: 1,
		Round:     &OOURound{ID: uuid.New(), GameID: game.ID, Number: 2, LivingCount: 3, CreatedAt: time.Now().UTC()},
	})
	if err != nil {
		t.Fatalf("open round again: %v", err)
	}
	if again {
		t.Error("a second caller also opened the round")
	}

	fresh, err := store.MultiDeviceGameByID(ctx, game.ID)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}
	if fresh.Phase != PhaseAnswer || fresh.CurrentRound != 2 {
		t.Errorf("the game is on round %d in phase %q, want round 2 in %q", fresh.CurrentRound, fresh.Phase, PhaseAnswer)
	}

	assertRowCount(t, db, "oou_rounds", 2)
}

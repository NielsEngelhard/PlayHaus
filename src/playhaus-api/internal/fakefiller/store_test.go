package fakefiller

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/platform/database"
)

func newTestStore(t *testing.T) (*GormStore, *gorm.DB) {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open, so close it
	// explicitly before cleanup runs.
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	models := Models()
	if err := database.Migrate(db, models[0], models[1:]...); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	return NewGormStore(db), db
}

// seededGame is a game already written into the database, plus the pieces a test needs to
// poke at it. Built straight through the store rather than through the service, because
// these tests are about what the rows do.
//
// Most of them seed three players, which is the table size where a round has exactly one
// voter and so where the first vote is also the last. The tests that are about several
// voters arriving at once ask for more.
type seededGame struct {
	lobby   *FFLobby
	game    *FFMultiDeviceGame
	players []string
}

func seedGame(t *testing.T, store *GormStore, mode FFGameMode, createdAt time.Time) seededGame {
	t.Helper()
	return seedGameFor(t, store, mode, MinLobbyPlayers, createdAt)
}

func seedGameFor(t *testing.T, store *GormStore, mode FFGameMode, count int, createdAt time.Time) seededGame {
	t.Helper()

	ctx := context.Background()
	players := make([]string, count)
	for i := range players {
		players[i] = fmt.Sprintf("player-%c", 'a'+i)
	}
	code := "FTEST"

	lobby := &FFLobby{
		ID:        code,
		OwnerID:   players[0],
		Locale:    i18n.EN,
		GameMode:  mode,
		Status:    LobbyWaiting,
		CreatedAt: createdAt,
	}
	for seat, userID := range players {
		lobby.Players = append(lobby.Players, FFLobbyPlayer{
			LobbyID: code, UserID: userID, Seat: seat, JoinedAt: createdAt,
		})
	}
	if err := store.CreateLobby(ctx, lobby); err != nil {
		t.Fatalf("create lobby: %v", err)
	}

	game := &FFMultiDeviceGame{
		ID:           uuid.New(),
		LobbyID:      code,
		OwnerID:      players[0],
		Locale:       i18n.EN,
		GameMode:     mode,
		Phase:        PhaseWriting,
		CurrentRound: 1,
		Status:       GameInProgress,
		CreatedAt:    createdAt,
	}
	for i, userID := range players {
		game.Players = append(game.Players, FFGamePlayer{GameID: game.ID, UserID: userID, TurnOrder: i})
	}
	for number := 1; number <= RoundsFor(len(players)); number++ {
		first, second := AuthorSeats(number, len(players))
		round := FFRound{
			ID:              uuid.New(),
			GameID:          game.ID,
			Number:          number,
			Line:            "the " + Placeholder + " was won by " + Placeholder,
			Blanks:          2,
			AuthorOneUserID: players[first],
			AuthorTwoUserID: players[second],
			CreatedAt:       createdAt,
		}
		if mode.HasTruth() {
			round.Options = []FFOption{{
				RoundID:   round.ID,
				AuthorID:  TruthAuthorID,
				Fills:     Fills{"discus", "Robert Harting"},
				Slot:      UnassignedSlot,
				CreatedAt: createdAt,
			}}
		}
		game.Rounds = append(game.Rounds, round)
	}

	if err := store.StartLobby(ctx, lobby, game); err != nil {
		t.Fatalf("start lobby: %v", err)
	}

	return seededGame{lobby: lobby, game: game, players: players}
}

func answer(t *testing.T, store *GormStore, seeded seededGame, roundIndex int, authorID string) int {
	t.Helper()

	answered, err := store.SaveAnswer(context.Background(), SaveAnswerInput{
		GameID: seeded.game.ID,
		Option: &FFOption{
			RoundID:   seeded.game.Rounds[roundIndex].ID,
			AuthorID:  authorID,
			Fills:     Fills{"javelin", "Nobody At All"},
			Slot:      UnassignedSlot,
			CreatedAt: time.Now().UTC(),
		},
		Expected: AnswersFor(len(seeded.players)),
	})
	if err != nil {
		t.Fatalf("save answer for round %d by %s: %v", roundIndex+1, authorID, err)
	}
	return answered
}

// writeEverything fills in every answer the table owes and opens the voting, which is the
// state most of these tests want to start from.
func writeEverything(t *testing.T, store *GormStore, seeded seededGame) *FFMultiDeviceGame {
	t.Helper()

	ctx := context.Background()
	expected := AnswersFor(len(seeded.players))
	answered := 0

	for i, round := range seeded.game.Rounds {
		answered = answer(t, store, seeded, i, round.AuthorOneUserID)
		answered = answer(t, store, seeded, i, round.AuthorTwoUserID)
	}
	if answered != expected {
		t.Fatalf("after writing everything the store counted %d answers, want %d", answered, expected)
	}

	game, err := store.GameByID(ctx, seeded.game.ID)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}

	var slots []SlotAssignment
	for _, round := range game.Rounds {
		for i, option := range round.Options {
			slots = append(slots, SlotAssignment{RoundID: round.ID, AuthorID: option.AuthorID, Slot: i})
		}
	}
	opened, err := store.OpenVoting(ctx, game.ID, slots)
	if err != nil {
		t.Fatalf("open voting: %v", err)
	}
	if !opened {
		t.Fatal("OpenVoting reported that voting was already open on a game still writing")
	}

	game, err = store.GameByID(ctx, seeded.game.ID)
	if err != nil {
		t.Fatalf("re-read game: %v", err)
	}
	return game
}

// ---------------------------------------------------------------------------
// Concurrency: the composite keys are the guard
// ---------------------------------------------------------------------------

// The (RoundID, AuthorID) key is what makes a second answer impossible, since every player
// may be writing at once and none of them holds a turn.
func TestASecondAnswerToTheSamePromptIsRefused(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	round := seeded.game.Rounds[0]

	answer(t, store, seeded, 0, round.AuthorOneUserID)

	_, err := store.SaveAnswer(context.Background(), SaveAnswerInput{
		GameID: seeded.game.ID,
		Option: &FFOption{
			RoundID:   round.ID,
			AuthorID:  round.AuthorOneUserID,
			Fills:     Fills{"something", "else"},
			Slot:      UnassignedSlot,
			CreatedAt: time.Now().UTC(),
		},
		Expected: AnswersFor(len(seeded.players)),
	})
	if !errors.Is(err, ErrAlreadyAnswered) {
		t.Fatalf("second answer: err = %v, want ErrAlreadyAnswered", err)
	}
}

// The count comes back from inside the transaction that did the insert, so it always
// includes the answer being reported on -- which is what makes exactly one writer see it
// reach the total.
func TestTheAnswerCountClimbsWithEachAnswerAndIgnoresTheTruth(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())

	want := 0
	for i, round := range seeded.game.Rounds {
		for _, author := range []string{round.AuthorOneUserID, round.AuthorTwoUserID} {
			want++
			if got := answer(t, store, seeded, i, author); got != want {
				t.Fatalf("after %d answers the store counted %d", want, got)
			}
		}
	}

	if want != AnswersFor(len(seeded.players)) {
		t.Fatalf("wrote %d answers, want %d", want, AnswersFor(len(seeded.players)))
	}
}

// The (RoundID, VoterUserID) key is the same guard on the other half of the game.
//
// Seeded five-handed rather than three: with three players a round has one voter, so the
// first vote also closes the round and a second one would be refused for having missed it
// rather than for being a second. Five leaves the round open, which is the case the key is
// actually there for.
func TestASecondVoteOnTheSameRoundIsRefused(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGameFor(t, store, GameModeFacts, 5, time.Now().UTC())
	game := writeEverything(t, store, seeded)

	round := game.Rounds[0]
	voter := votersFor(t, seeded.players, round)[0]

	in := RecordVoteInput{
		GameID:       game.ID,
		Vote:         &FFVote{RoundID: round.ID, VoterUserID: voter, VotedForAuthorID: TruthAuthorID, CreatedAt: time.Now().UTC()},
		RoundNumber:  round.Number,
		TotalRounds:  len(game.Rounds),
		VotersNeeded: VotersFor(len(seeded.players)),
	}
	if _, err := store.RecordVote(context.Background(), in); err != nil {
		t.Fatalf("first vote: %v", err)
	}

	in.Vote = &FFVote{RoundID: round.ID, VoterUserID: voter, VotedForAuthorID: round.AuthorOneUserID, CreatedAt: time.Now().UTC()}

	_, err := store.RecordVote(context.Background(), in)
	if !errors.Is(err, ErrAlreadyVoted) {
		t.Fatalf("second vote: err = %v, want ErrAlreadyVoted", err)
	}
}

// With three players a round has exactly one voter, so the first vote is also the last:
// it closes the round and moves the game on.
func TestTheLastVoteClosesTheRoundAndMovesTheGameOn(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	game := writeEverything(t, store, seeded)

	for i, round := range game.Rounds {
		last := i == len(game.Rounds)-1

		result, err := store.RecordVote(context.Background(), RecordVoteInput{
			GameID:        game.ID,
			Vote:          &FFVote{RoundID: round.ID, VoterUserID: voterFor(t, seeded.players, round), VotedForAuthorID: TruthAuthorID, CreatedAt: time.Now().UTC()},
			RoundNumber:   round.Number,
			TotalRounds:   len(game.Rounds),
			VotersNeeded:  VotersFor(len(seeded.players)),
			GuesserID:     voterFor(t, seeded.players, round),
			GuesserPoints: TruthPoints,
		})
		if err != nil {
			t.Fatalf("vote on round %d: %v", round.Number, err)
		}
		if !result.RoundOver {
			t.Errorf("round %d: the only vote did not close it", round.Number)
		}
		if result.GameOver != last {
			t.Errorf("round %d: GameOver = %v, want %v", round.Number, result.GameOver, last)
		}
	}

	final, err := store.GameByID(context.Background(), game.ID)
	if err != nil {
		t.Fatalf("read final game: %v", err)
	}
	if final.Status != GameCompleted {
		t.Errorf("after the last vote the game is %q, want %q", final.Status, GameCompleted)
	}

	// Each player is the sole voter on exactly one round, and each of them found the
	// truth, so everybody is on one point.
	for _, player := range final.Players {
		if player.Score != TruthPoints {
			t.Errorf("%s scored %d, want %d", player.UserID, player.Score, TruthPoints)
		}
	}
}

// A vote for a round the table has already left is refused rather than scored into a
// finished round -- the store re-reads the game inside its own transaction rather than
// trusting what the caller saw.
func TestAVoteOnARoundTheTableHasLeftIsRefused(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	game := writeEverything(t, store, seeded)

	first, second := game.Rounds[0], game.Rounds[1]

	if _, err := store.RecordVote(context.Background(), RecordVoteInput{
		GameID:       game.ID,
		Vote:         &FFVote{RoundID: first.ID, VoterUserID: voterFor(t, seeded.players, first), VotedForAuthorID: TruthAuthorID, CreatedAt: time.Now().UTC()},
		RoundNumber:  first.Number,
		TotalRounds:  len(game.Rounds),
		VotersNeeded: VotersFor(len(seeded.players)),
	}); err != nil {
		t.Fatalf("close round 1: %v", err)
	}

	// The game is on round 2 now, so a straggler still voting on round 1 is too late.
	_, err := store.RecordVote(context.Background(), RecordVoteInput{
		GameID:       game.ID,
		Vote:         &FFVote{RoundID: first.ID, VoterUserID: second.AuthorOneUserID, VotedForAuthorID: TruthAuthorID, CreatedAt: time.Now().UTC()},
		RoundNumber:  first.Number,
		TotalRounds:  len(game.Rounds),
		VotersNeeded: VotersFor(len(seeded.players)),
	})
	if !errors.Is(err, ErrWrongRound) {
		t.Fatalf("late vote: err = %v, want ErrWrongRound", err)
	}
}

// The flip is the claim, so the second caller does nothing at all -- reshuffling would
// move the options under everybody who had already been shown them.
func TestVotingIsOpenedExactlyOnce(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	game := writeEverything(t, store, seeded)

	before := map[string]int{}
	for _, round := range game.Rounds {
		for _, option := range round.Options {
			before[round.ID.String()+option.AuthorID] = option.Slot
		}
	}

	// A second attempt, shuffled the other way round, must change nothing.
	var slots []SlotAssignment
	for _, round := range game.Rounds {
		for i, option := range round.Options {
			slots = append(slots, SlotAssignment{
				RoundID:  round.ID,
				AuthorID: option.AuthorID,
				Slot:     len(round.Options) - 1 - i,
			})
		}
	}
	opened, err := store.OpenVoting(context.Background(), game.ID, slots)
	if err != nil {
		t.Fatalf("second OpenVoting: %v", err)
	}
	if opened {
		t.Fatal("OpenVoting opened voting twice")
	}

	after, err := store.GameByID(context.Background(), game.ID)
	if err != nil {
		t.Fatalf("re-read game: %v", err)
	}
	for _, round := range after.Rounds {
		for _, option := range round.Options {
			if got := option.Slot; got != before[round.ID.String()+option.AuthorID] {
				t.Errorf("round %d option %q moved from slot %d to %d",
					round.Number, option.AuthorID, before[round.ID.String()+option.AuthorID], got)
			}
		}
	}
}

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------

// The start is conditional on the room still waiting, so a host pressing the button twice
// starts one game rather than two.
func TestALobbyCannotBeStartedTwice(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())

	second := &FFMultiDeviceGame{
		ID:           uuid.New(),
		LobbyID:      seeded.lobby.ID,
		OwnerID:      seeded.lobby.OwnerID,
		Locale:       i18n.EN,
		GameMode:     GameModeFacts,
		Phase:        PhaseWriting,
		CurrentRound: 1,
		Status:       GameInProgress,
		CreatedAt:    time.Now().UTC(),
	}

	err := store.StartLobby(context.Background(), seeded.lobby, second)
	if !errors.Is(err, ErrLobbyStarted) {
		t.Fatalf("second start: err = %v, want ErrLobbyStarted", err)
	}
}

func TestAMissingLobbyAndAMissingGameBecomeSentinels(t *testing.T) {
	store, _ := newTestStore(t)
	ctx := context.Background()

	if _, err := store.LobbyByCode(ctx, "FNOPE"); !errors.Is(err, ErrLobbyNotFound) {
		t.Errorf("LobbyByCode: err = %v, want ErrLobbyNotFound", err)
	}
	if _, err := store.WaitingLobbyByOwnerID(ctx, "nobody"); !errors.Is(err, ErrLobbyNotFound) {
		t.Errorf("WaitingLobbyByOwnerID: err = %v, want ErrLobbyNotFound", err)
	}
	if _, err := store.GameByID(ctx, uuid.New()); !errors.Is(err, ErrGameNotFound) {
		t.Errorf("GameByID: err = %v, want ErrGameNotFound", err)
	}
}

// The rematch slot is compare-and-set: only the first press gets to point the old room at
// the new one.
func TestOnlyOneRematchCodeCanBeClaimed(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	ctx := context.Background()

	claimed, err := store.SaveRematchCode(ctx, seeded.lobby.ID, "FNEXT")
	if err != nil || !claimed {
		t.Fatalf("first claim: claimed = %v, err = %v", claimed, err)
	}

	claimed, err = store.SaveRematchCode(ctx, seeded.lobby.ID, "FOTHR")
	if err != nil {
		t.Fatalf("second claim: %v", err)
	}
	if claimed {
		t.Fatal("a second rematch code was allowed to overwrite the first")
	}

	lobby, err := store.LobbyByCode(ctx, seeded.lobby.ID)
	if err != nil {
		t.Fatalf("read lobby: %v", err)
	}
	if lobby.RematchCode == nil || *lobby.RematchCode != "FNEXT" {
		t.Errorf("rematch code = %v, want FNEXT", lobby.RematchCode)
	}
}

// Only games this player is still at a table for, and only unfinished ones -- this feeds
// the reconnect list.
func TestGamesByUserIDIsOnlyThisPlayersUnfinishedGames(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	ctx := context.Background()

	games, err := store.GamesByUserID(ctx, seeded.players[1])
	if err != nil {
		t.Fatalf("games by user: %v", err)
	}
	if len(games) != 1 || games[0].ID != seeded.game.ID {
		t.Fatalf("got %d games, want the one seeded", len(games))
	}

	if games, err := store.GamesByUserID(ctx, "somebody-else"); err != nil || len(games) != 0 {
		t.Fatalf("a stranger got %d games, err = %v", len(games), err)
	}

	if err := store.AbandonGame(ctx, seeded.game.ID); err != nil {
		t.Fatalf("abandon: %v", err)
	}
	if games, err := store.GamesByUserID(ctx, seeded.players[1]); err != nil || len(games) != 0 {
		t.Fatalf("an abandoned game is still listed: %d games, err = %v", len(games), err)
	}
}

// A completed game is a scoreboard people are looking at, and abandoning is not a way to
// take it off them.
func TestAbandoningACompletedGameDoesNothing(t *testing.T) {
	store, db := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	ctx := context.Background()

	if err := db.Model(&FFMultiDeviceGame{}).Where("id = ?", seeded.game.ID).
		Update("status", GameCompleted).Error; err != nil {
		t.Fatalf("complete the game: %v", err)
	}

	if err := store.AbandonGame(ctx, seeded.game.ID); err != nil {
		t.Fatalf("abandon: %v", err)
	}

	game, err := store.GameByID(ctx, seeded.game.ID)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}
	if game.Status != GameCompleted {
		t.Errorf("status = %q, want %q", game.Status, GameCompleted)
	}
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

func TestTheSweepDeletesOldRoomsAndGamesAndLeavesFreshOnes(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	old := time.Now().UTC().Add(-48 * time.Hour)
	seeded := seedGame(t, store, GameModeFacts, old)
	writeEverything(t, store, seeded)

	cutoff := time.Now().UTC().Add(-time.Hour)

	deleted, err := store.DeleteGamesOlderThan(ctx, cutoff)
	if err != nil {
		t.Fatalf("delete games: %v", err)
	}
	if deleted != 1 {
		t.Errorf("deleted %d games, want 1", deleted)
	}

	deleted, err = store.DeleteLobbiesOlderThan(ctx, cutoff)
	if err != nil {
		t.Fatalf("delete lobbies: %v", err)
	}
	if deleted != 1 {
		t.Errorf("deleted %d lobbies, want 1", deleted)
	}

	// Deepest first means nothing is left behind pointing at a row that has gone.
	for name, model := range map[string]any{
		"options":       &FFOption{},
		"votes":         &FFVote{},
		"rounds":        &FFRound{},
		"game players":  &FFGamePlayer{},
		"lobby players": &FFLobbyPlayer{},
	} {
		var count int64
		if err := db.Model(model).Count(&count).Error; err != nil {
			t.Fatalf("count %s: %v", name, err)
		}
		if count != 0 {
			t.Errorf("%d %s survived the sweep", count, name)
		}
	}
}

func TestTheSweepLeavesGamesYoungerThanTheCutoff(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeFacts, time.Now().UTC())
	ctx := context.Background()

	cutoff := time.Now().UTC().Add(-time.Hour)

	if deleted, err := store.DeleteGamesOlderThan(ctx, cutoff); err != nil || deleted != 0 {
		t.Fatalf("deleted %d fresh games, err = %v", deleted, err)
	}
	if deleted, err := store.DeleteLobbiesOlderThan(ctx, cutoff); err != nil || deleted != 0 {
		t.Fatalf("deleted %d fresh lobbies, err = %v", deleted, err)
	}
	if _, err := store.GameByID(ctx, seeded.game.ID); err != nil {
		t.Fatalf("the fresh game is gone: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Fills round-trip through its own column
// ---------------------------------------------------------------------------

// Fills is a self-serialising column, so the thing worth checking is that what comes back
// out is what went in -- including a value with a quote in it, which is what a JSON column
// pretending to be a string is most likely to trip over.
func TestFillsSurviveTheDatabase(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeCreative, time.Now().UTC())
	round := seeded.game.Rounds[0]

	want := Fills{`a "quoted" thing`, "and a plain one"}

	if _, err := store.SaveAnswer(context.Background(), SaveAnswerInput{
		GameID: seeded.game.ID,
		Option: &FFOption{
			RoundID:   round.ID,
			AuthorID:  round.AuthorOneUserID,
			Fills:     want,
			Slot:      UnassignedSlot,
			CreatedAt: time.Now().UTC(),
		},
		Expected: AnswersFor(len(seeded.players)),
	}); err != nil {
		t.Fatalf("save answer: %v", err)
	}

	game, err := store.GameByID(context.Background(), seeded.game.ID)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}

	option := game.Rounds[0].Option(round.AuthorOneUserID)
	if option == nil {
		t.Fatal("the answer that was just written is not there")
	}
	if len(option.Fills) != len(want) {
		t.Fatalf("fills = %v, want %v", option.Fills, want)
	}
	for i := range want {
		if option.Fills[i] != want[i] {
			t.Errorf("fill %d = %q, want %q", i, option.Fills[i], want[i])
		}
	}
}

// A creative game has no truth row, which is what makes its rounds two options rather than
// three.
func TestACreativeGameHasNoTruthRow(t *testing.T) {
	store, _ := newTestStore(t)
	seeded := seedGame(t, store, GameModeCreative, time.Now().UTC())
	game := writeEverything(t, store, seeded)

	for _, round := range game.Rounds {
		if got := len(round.Options); got != OptionsPerRound(GameModeCreative) {
			t.Errorf("round %d has %d options, want %d", round.Number, got, OptionsPerRound(GameModeCreative))
		}
		if round.Option(TruthAuthorID) != nil {
			t.Errorf("round %d carries a truth in creative mode", round.Number)
		}
	}
}

// votersFor is everybody who did not write for a round, which is everybody who may vote
// on it.
func votersFor(t *testing.T, players []string, round FFRound) []string {
	t.Helper()

	var voters []string
	for _, player := range players {
		if !round.WrittenBy(player) {
			voters = append(voters, player)
		}
	}
	if len(voters) == 0 {
		t.Fatalf("round %d has no eligible voter among %v", round.Number, players)
	}
	return voters
}

// voterFor is the sole voter at a three-handed table, and fails if there is more than one
// -- a test that used it on a bigger table would be silently voting with one of several.
func voterFor(t *testing.T, players []string, round FFRound) string {
	t.Helper()

	voters := votersFor(t, players, round)
	if len(voters) != 1 {
		t.Fatalf("round %d has %d eligible voters, want exactly 1", round.Number, len(voters))
	}
	return voters[0]
}

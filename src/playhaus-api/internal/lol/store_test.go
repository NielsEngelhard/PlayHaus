package lol

import (
	"context"
	"errors"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/platform/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func newTestStore(t *testing.T) (*GormStore, *gorm.DB) {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open, so close
	// it explicitly before cleanup runs.
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

func insertGame(t *testing.T, db *gorm.DB, ownerID string, status GameStatus, createdAt time.Time) uuid.UUID {
	t.Helper()

	game := &SoloLeagueOfLettersGame{
		ID:           uuid.New(),
		OwnerID:      ownerID,
		Locale:       i18n.NL,
		WordLength:   5,
		CurrentRound: 1,
		Status:       status,
		CreatedAt:    createdAt,
	}

	if err := db.Create(game).Error; err != nil {
		t.Fatalf("insert game: %v", err)
	}

	return game.ID
}

// insertPlayedRound gives a game one round with one guess of one letter, so a
// delete has something at every level below the game to clean up.
func insertPlayedRound(t *testing.T, db *gorm.DB, gameID uuid.UUID) uuid.UUID {
	t.Helper()

	round := &LeagueOfLettersRound{
		ID:          uuid.New(),
		GameID:      gameID,
		RoundNumber: 1,
		Word:        "kaars",
		Guesses: []LeagueOfLettersGuess{{
			ID:          uuid.New(),
			OwnerID:     "owner",
			Word:        "kaars",
			GuessNumber: 1,
			Letters: []LeagueOfLettersValidatedLetter{{
				ID:       uuid.New(),
				Position: 0,
				Letter:   "k",
				Status:   LetterCorrect,
			}},
			CreatedAt: time.Now().UTC(),
		}},
	}

	if err := db.Create(round).Error; err != nil {
		t.Fatalf("insert round: %v", err)
	}

	return round.ID
}

func assertRowCount(t *testing.T, db *gorm.DB, table string, want int64) {
	t.Helper()

	var got int64
	if err := db.Table(table).Count(&got).Error; err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	if got != want {
		t.Errorf("%s has %d rows, want %d", table, got, want)
	}
}

// The list this feeds is the reconnect screen, so a game that is over must not
// be in it: its row would offer a way back into a finished board.
func TestGetSoloGamesByUserIdOnlyReturnsUnfinishedGames(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()

	older := insertGame(t, db, "owner", GameInProgress, now.Add(-2*time.Hour))
	newer := insertGame(t, db, "owner", GameInProgress, now.Add(-1*time.Hour))
	insertGame(t, db, "owner", GameCompleted, now)
	insertGame(t, db, "owner", GameAbandoned, now)
	insertGame(t, db, "somebody-else", GameInProgress, now)

	games, err := store.GetSoloGamesByUserId(context.Background(), "owner")
	if err != nil {
		t.Fatalf("get solo games: %v", err)
	}

	if len(games) != 2 {
		t.Fatalf("got %d games, want 2", len(games))
	}

	// Newest first, so the game most likely to be picked up again is at the top.
	if games[0].ID != newer || games[1].ID != older {
		t.Errorf("got order %v, %v; want %v, %v", games[0].ID, games[1].ID, newer, older)
	}
}

// Starting a game clears the player's other ones, whatever state they were in,
// and takes the rows hanging off them with it -- an orphaned round or guess
// would keep a deleted board's data around forever.
func TestDeleteSoloGamesByUserId(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()

	keep := insertGame(t, db, "owner", GameInProgress, now)
	inProgress := insertGame(t, db, "owner", GameInProgress, now.Add(-1*time.Hour))
	completed := insertGame(t, db, "owner", GameCompleted, now.Add(-2*time.Hour))
	other := insertGame(t, db, "somebody-else", GameInProgress, now)

	insertPlayedRound(t, db, inProgress)
	insertPlayedRound(t, db, completed)
	keptRound := insertPlayedRound(t, db, keep)
	otherRound := insertPlayedRound(t, db, other)

	if err := store.DeleteSoloGamesByUserId(context.Background(), "owner", keep); err != nil {
		t.Fatalf("delete solo games: %v", err)
	}

	var gameIDs []uuid.UUID
	if err := db.Model(&SoloLeagueOfLettersGame{}).Pluck("id", &gameIDs).Error; err != nil {
		t.Fatalf("read games: %v", err)
	}
	if len(gameIDs) != 2 {
		t.Fatalf("got %d games left, want 2 (%v)", len(gameIDs), gameIDs)
	}
	for _, want := range []uuid.UUID{keep, other} {
		if !slices.Contains(gameIDs, want) {
			t.Errorf("game %v was deleted, want it kept", want)
		}
	}

	assertRowCount(t, db, "lol_rounds", 2)
	assertRowCount(t, db, "lol_guesses", 2)
	assertRowCount(t, db, "lol_letters", 2)

	// And the rows that survived belong to the games that survived.
	var roundIDs []uuid.UUID
	if err := db.Model(&LeagueOfLettersRound{}).Pluck("id", &roundIDs).Error; err != nil {
		t.Fatalf("read rounds: %v", err)
	}
	for _, want := range []uuid.UUID{keptRound, otherRound} {
		if !slices.Contains(roundIDs, want) {
			t.Errorf("round %v was deleted, want it kept", want)
		}
	}
}

func TestDeleteSoloGamesByUserIdWithNothingToDelete(t *testing.T) {
	store, db := newTestStore(t)

	keep := insertGame(t, db, "owner", GameInProgress, time.Now().UTC())

	if err := store.DeleteSoloGamesByUserId(context.Background(), "owner", keep); err != nil {
		t.Fatalf("delete solo games: %v", err)
	}

	games, err := store.GetSoloGamesByUserId(context.Background(), "owner")
	if err != nil {
		t.Fatalf("get solo games: %v", err)
	}
	if len(games) != 1 || games[0].ID != keep {
		t.Fatalf("got %d games, want only %v", len(games), keep)
	}
}

// The retention sweep goes by age alone, whatever the game's status -- an
// in-progress game abandoned three days ago is exactly as stale as a finished one.
func TestDeleteSoloGamesOlderThanLeavesNewerGamesAlone(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()
	cutoff := now.Add(-72 * time.Hour)

	old := insertGame(t, db, "owner", GameInProgress, now.Add(-73*time.Hour))
	recent := insertGame(t, db, "owner", GameCompleted, now.Add(-1*time.Hour))

	oldRound := insertPlayedRound(t, db, old)
	insertPlayedRound(t, db, recent)

	deleted, err := store.DeleteSoloGamesOlderThan(context.Background(), cutoff)
	if err != nil {
		t.Fatalf("delete solo games older than cutoff: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("deleted = %d, want 1", deleted)
	}

	var gameIDs []uuid.UUID
	if err := db.Model(&SoloLeagueOfLettersGame{}).Pluck("id", &gameIDs).Error; err != nil {
		t.Fatalf("read games: %v", err)
	}
	if len(gameIDs) != 1 || gameIDs[0] != recent {
		t.Fatalf("games left = %v, want only %v", gameIDs, recent)
	}

	assertRowCount(t, db, "lol_rounds", 1)
	assertRowCount(t, db, "lol_guesses", 1)
	assertRowCount(t, db, "lol_letters", 1)

	var roundIDs []uuid.UUID
	if err := db.Model(&LeagueOfLettersRound{}).Pluck("id", &roundIDs).Error; err != nil {
		t.Fatalf("read rounds: %v", err)
	}
	if slices.Contains(roundIDs, oldRound) {
		t.Errorf("round %v from the old game survived", oldRound)
	}
}

func TestGetSoloGamesByUserIdWithNoGames(t *testing.T) {
	store, db := newTestStore(t)

	insertGame(t, db, "somebody-else", GameInProgress, time.Now().UTC())

	games, err := store.GetSoloGamesByUserId(context.Background(), "owner")
	if err != nil {
		t.Fatalf("get solo games: %v", err)
	}

	if len(games) != 0 {
		t.Fatalf("got %d games, want none", len(games))
	}
}

// The newest unfinished game, and nobody else's -- and with its board attached,
// because the screen it feeds draws the game straight from this.
func TestCurrentSoloGameByUserID(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()

	insertGame(t, db, "owner", GameInProgress, now.Add(-2*time.Hour))
	newer := insertGame(t, db, "owner", GameInProgress, now.Add(-1*time.Hour))
	insertGame(t, db, "owner", GameCompleted, now)
	insertGame(t, db, "somebody-else", GameInProgress, now)
	insertPlayedRound(t, db, newer)

	game, err := store.CurrentSoloGameByUserID(context.Background(), "owner")
	if err != nil {
		t.Fatalf("current solo game: %v", err)
	}
	if game.ID != newer {
		t.Errorf("id = %v, want %v", game.ID, newer)
	}
	if len(game.Rounds) != 1 {
		t.Fatalf("got %d rounds, want 1", len(game.Rounds))
	}
	if len(game.Rounds[0].Guesses) != 1 {
		t.Fatalf("got %d guesses, want 1", len(game.Rounds[0].Guesses))
	}
	if len(game.Rounds[0].Guesses[0].Letters) != 1 {
		t.Errorf("got %d letters, want 1", len(game.Rounds[0].Guesses[0].Letters))
	}
}

// A player between games is the ordinary case, and it has to be tellable from a
// query that went wrong.
func TestCurrentSoloGameByUserIDWithNothingRunning(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()

	insertGame(t, db, "owner", GameCompleted, now)
	insertGame(t, db, "owner", GameAbandoned, now)
	insertGame(t, db, "somebody-else", GameInProgress, now)

	_, err := store.CurrentSoloGameByUserID(context.Background(), "owner")
	if !errors.Is(err, ErrGameNotFound) {
		t.Errorf("err = %v, want %v", err, ErrGameNotFound)
	}
}

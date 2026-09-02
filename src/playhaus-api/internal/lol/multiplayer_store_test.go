package lol

import (
	"context"
	"testing"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func insertLobby(t *testing.T, db *gorm.DB, code, ownerID string, createdAt time.Time) {
	t.Helper()

	lobby := &MultiplayerLeagueOfLettersLobby{
		ID:             code,
		OwnerID:        ownerID,
		Locale:         i18n.NL,
		WordLength:     5,
		SecondsPerTurn: 35,
		Status:         LobbyWaiting,
		CreatedAt:      createdAt,
		Players: []MultiplayerLobbyPlayer{{
			LobbyID:  code,
			UserID:   ownerID,
			Seat:     0,
			JoinedAt: createdAt,
		}},
	}

	if err := db.Create(lobby).Error; err != nil {
		t.Fatalf("insert lobby: %v", err)
	}
}

func insertMultiplayerGame(t *testing.T, db *gorm.DB, ownerID string, createdAt time.Time) uuid.UUID {
	t.Helper()

	game := &MultiplayerLeagueOfLettersGame{
		ID:              uuid.New(),
		LobbyID:         "LZZZZ",
		OwnerID:         ownerID,
		Locale:          i18n.NL,
		WordLength:      5,
		CurrentRound:    1,
		TurnUserID:      ownerID,
		TurnEndsAt:      createdAt.Add(time.Minute),
		Status:          GameInProgress,
		CreatedAt:       createdAt,
		SecondsPerGuess: 35,
		Players: []MultiplayerGamePlayer{{
			UserID:    ownerID,
			TurnOrder: 0,
		}},
	}

	if err := db.Create(game).Error; err != nil {
		t.Fatalf("insert multiplayer game: %v", err)
	}

	return game.ID
}

// A room this old has nobody still walking through its door, whatever it was
// waiting on or playing.
func TestDeleteLobbiesOlderThanLeavesNewerLobbiesAlone(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()
	cutoff := now.Add(-time.Hour)

	insertLobby(t, db, "LOLD1", "owner", now.Add(-2*time.Hour))
	insertLobby(t, db, "LNEW1", "owner", now.Add(-1*time.Minute))

	deleted, err := store.DeleteLobbiesOlderThan(context.Background(), cutoff)
	if err != nil {
		t.Fatalf("delete lobbies older than cutoff: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("deleted = %d, want 1", deleted)
	}

	var codes []string
	if err := db.Model(&MultiplayerLeagueOfLettersLobby{}).Pluck("id", &codes).Error; err != nil {
		t.Fatalf("read lobbies: %v", err)
	}
	if len(codes) != 1 || codes[0] != "LNEW1" {
		t.Fatalf("lobbies left = %v, want only LNEW1", codes)
	}

	assertRowCount(t, db, "mp_lol_lobby_players", 1)
}

func TestDeleteMultiplayerGamesOlderThanLeavesNewerGamesAlone(t *testing.T) {
	store, db := newTestStore(t)
	now := time.Now().UTC()
	cutoff := now.Add(-time.Hour)

	old := insertMultiplayerGame(t, db, "owner", now.Add(-2*time.Hour))
	recent := insertMultiplayerGame(t, db, "owner", now.Add(-1*time.Minute))

	insertPlayedRound(t, db, old)
	insertPlayedRound(t, db, recent)

	deleted, err := store.DeleteMultiplayerGamesOlderThan(context.Background(), cutoff)
	if err != nil {
		t.Fatalf("delete multiplayer games older than cutoff: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("deleted = %d, want 1", deleted)
	}

	var gameIDs []uuid.UUID
	if err := db.Model(&MultiplayerLeagueOfLettersGame{}).Pluck("id", &gameIDs).Error; err != nil {
		t.Fatalf("read games: %v", err)
	}
	if len(gameIDs) != 1 || gameIDs[0] != recent {
		t.Fatalf("games left = %v, want only %v", gameIDs, recent)
	}

	assertRowCount(t, db, "mp_lol_game_players", 1)
	assertRowCount(t, db, "lol_rounds", 1)
}

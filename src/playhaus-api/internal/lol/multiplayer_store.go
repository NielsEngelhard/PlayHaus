package lol

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Compile-time check that the multiplayer half is implemented too.
var _ MultiplayerStore = (*GormStore)(nil)

// withRoster preloads a lobby's players in the order they arrived.
func withRoster(db *gorm.DB) *gorm.DB {
	return db.Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("seat ASC")
	})
}

// withTable preloads everything a multiplayer game is played on.
func withTable(db *gorm.DB) *gorm.DB {
	return withBoard(db).Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("turn_order ASC")
	})
}

func (s *GormStore) CreateLobby(ctx context.Context, lobby *MultiplayerLeagueOfLettersLobby) error {
	if err := s.db.WithContext(ctx).Create(lobby).Error; err != nil {
		return fmt.Errorf("insert lobby: %w", err)
	}
	return nil
}

func (s *GormStore) LobbyByCode(ctx context.Context, code string) (*MultiplayerLeagueOfLettersLobby, error) {
	var lobby MultiplayerLeagueOfLettersLobby

	err := withRoster(s.db.WithContext(ctx)).
		Where("id = ?", code).
		First(&lobby).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrLobbyNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select lobby: %w", err)
	}
	return &lobby, nil
}

// WaitingLobbyByOwnerID is the newest room this player opened that nobody has started yet, and nothing else.
func (s *GormStore) WaitingLobbyByOwnerID(ctx context.Context, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	var lobby MultiplayerLeagueOfLettersLobby

	err := withRoster(s.db.WithContext(ctx)).
		Where("owner_id = ? AND status = ?", userID, LobbyWaiting).
		Order("created_at DESC").
		First(&lobby).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrLobbyNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select waiting lobby by owner: %w", err)
	}
	return &lobby, nil
}

// AbandonMultiplayerGame ends a game for the whole table.
func (s *GormStore) AbandonMultiplayerGame(ctx context.Context, gameID uuid.UUID) error {
	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersGame{}).
		Where("id = ? AND status = ?", gameID, GameInProgress).
		Update("status", GameAbandoned).Error
	if err != nil {
		return fmt.Errorf("abandon multiplayer game: %w", err)
	}
	return nil
}

func (s *GormStore) LobbyCodeTaken(ctx context.Context, code string) (bool, error) {
	var count int64

	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersLobby{}).
		Where("id = ?", code).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count lobbies by code: %w", err)
	}

	return count > 0, nil
}

func (s *GormStore) AddLobbyPlayer(ctx context.Context, player *MultiplayerLobbyPlayer) error {
	if err := s.db.WithContext(ctx).Create(player).Error; err != nil {
		return fmt.Errorf("insert lobby player: %w", err)
	}
	return nil
}

func (s *GormStore) RemoveLobbyPlayer(ctx context.Context, code, userID string) error {
	err := s.db.WithContext(ctx).
		Where("lobby_id = ? AND user_id = ?", code, userID).
		Delete(&MultiplayerLobbyPlayer{}).Error
	if err != nil {
		return fmt.Errorf("delete lobby player: %w", err)
	}
	return nil
}

func (s *GormStore) SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error {
	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersLobby{}).
		Where("id = ?", code).
		Updates(map[string]any{
			"locale":           in.Locale,
			"word_length":      in.WordLength,
			"seconds_per_turn": in.SecondsPerTurn,
		}).Error
	if err != nil {
		return fmt.Errorf("update lobby settings: %w", err)
	}
	return nil
}

// SaveRematchCode points a finished room at the one its table moved on to.
func (s *GormStore) SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error) {
	res := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersLobby{}).
		Where("id = ? AND rematch_code IS NULL", code).
		Update("rematch_code", rematchCode)
	if res.Error != nil {
		return false, fmt.Errorf("update lobby rematch code: %w", res.Error)
	}

	return res.RowsAffected == 1, nil
}

// DeleteLobby drops the room and its seats.
func (s *GormStore) DeleteLobby(ctx context.Context, code string) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("lobby_id = ?", code).Delete(&MultiplayerLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		if err := tx.Where("id = ?", code).Delete(&MultiplayerLeagueOfLettersLobby{}).Error; err != nil {
			return fmt.Errorf("delete lobby: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete lobby: %w", err)
	}
	return nil
}

// DeleteLobbiesOlderThan drops rooms (and their seats) created before the cutoff, waiting or started.
func (s *GormStore) DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var codes []string
		// A tournament owns its rooms for as long as it lives, and releases them when it is swept.
		err := tx.Model(&MultiplayerLeagueOfLettersLobby{}).
			Where("created_at < ? AND tournament_id IS NULL", before).
			Pluck("id", &codes).Error
		if err != nil {
			return fmt.Errorf("select lobbies: %w", err)
		}
		if len(codes) == 0 {
			return nil
		}

		if err := tx.Where("lobby_id IN ?", codes).Delete(&MultiplayerLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		result := tx.Where("id IN ?", codes).Delete(&MultiplayerLeagueOfLettersLobby{})
		if result.Error != nil {
			return fmt.Errorf("delete lobbies: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("delete lobbies older than cutoff: %w", err)
	}
	return deleted, nil
}

// DeleteMultiplayerGamesOlderThan drops started games (and their boards and scoreboards) created before the cutoff.
func (s *GormStore) DeleteMultiplayerGamesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var gameIDs []uuid.UUID
		// Same again: a tournament match survives its age until the bracket lets it go.
		err := tx.Model(&MultiplayerLeagueOfLettersGame{}).
			Where("created_at < ? AND lobby_id NOT IN (?)", before,
				tx.Model(&MultiplayerLeagueOfLettersLobby{}).Select("id").Where("tournament_id IS NOT NULL")).
			Pluck("id", &gameIDs).Error
		if err != nil {
			return fmt.Errorf("select games: %w", err)
		}
		if len(gameIDs) == 0 {
			return nil
		}

		var roundIDs []uuid.UUID
		err = tx.Model(&LeagueOfLettersRound{}).
			Where("game_id IN ?", gameIDs).
			Pluck("id", &roundIDs).Error
		if err != nil {
			return fmt.Errorf("select rounds: %w", err)
		}

		var guessIDs []uuid.UUID
		if len(roundIDs) > 0 {
			err = tx.Model(&LeagueOfLettersGuess{}).
				Where("round_id IN ?", roundIDs).
				Pluck("id", &guessIDs).Error
			if err != nil {
				return fmt.Errorf("select guesses: %w", err)
			}
		}

		// Deepest first, so no row is ever orphaned mid-transaction.
		if len(guessIDs) > 0 {
			if err := tx.Where("guess_id IN ?", guessIDs).Delete(&LeagueOfLettersValidatedLetter{}).Error; err != nil {
				return fmt.Errorf("delete letters: %w", err)
			}
			if err := tx.Where("id IN ?", guessIDs).Delete(&LeagueOfLettersGuess{}).Error; err != nil {
				return fmt.Errorf("delete guesses: %w", err)
			}
		}
		if len(roundIDs) > 0 {
			if err := tx.Where("id IN ?", roundIDs).Delete(&LeagueOfLettersRound{}).Error; err != nil {
				return fmt.Errorf("delete rounds: %w", err)
			}
		}
		if err := tx.Where("game_id IN ?", gameIDs).Delete(&MultiplayerGamePlayer{}).Error; err != nil {
			return fmt.Errorf("delete game players: %w", err)
		}
		result := tx.Where("id IN ?", gameIDs).Delete(&MultiplayerLeagueOfLettersGame{})
		if result.Error != nil {
			return fmt.Errorf("delete games: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("delete multiplayer games older than cutoff: %w", err)
	}
	return deleted, nil
}

// StartLobby writes the game and points the lobby at it, together.
func (s *GormStore) StartLobby(ctx context.Context, lobby *MultiplayerLeagueOfLettersLobby, game *MultiplayerLeagueOfLettersGame) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the rounds and the scoreboard through their associations.
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("insert multiplayer game: %w", err)
		}

		// Named columns rather than Save: the lobby was loaded with its players preloaded.
		res := tx.Model(&MultiplayerLeagueOfLettersLobby{}).
			Where("id = ? AND status = ?", lobby.ID, LobbyWaiting).
			Updates(map[string]any{"status": LobbyStarted, "game_id": game.ID})
		if res.Error != nil {
			return fmt.Errorf("mark lobby started: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			// Somebody else started it between the read and here.
			return ErrLobbyStarted
		}

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (s *GormStore) MultiplayerGameByID(ctx context.Context, id uuid.UUID) (*MultiplayerLeagueOfLettersGame, error) {
	var game MultiplayerLeagueOfLettersGame

	err := withTable(s.db.WithContext(ctx)).
		Where("id = ?", id).
		First(&game).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select multiplayer game: %w", err)
	}
	return &game, nil
}

// MultiplayerGamesByUserID is every unfinished game this player has a seat at.
func (s *GormStore) MultiplayerGamesByUserID(ctx context.Context, userID string) ([]*MultiplayerLeagueOfLettersGame, error) {
	var games []*MultiplayerLeagueOfLettersGame

	err := s.db.WithContext(ctx).
		Joins("JOIN mp_lol_game_players ON mp_lol_game_players.game_id = mp_lol_games.id").
		Where("mp_lol_game_players.user_id = ? AND mp_lol_games.status = ?", userID, GameInProgress).
		Order("mp_lol_games.created_at DESC").
		Find(&games).Error
	if err != nil {
		return nil, fmt.Errorf("select multiplayer games for user: %w", err)
	}

	return games, nil
}

// RecordMultiplayerGuess writes one row and the game state it moved.
func (s *GormStore) RecordMultiplayerGuess(ctx context.Context, in RecordMultiplayerGuessInput) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&MultiplayerLeagueOfLettersGame{}).
			Where("id = ? AND turn_user_id = ? AND current_round = ? AND status = ?",
				in.Game.ID, in.ExpectTurnUserID, in.ExpectRound, GameInProgress).
			Updates(map[string]any{
				"turn_user_id":  in.Game.TurnUserID,
				"turn_ends_at":  in.Game.TurnEndsAt,
				"current_round": in.Game.CurrentRound,
				"status":        in.Game.Status,
			})
		if res.Error != nil {
			return fmt.Errorf("update multiplayer game: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return ErrNotYourTurn
		}

		// Creates the letters too, through the association.
		if err := tx.Create(in.Guess).Error; err != nil {
			return fmt.Errorf("insert guess: %w", err)
		}

		if in.ScoreFor != "" && in.Score != 0 {
			err := tx.Model(&MultiplayerGamePlayer{}).
				Where("game_id = ? AND user_id = ?", in.Game.ID, in.ScoreFor).
				UpdateColumn("score", gorm.Expr("score + ?", in.Score)).Error
			if err != nil {
				return fmt.Errorf("add score: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

// RestartTurn gives the current player their clock back.
func (s *GormStore) RestartTurn(ctx context.Context, gameID uuid.UUID, expectTurnUserID string, endsAt time.Time) error {
	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersGame{}).
		Where("id = ? AND turn_user_id = ? AND status = ?", gameID, expectTurnUserID, GameInProgress).
		Update("turn_ends_at", endsAt).Error
	if err != nil {
		return fmt.Errorf("restart turn: %w", err)
	}
	return nil
}

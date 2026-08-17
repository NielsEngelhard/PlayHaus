package league_of_letters

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

// Compile-time check that we satisfy the interface.
var _ Store = (*GormStore)(nil)

func (s *GormStore) CreateSoloGame(ctx context.Context, g *SoloLeagueOfLettersGame) error {
	err := s.db.WithContext(ctx).Create(g).Error
	if err != nil {
		return fmt.Errorf("insert solo league of letters game: %w", err)
	}
	return nil
}

// withBoard preloads the whole tree a game is played on, each level in the order
// it is played in, so a caller never has to sort it back afterwards.
func withBoard(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Rounds", func(db *gorm.DB) *gorm.DB {
			return db.Order("round_number ASC")
		}).
		Preload("Rounds.Guesses", func(db *gorm.DB) *gorm.DB {
			return db.Order("guess_number ASC")
		}).
		Preload("Rounds.Guesses.Letters", func(db *gorm.DB) *gorm.DB {
			return db.Order("position ASC")
		})
}

func (s *GormStore) DeleteSoloGameByID(ctx context.Context, soloGameID string, userID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", soloGameID, userID).
		Delete(&SoloLeagueOfLettersGame{})

	if result.Error != nil {
		return fmt.Errorf("delete solo league of letters game: %w", result.Error)
	}

	return nil
}

func (s *GormStore) SoloGameByID(ctx context.Context, id uuid.UUID) (*SoloLeagueOfLettersGame, error) {
	var game SoloLeagueOfLettersGame

	err := withBoard(s.db.WithContext(ctx)).
		Where("id = ?", id).
		First(&game).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select solo league of letters game: %w", err)
	}
	return &game, nil
}

func (s *GormStore) CurrentSoloGameByUserID(ctx context.Context, userID string) (*SoloLeagueOfLettersGame, error) {
	var game SoloLeagueOfLettersGame

	err := withBoard(s.db.WithContext(ctx)).
		Where("owner_id = ? AND status = ?", userID, GameInProgress).
		Order("created_at DESC").
		First(&game).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select current solo league of letters game: %w", err)
	}
	return &game, nil
}

func (s *GormStore) GetSoloGamesByUserId(ctx context.Context, userID string) ([]*SoloLeagueOfLettersGame, error) {
	var games []*SoloLeagueOfLettersGame

	err := s.db.WithContext(ctx).
		Where("owner_id = ? AND status = ?", userID, GameInProgress).
		Order("created_at DESC").
		Find(&games).Error

	if err != nil {
		return nil, err
	}

	return games, nil
}

func (s *GormStore) DeleteSoloGamesByUserId(ctx context.Context, userID string, except uuid.UUID) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var gameIDs []uuid.UUID
		err := tx.Model(&SoloLeagueOfLettersGame{}).
			Where("owner_id = ? AND id <> ?", userID, except).
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
		if err := tx.Where("id IN ?", gameIDs).Delete(&SoloLeagueOfLettersGame{}).Error; err != nil {
			return fmt.Errorf("delete games: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("delete solo games for user: %w", err)
	}
	return nil
}

// RecordGuess stores a guess and the game state it moved.
func (s *GormStore) RecordGuess(ctx context.Context, guess *LeagueOfLettersGuess, game *SoloLeagueOfLettersGame) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the letters too, through the association.
		if err := tx.Create(guess).Error; err != nil {
			return fmt.Errorf("insert guess: %w", err)
		}

		// Named columns rather than Save: the game was loaded with its rounds
		// preloaded, and saving the struct whole would write the whole tree back.
		err := tx.Model(&SoloLeagueOfLettersGame{}).
			Where("id = ?", game.ID).
			Updates(map[string]any{
				"current_round": game.CurrentRound,
				"status":        game.Status,
				"score":         game.Score,
			}).Error
		if err != nil {
			return fmt.Errorf("update game: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("record guess: %w", err)
	}
	return nil
}

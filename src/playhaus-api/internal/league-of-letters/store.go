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

func (s *GormStore) SoloGameByID(ctx context.Context, id uuid.UUID) (*SoloLeagueOfLettersGame, error) {
	var game SoloLeagueOfLettersGame

	err := s.db.WithContext(ctx).
		Preload("Rounds", func(db *gorm.DB) *gorm.DB {
			return db.Order("round_number ASC")
		}).
		Preload("Rounds.Guesses", func(db *gorm.DB) *gorm.DB {
			return db.Order("guess_number ASC")
		}).
		Preload("Rounds.Guesses.Letters", func(db *gorm.DB) *gorm.DB {
			return db.Order("position ASC")
		}).
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

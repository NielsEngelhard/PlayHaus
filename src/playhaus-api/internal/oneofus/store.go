package oneofus

import (
	"context"
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

var _ Store = (*GormStore)(nil)

func (s GormStore) CreateOneDeviceGame(ctx context.Context, game *OneOfUsSingleDeviceGame) error {
	if err := s.db.WithContext(ctx).Create(game).Error; err != nil {
		return fmt.Errorf("insert OneOfUsSingleDeviceGame: %w", err)
	}

	return nil
}

func (s GormStore) GetOneDeviceGame(ctx context.Context, ownerID string, gameID uuid.UUID) (OneOfUsSingleDeviceGame, error) {
	var game OneOfUsSingleDeviceGame

	if err := s.db.WithContext(ctx).
		Where("id = ? AND owner_id = ?", gameID, ownerID).
		First(&game).Error; err != nil {
		return OneOfUsSingleDeviceGame{}, fmt.Errorf(
			"get OneOfUsSingleDeviceGame: %w",
			err,
		)
	}

	return game, nil
}

func (s GormStore) GetOneDeviceGamePlayers(ctx context.Context, ownerID string, gameID uuid.UUID) ([]OneOfUsLocalPlayer, error) {
	var players []OneOfUsLocalPlayer

	// First make sure the game belongs to the owner.
	var game OneOfUsSingleDeviceGame
	if err := s.db.WithContext(ctx).
		Where("id = ? AND owner_id = ?", gameID, ownerID).
		First(&game).Error; err != nil {
		return nil, fmt.Errorf(
			"get OneOfUsSingleDeviceGame: %w",
			err,
		)
	}

	if err := s.db.WithContext(ctx).
		Where("session_id = ?", gameID).
		Find(&players).Error; err != nil {
		return nil, fmt.Errorf(
			"get OneOfUsLocalPlayers: %w",
			err,
		)
	}

	return players, nil
}

func (s GormStore) VoteOutPlayerOneDeviceGame(ctx context.Context, playerID uuid.UUID) error {
	result := s.db.WithContext(ctx).
		Model(&OneOfUsLocalPlayer{}).
		Where("player_id = ?", playerID).
		Update("is_voted_out", true)

	if result.Error != nil {
		return fmt.Errorf("vote out OneOfUsLocalPlayer: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("player %s not found", playerID)
	}

	return nil
}

func (s GormStore) RemoveOneDeviceGame(ctx context.Context, gameID uuid.UUID) error {
	result := s.db.WithContext(ctx).Delete(&OneOfUsSingleDeviceGame{}, "id = ?", gameID)

	if result.Error != nil {
		return fmt.Errorf("remove OneOfUsSingleDeviceGame: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("game %s not found", gameID)
	}

	return nil
}

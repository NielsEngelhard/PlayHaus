package oneofus

import (
	"context"
	"fmt"
	"time"

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

	// Preloaded, because the players are the game as far as the app is concerned --
	// without them the reconnect endpoint answers with a word pair and "players": null,
	// which is a game nobody can carry on playing.
	if err := s.db.WithContext(ctx).
		Preload("Players").
		Where("id = ? AND owner_id = ?", gameID, ownerID).
		First(&game).Error; err != nil {
		return OneOfUsSingleDeviceGame{}, fmt.Errorf(
			"get OneOfUsSingleDeviceGame: %w",
			err,
		)
	}

	return game, nil
}

func (s GormStore) GetOneDeviceGames(ctx context.Context, ownerID string) ([]*OneOfUsSingleDeviceGame, error) {
	var games []*OneOfUsSingleDeviceGame

	if err := s.db.WithContext(ctx).
		Preload("Players").
		Where("owner_id = ?", ownerID).
		Find(&games).Error; err != nil {
		return nil, fmt.Errorf(
			"get OneOfUsSingleDeviceGame: %w",
			err,
		)
	}

	return games, nil
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

// FinishOneDeviceGame stamps how a game ended.
//
// This replaced a hard delete. Deleting meant the row went the instant a side won, so
// the reconnect endpoint 404'd on a game that had just finished -- and the results
// screen is exactly the one a table comes back to.
func (s GormStore) FinishOneDeviceGame(ctx context.Context, gameID uuid.UUID, civiliansWon bool) error {
	now := time.Now().UTC()

	result := s.db.WithContext(ctx).
		Model(&OneOfUsSingleDeviceGame{}).
		Where("id = ?", gameID).
		Updates(map[string]any{
			"finished_at":   &now,
			"civilians_won": &civiliansWon,
		})

	if result.Error != nil {
		return fmt.Errorf("finish OneOfUsSingleDeviceGame: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("game %s not found", gameID)
	}

	return nil
}

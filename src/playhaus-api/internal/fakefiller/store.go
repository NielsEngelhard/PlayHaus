package fakefiller

import (
	"context"
	"fmt"

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

func (s *GormStore) LobbyCodeTaken(ctx context.Context, code string) (bool, error) {
	var count int64

	err := s.db.WithContext(ctx).
		Model(&FFLobby{}).
		Where("id = ?", code).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count lobbies by code: %w", err)
	}

	return count > 0, nil
}

func (s *GormStore) CreateLobby(ctx context.Context, lobby *FFLobby) error {
	if err := s.db.WithContext(ctx).Create(lobby).Error; err != nil {
		return fmt.Errorf("insert lobby: %w", err)
	}
	return nil
}

func (s *GormStore) StartLobby(ctx context.Context, lobby *FFLobby, game *FFMultiDeviceGame) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the rounds and the scoreboard through their associations.
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("insert multiplayer game: %w", err)
		}

		// Named columns rather than Save: the lobby was loaded with its players
		// preloaded, and saving it whole would write the roster back too.
		res := tx.Model(&FFLobby{}).
			Where("id = ?", lobby.ID).
			Updates(map[string]any{"game_id": game.ID})
		if res.Error != nil {
			return fmt.Errorf("Start ff lobby: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return fmt.Errorf("Start ff lobby 0 rows affected: %w", res.Error)
		}

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (s *GormStore) AddLobbyPlayer(ctx context.Context, player *FFPlayer) error {
	if err := s.db.WithContext(ctx).Create(player).Error; err != nil {
		return fmt.Errorf("insert FFplayer in FFLobby: %w", err)
	}
	return nil
}

func (s *GormStore) RemoveLobbyPlayer(ctx context.Context, code, userID string) error {
	err := s.db.WithContext(ctx).
		Where("lobby_id = ? AND user_id = ?", code, userID).
		Delete(&FFPlayer{}).Error
	if err != nil {
		return fmt.Errorf("delete FFPlayer from FFLobby : %w", err)
	}
	return nil
}

package oneofus

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

type GormStore struct {
	db *gorm.DB
}

func (s GormStore) CreateOneDeviceGame(ctx context.Context, game *OneOfUsSingleDeviceGame) error {
	if err := s.db.WithContext(ctx).Create(game).Error; err != nil {
		return fmt.Errorf("insert OneOfUsSingleDeviceGame: %w", err)
	}
	return nil
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

// Compile-time check that we satisfy the interface.
var _ Store = (*GormStore)(nil)

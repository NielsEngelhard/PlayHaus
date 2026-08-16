package league_of_letters

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

func (s *GormStore) CreateSoloGame(ctx context.Context, g *SoloLeagueOfLettersGame) error {
	err := s.db.WithContext(ctx).Create(g).Error
	if err != nil {
		return fmt.Errorf("insert solo league of letters game: %w", err)
	}
	return nil
}

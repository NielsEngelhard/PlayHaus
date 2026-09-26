package gamestats

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

var _ Store = (*GormStore)(nil)

// Increment is one atomic upsert, so it holds under concurrent starts and without the seeded row.
func (s *GormStore) Increment(ctx context.Context, counter Counter) error {
	col := string(counter)
	query := fmt.Sprintf(
		`INSERT INTO games_played_aggregated_data (id, %[1]s) VALUES (?, 1)
		ON CONFLICT (id) DO UPDATE SET %[1]s = games_played_aggregated_data.%[1]s + 1`, col)
	if err := s.db.WithContext(ctx).Exec(query, rowID).Error; err != nil {
		return fmt.Errorf("increment %s: %w", col, err)
	}
	return nil
}

func (s *GormStore) Totals(ctx context.Context) (*GamesPlayed, error) {
	var row GamesPlayed
	err := s.db.WithContext(ctx).First(&row, rowID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &GamesPlayed{ID: rowID}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read games played: %w", err)
	}
	return &row, nil
}

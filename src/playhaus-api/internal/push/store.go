package push

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

// Compile-time check that we satisfy the interface.
var _ Store = (*GormStore)(nil)

// Upsert re-points a token at whoever is signed in on that device now, which is what a shared phone needs.
func (s *GormStore) Upsert(ctx context.Context, token *DeviceToken) error {
	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "token"}},
			DoUpdates: clause.AssignmentColumns([]string{"user_id", "platform", "updated_at"}),
		}).
		Create(token).Error
	if err != nil {
		return fmt.Errorf("upsert device token: %w", err)
	}
	return nil
}

func (s *GormStore) ByUserID(ctx context.Context, userID string) ([]DeviceToken, error) {
	var rows []DeviceToken
	if err := s.db.WithContext(ctx).Where("user_id = ?", userID).Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list device tokens: %w", err)
	}
	return rows, nil
}

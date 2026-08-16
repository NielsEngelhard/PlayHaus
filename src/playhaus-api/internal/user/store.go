package user

import (
	"context"
	"errors"
	"fmt"
	"strings"

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

// UpdateUsername writes the display name. The column is "name" -- what the app
// calls a username is User.Name, and there is no separate username column.
func (s *GormStore) UpdateUsername(ctx context.Context, username string, userId string) error {
	result := s.db.WithContext(ctx).
		Model(&User{}).
		Where("id = ?", userId).
		Update("name", username)

	if result.Error != nil {
		return fmt.Errorf("update username: %w", result.Error)
	}
	// No row matched, so there is no such user. A row that matched but held this
	// name already still counts as updated -- gorm reports it as affected.
	if result.RowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *GormStore) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&User{}).
		Where("email = ?", email).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count users by email: %w", err)
	}
	return count > 0, nil
}

func (s *GormStore) Create(ctx context.Context, u *User) error {
	err := s.db.WithContext(ctx).Create(u).Error
	if isUniqueViolation(err) {
		return ErrEmailTaken
	}
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (s *GormStore) ByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := s.db.WithContext(ctx).Where("email = ?", email).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select user by email: %w", err)
	}
	return &u, nil
}

func (s *GormStore) ByID(ctx context.Context, id string) (*User, error) {
	var u User
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select user by id: %w", err)
	}
	return &u, nil
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	// Fallback: driver-level message, in case TranslateError misses it.
	return strings.Contains(err.Error(), "UNIQUE constraint failed")
}

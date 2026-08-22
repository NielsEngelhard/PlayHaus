package user

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"playhaus-api/internal/i18n"

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

// UpgradeToFullAccount gives a guest row the email and password that make it a
// real account, and clears the guest flag in the same write.
//
// A map rather than `Updates(User{...})`, and that is the whole point of it: gorm
// skips a struct's zero values, so `IsGuest: false` -- the one column that decides
// whether this ever stops being a guest -- would be silently dropped.
func (s *GormStore) UpgradeToFullAccount(ctx context.Context, userId string, email string, hashedPassword *string) error {
	result := s.db.WithContext(ctx).
		Model(&User{}).
		Where("id = ?", userId).
		Updates(map[string]any{
			"email":         email,
			"password_hash": hashedPassword,
			"is_guest":      false,
		})

	if result.Error != nil {
		return fmt.Errorf("update %s: %w", "email, password & guest flag", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *GormStore) updateColumn(ctx context.Context, userId string, column string, value any) error {
	result := s.db.WithContext(ctx).
		Model(&User{}).
		Where("id = ?", userId).
		Update(column, value)

	if result.Error != nil {
		return fmt.Errorf("update %s: %w", column, result.Error)
	}
	// No row matched, so there is no such user. A row that matched but held this
	// value already still counts as updated -- gorm reports it as affected.
	if result.RowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *GormStore) UpdateUsername(ctx context.Context, username string, userId string) error {
	return s.updateColumn(ctx, userId, "name", username)
}

func (s *GormStore) UpdateColor(ctx context.Context, color string, userId string) error {
	return s.updateColumn(ctx, userId, "color", color)
}
func (s *GormStore) UpdateLocale(ctx context.Context, locale i18n.Locale, userId string) error {
	return s.updateColumn(ctx, userId, "locale", locale)
}

func (s *GormStore) UpdateEnableSounds(ctx context.Context, enabled bool, userId string) error {
	return s.updateColumn(ctx, userId, "enable_sounds", enabled)
}

func (s *GormStore) UpdateEnableMusic(ctx context.Context, enabled bool, userId string) error {
	return s.updateColumn(ctx, userId, "enable_music", enabled)
}

func (s *GormStore) UpdateEnableVibration(ctx context.Context, enabled bool, userId string) error {
	return s.updateColumn(ctx, userId, "enable_vibration", enabled)
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

// ByIDs reads several accounts at once.
func (s *GormStore) ByIDs(ctx context.Context, ids []string) ([]*User, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	var users []*User
	if err := s.db.WithContext(ctx).Where("id IN ?", ids).Find(&users).Error; err != nil {
		return nil, fmt.Errorf("select users by id: %w", err)
	}
	return users, nil
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

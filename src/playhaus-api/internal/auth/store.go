package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

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

func (s *GormStore) Create(ctx context.Context, session *Session) error {
	if err := s.db.WithContext(ctx).Create(session).Error; err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

func (s *GormStore) ByTokenHash(ctx context.Context, tokenHash string) (*Session, error) {
	var session Session
	err := s.db.WithContext(ctx).Where("token_hash = ?", tokenHash).First(&session).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select session: %w", err)
	}
	return &session, nil
}

// DeleteByTokenHash is a hard delete -- Session has no DeletedAt, so the row is
// really gone and a leaked token cannot be revived.
func (s *GormStore) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	err := s.db.WithContext(ctx).Where("token_hash = ?", tokenHash).Delete(&Session{}).Error
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// DeleteExpired removes sessions past their expiry and reports how many went.
func (s *GormStore) DeleteExpired(ctx context.Context, before time.Time) (int64, error) {
	res := s.db.WithContext(ctx).Where("expires_at < ?", before).Delete(&Session{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete expired sessions: %w", res.Error)
	}
	return res.RowsAffected, nil
}

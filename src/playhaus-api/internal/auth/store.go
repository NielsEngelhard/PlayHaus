package auth

import (
	"context"
	"errors"
	"time"

	"playhausapi/internal/database"

	"gorm.io/gorm"
)

// ErrNotFound means no session matched.
var ErrNotFound = errors.New("auth: session not found")

// Store is every SQL statement about sessions.
type Store struct{ db *database.DB }

func NewStore(db *database.DB) *Store { return &Store{db: db} }

func (s *Store) Create(ctx context.Context, session *Session) error {
	return translate(s.db.Write.WithContext(ctx).Create(session).Error)
}

func (s *Store) ByTokenHash(ctx context.Context, tokenHash string) (Session, error) {
	var session Session
	err := s.db.Read.WithContext(ctx).Where("token_hash = ?", tokenHash).First(&session).Error
	if err != nil {
		return Session{}, translate(err)
	}
	return session, nil
}

// DeleteByTokenHash is a hard delete: Session has no DeletedAt, so the row is
// really gone and a leaked token cannot be revived.
func (s *Store) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	return translate(s.db.Write.WithContext(ctx).
		Where("token_hash = ?", tokenHash).
		Delete(&Session{}).Error)
}

func (s *Store) DeleteByID(ctx context.Context, id string) error {
	return translate(s.db.Write.WithContext(ctx).Delete(&Session{}, "id = ?", id).Error)
}

// DeleteExpired removes sessions past their expiry and reports how many went.
func (s *Store) DeleteExpired(ctx context.Context, before time.Time) (int64, error) {
	res := s.db.Write.WithContext(ctx).Where("expires_at < ?", before).Delete(&Session{})
	return res.RowsAffected, translate(res.Error)
}

func translate(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	return err
}

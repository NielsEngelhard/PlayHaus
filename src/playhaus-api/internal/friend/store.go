package friend

import (
	"context"
	"fmt"
	"time"

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

// Link writes both directions of every pair in one statement, so a half-pair is impossible.
// DoNothing rather than an upsert: an existing row's CreatedAt is when they first played together.
func (s *GormStore) Link(ctx context.Context, rows []Friendship) error {
	if len(rows) == 0 {
		return nil
	}

	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(rows).Error
	if err != nil {
		return fmt.Errorf("insert friendships: %w", err)
	}
	return nil
}

func (s *GormStore) List(ctx context.Context, userID string) ([]Friendship, error) {
	var rows []Friendship
	err := s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC, friend_id ASC").
		Find(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("list friendships: %w", err)
	}
	return rows, nil
}

func (s *GormStore) AreFriends(ctx context.Context, userID, friendID string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&Friendship{}).
		Where("user_id = ? AND friend_id = ?", userID, friendID).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count friendship: %w", err)
	}
	return count > 0, nil
}

func (s *GormStore) CreateInvite(ctx context.Context, invite *Invite) error {
	if err := s.db.WithContext(ctx).Create(invite).Error; err != nil {
		return fmt.Errorf("insert invite: %w", err)
	}
	return nil
}

func (s *GormStore) Pending(ctx context.Context, userID string, now time.Time) ([]Invite, error) {
	var rows []Invite
	err := s.db.WithContext(ctx).
		Where("to_user_id = ? AND status = ? AND expires_at > ?", userID, InvitePending, now).
		Order("created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("list invites: %w", err)
	}
	return rows, nil
}

// MarkSeen is scoped to the recipient, so an id guessed from somewhere else touches nothing.
func (s *GormStore) MarkSeen(ctx context.Context, userID string, ids []string) error {
	err := s.db.WithContext(ctx).
		Model(&Invite{}).
		Where("to_user_id = ? AND id IN ?", userID, ids).
		Update("status", InviteSeen).Error
	if err != nil {
		return fmt.Errorf("mark invites seen: %w", err)
	}
	return nil
}

func (s *GormStore) DeleteExpired(ctx context.Context, before time.Time) error {
	err := s.db.WithContext(ctx).
		Where("expires_at <= ?", before).
		Delete(&Invite{}).Error
	if err != nil {
		return fmt.Errorf("delete expired invites: %w", err)
	}
	return nil
}

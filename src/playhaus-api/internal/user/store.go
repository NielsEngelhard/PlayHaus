package user

import (
	"context"
	"errors"

	"playhausapi/internal/database"

	"gorm.io/gorm"
)

var (
	// ErrNotFound means no account matched.
	ErrNotFound = errors.New("user: not found")

	// ErrEmailTaken means the email is already on another account.
	ErrEmailTaken = errors.New("user: email already in use")
)

// Store is every SQL statement about accounts. The auth package borrows it
// rather than writing its own, so there is exactly one definition of how an
// account is looked up.
type Store struct{ db *database.DB }

func NewStore(db *database.DB) *Store { return &Store{db: db} }

func (s *Store) Create(ctx context.Context, u *AppUser) error {
	return translate(s.db.Write.WithContext(ctx).Create(u).Error)
}

func (s *Store) ByID(ctx context.Context, id string) (AppUser, error) {
	var u AppUser
	if err := s.db.Read.WithContext(ctx).Where("id = ?", id).First(&u).Error; err != nil {
		return AppUser{}, translate(err)
	}
	return u, nil
}

// ByEmail looks an account up by email. The caller is expected to have run the
// address through NormalizeEmail first — addresses are stored normalized, so a
// raw one would simply fail to match.
func (s *Store) ByEmail(ctx context.Context, email string) (AppUser, error) {
	var u AppUser
	if err := s.db.Read.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		return AppUser{}, translate(err)
	}
	return u, nil
}

// UpdateProfile writes the given columns. A map rather than a struct because
// GORM's struct updates skip zero values, so switching a preference off would
// silently do nothing.
func (s *Store) UpdateProfile(ctx context.Context, id string, changes map[string]any) error {
	if len(changes) == 0 {
		return nil
	}

	return translate(s.db.Write.WithContext(ctx).
		Model(&AppUser{}).
		Where("id = ?", id).
		Updates(changes).Error)
}

// List returns a page of accounts, oldest first. Ordered by a stable column so
// paging cannot show the same account twice.
func (s *Store) List(ctx context.Context, limit, offset int) ([]AppUser, error) {
	users := []AppUser{}

	err := s.db.Read.WithContext(ctx).
		Order("created_at, id").
		Limit(limit).
		Offset(offset).
		Find(&users).Error
	if err != nil {
		return nil, translate(err)
	}

	return users, nil
}

func translate(err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, gorm.ErrRecordNotFound):
		return ErrNotFound
	case errors.Is(err, gorm.ErrDuplicatedKey):
		// Email is the only unique column on this table.
		return ErrEmailTaken
	default:
		return err
	}
}

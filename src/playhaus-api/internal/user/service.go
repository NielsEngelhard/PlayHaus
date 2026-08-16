package user

import (
	"context"
	"fmt"
	"strings"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Store interface {
	Create(ctx context.Context, user *User) error
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	ByEmail(ctx context.Context, email string) (*User, error)
	ByID(ctx context.Context, id string) (*User, error)
	UpdateUsername(ctx context.Context, username string, userId string) error
	UpdateColor(ctx context.Context, color string, userId string) error
	UpdateEnableSounds(ctx context.Context, enabled bool, userId string) error
	UpdateEnableMusic(ctx context.Context, enabled bool, userId string) error
	UpdateEnableVibration(ctx context.Context, enabled bool, userId string) error
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

type CreateUserInput struct {
	Email, Name, Password string
	Locale                i18n.Locale
}

type CreateGuestUserInput struct {
	Locale i18n.Locale
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func (s *Service) ByID(ctx context.Context, id string) (*User, error) {
	return s.store.ByID(ctx, id)
}

func (s *Service) ByEmail(ctx context.Context, email string) (*User, error) {
	return s.store.ByEmail(ctx, NormalizeEmail(email))
}

// UpdateUsername renames an account. The name is stored trimmed, so the padding
// a mobile keyboard adds never becomes part of what other players see.
func (s *Service) UpdateUsername(ctx context.Context, username string, userId string) error {
	return s.store.UpdateUsername(ctx, strings.TrimSpace(username), userId)
}

func (s *Service) UpdateColor(ctx context.Context, color string, userId string) error {
	return s.store.UpdateColor(ctx, color, userId)
}

func (s *Service) UpdateEnableSounds(ctx context.Context, enabled bool, userId string) error {
	return s.store.UpdateEnableSounds(ctx, enabled, userId)
}

func (s *Service) UpdateEnableMusic(ctx context.Context, enabled bool, userId string) error {
	return s.store.UpdateEnableMusic(ctx, enabled, userId)
}

func (s *Service) UpdateEnableVibration(ctx context.Context, enabled bool, userId string) error {
	return s.store.UpdateEnableVibration(ctx, enabled, userId)
}

func (s *Service) CreateGuestUser(ctx context.Context, in *CreateGuestUserInput) (*User, error) {
	id := uuid.NewString()

	name := generateUsername(in.Locale)
	email := id + "@guest.turingsolutions.com"

	locale := in.Locale
	if !locale.Valid() {
		locale = i18n.Default
	}

	u := &User{
		ID:              id,
		Email:           email,
		Name:            name,
		IsGuest:         true,
		Locale:          locale,
		Color:           DefaultColor,
		EnableSounds:    true,
		EnableMusic:     true,
		EnableVibration: true,
		CreatedAt:       time.Now().UTC(),
	}
	if err := s.store.Create(ctx, u); err != nil {
		return nil, fmt.Errorf("insert (guest) user: %w", err)
	}
	return u, nil
}

func (s *Service) CreateUser(ctx context.Context, in *CreateUserInput) (*User, error) {
	email := NormalizeEmail(in.Email)

	taken, err := s.store.ExistsByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("check email: %w", err)
	}
	if taken {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}
	passwordHash := string(hash)

	id := uuid.NewString()
	locale := in.Locale
	if !locale.Valid() {
		locale = i18n.Default
	}

	u := &User{
		ID:              id,
		Email:           email,
		Name:            in.Name,
		PasswordHash:    &passwordHash,
		Locale:          locale,
		Color:           DefaultColor,
		EnableSounds:    true,
		EnableMusic:     true,
		EnableVibration: true,
		CreatedAt:       time.Now().UTC(),
	}
	if err := s.store.Create(ctx, u); err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}
	return u, nil
}

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

func (s *Service) CreateGuestUser(ctx context.Context, in *CreateGuestUserInput) (*User, error) {
	id := uuid.NewString()
	locale := i18n.Default

	name := generateUsername(locale)
	email := id + "@guest.turingsolutions.com"

	u := &User{ID: id, Email: email, Name: name, PasswordHash: "cheese", Locale: locale, CreatedAt: time.Now().UTC()}
	if err := s.store.Create(ctx, u); err != nil {
		return nil, fmt.Errorf("insert (guest) user: %w", err)
	}
	return u, nil
}

func (s *Service) CreateUser(ctx context.Context, in *CreateUserInput) (*User, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))

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

	id := uuid.NewString()
	locale := in.Locale
	if !locale.Valid() {
		locale = i18n.Default
	}

	u := &User{ID: id, Email: email, Name: in.Name, PasswordHash: string(hash), Locale: locale, CreatedAt: time.Now().UTC()}
	if err := s.store.Create(ctx, u); err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}
	return u, nil
}

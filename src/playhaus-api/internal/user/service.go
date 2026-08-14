package user

import (
	"context"
	"fmt"
	"strings"
	"time"

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

	u := &User{Email: email, Name: in.Name, PasswordHash: string(hash), CreatedAt: time.Now().UTC()}
	if err := s.store.Create(ctx, u); err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}
	return u, nil
}

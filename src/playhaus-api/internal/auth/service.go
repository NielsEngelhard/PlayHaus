package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"playhaus-api/internal/user"

	"golang.org/x/crypto/bcrypt"
)

// Store is every SQL statement about sessions.
type Store interface {
	Create(ctx context.Context, session *Session) error
	ByTokenHash(ctx context.Context, tokenHash string) (*Session, error)
	DeleteByTokenHash(ctx context.Context, tokenHash string) error
	DeleteExpired(ctx context.Context, before time.Time) (int64, error)
}

// Users is the slice of the user package this service needs.
type Users interface {
	ByEmail(ctx context.Context, email string) (*user.User, error)
	ByID(ctx context.Context, id string) (*user.User, error)
}

type Service struct {
	sessions Store
	users    Users
}

func NewService(sessions Store, users Users) *Service {
	return &Service{sessions: sessions, users: users}
}

// dummyHash is compared against when no account matches, so a wrong email costs the same time as a wrong password.
var dummyHash = sync.OnceValue(func() []byte {
	h, err := bcrypt.GenerateFromPassword([]byte("not-a-real-password-just-for-timing"), bcrypt.DefaultCost)
	if err != nil {
		// Only reachable if bcrypt rejects a literal this file controls, which is a programming error rather than a runtime one.
		panic("auth: could not build dummy hash: " + err.Error())
	}
	return h
})

// Login verifies credentials and starts a session.
func (s *Service) Login(ctx context.Context, email, password string) (*user.User, *Session, string, error) {
	u, err := s.users.ByEmail(ctx, user.NormalizeEmail(email))
	switch {
	case errors.Is(err, user.ErrNotFound):
		// Spend the same time as a real comparison would.
		_ = bcrypt.CompareHashAndPassword(dummyHash(), []byte(password))
		return nil, nil, "", ErrInvalidCredentials
	case err != nil:
		return nil, nil, "", fmt.Errorf("lookup user by email: %w", err)
	}

	// Guests have no password hash and so can never log in -- their signup token is the only way into the account.
	if u.PasswordHash == nil {
		_ = bcrypt.CompareHashAndPassword(dummyHash(), []byte(password))
		return nil, nil, "", ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*u.PasswordHash), []byte(password)); err != nil {
		return nil, nil, "", ErrInvalidCredentials
	}

	session, token, err := s.StartSession(ctx, u.ID)
	if err != nil {
		return nil, nil, "", err
	}
	return u, session, token, nil
}

// StartSession mints a token for a user that has already been authenticated by other means.
func (s *Service) StartSession(ctx context.Context, userID string) (*Session, string, error) {
	token, err := newToken()
	if err != nil {
		return nil, "", fmt.Errorf("generate session token: %w", err)
	}

	now := time.Now().UTC()
	session := &Session{
		TokenHash: hashToken(token),
		UserID:    userID,
		ExpiresAt: now.Add(SessionTTL),
		CreatedAt: now,
	}
	if err := s.sessions.Create(ctx, session); err != nil {
		return nil, "", fmt.Errorf("create session: %w", err)
	}
	return session, token, nil
}

// Authenticate resolves a raw token into the user ID that owns it.
func (s *Service) Authenticate(ctx context.Context, token string) (string, error) {
	if token == "" {
		return "", ErrInvalidSession
	}

	session, err := s.sessions.ByTokenHash(ctx, hashToken(token))
	switch {
	case errors.Is(err, ErrSessionNotFound):
		return "", ErrInvalidSession
	case err != nil:
		return "", fmt.Errorf("lookup session: %w", err)
	}

	if session.Expired(time.Now().UTC()) {
		// Drop the row now rather than leaving it for the sweeper.
		if err := s.sessions.DeleteByTokenHash(ctx, session.TokenHash); err != nil {
			slog.Warn("delete expired session", "err", err)
		}
		return "", ErrInvalidSession
	}

	return session.UserID, nil
}

// Logout revokes a token.
func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.sessions.DeleteByTokenHash(ctx, hashToken(token))
}

// SweepExpired deletes sessions past their expiry on a ticker until ctx is cancelled.
func (s *Service) SweepExpired(ctx context.Context, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			deleted, err := s.sessions.DeleteExpired(ctx, time.Now().UTC())
			if err != nil {
				log.Error("sweep expired sessions", "err", err)
				continue
			}
			if deleted > 0 {
				log.Info("swept expired sessions", "deleted", deleted)
			}
		}
	}
}

// Package auth turns credentials into sessions, and a session token back into the user ID that owns it.
package auth

import (
	"errors"
	"time"
)

// SessionTTL is how long a token stays valid.
const SessionTTL = 7 * 24 * time.Hour

// Session is a login session.
type Session struct {
	TokenHash string    `gorm:"primaryKey"`
	UserID    string    `gorm:"index;not null"`
	ExpiresAt time.Time `gorm:"index;not null"`
	CreatedAt time.Time `gorm:"not null"`
}

func (Session) TableName() string { return "sessions" }

// Expired reports whether the session is past its TTL.
func (s Session) Expired(now time.Time) bool { return now.After(s.ExpiresAt) }

var (
	// ErrInvalidCredentials covers both a wrong password and an unknown email.
	ErrInvalidCredentials = errors.New("invalid email or password")

	// ErrInvalidSession means the token is unknown, expired, or absent.
	ErrInvalidSession = errors.New("invalid or expired session")

	// ErrSessionNotFound is what a Store returns when no row matches.
	ErrSessionNotFound = errors.New("session not found")
)

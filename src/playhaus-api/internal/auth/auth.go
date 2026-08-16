// Package auth turns credentials into sessions, and a session token back into
// the user ID that owns it.
//
// Sessions are opaque, server-side, and revocable: the client is handed 256
// bits of random data and the database stores only its SHA-256 hash. That is
// what makes logout real -- deleting the row invalidates the token everywhere,
// which a self-contained token like a JWT cannot do without extra machinery.
package auth

import (
	"errors"
	"time"
)

// SessionTTL is how long a token stays valid. The client is told the expiry so
// it can log the user out locally instead of waiting for a 401.
const SessionTTL = 7 * 24 * time.Hour

// Session is a login session. The raw token lives only on the client; storing
// its hash means a leaked database dump cannot be replayed as a valid login.
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
	// They are deliberately the same error so a caller cannot use the response
	// to find out which addresses have accounts.
	ErrInvalidCredentials = errors.New("invalid email or password")

	// ErrInvalidSession means the token is unknown, expired, or absent.
	ErrInvalidSession = errors.New("invalid or expired session")

	// ErrSessionNotFound is what a Store returns when no row matches.
	ErrSessionNotFound = errors.New("session not found")
)

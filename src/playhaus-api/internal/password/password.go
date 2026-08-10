// Package password hashes and verifies account passwords.
package password

import (
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// bcryptCost is the work factor. 12 ≈ 250ms on modern hardware.
// Raise it over time; existing hashes keep verifying at their original cost.
const bcryptCost = 12

const (
	// bcrypt silently ignores anything past 72 bytes, so a longer password is
	// refused rather than quietly truncated to something weaker than it looks.
	maxBytes = 72

	// MinLength is the shortest password an account may have. Length is the only
	// rule: composition requirements push people towards predictable
	// substitutions without adding real entropy.
	MinLength = 8
)

var (
	ErrTooShort = errors.New("password is too short")
	ErrTooLong  = errors.New("password must not exceed 72 bytes")
)

// Hash returns a bcrypt hash of raw.
func Hash(raw string) (string, error) {
	if len(raw) < MinLength {
		return "", ErrTooShort
	}
	if len(raw) > maxBytes {
		return "", ErrTooLong
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(raw), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// Verify reports whether raw matches hash.
func Verify(raw, hash string) bool {
	// CompareHashAndPassword is constant-time and parses cost + salt from hash.
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(raw)) == nil
}

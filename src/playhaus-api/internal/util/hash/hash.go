package hash_utils

import (
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// bcryptCost is the work factor. 12 ≈ 250ms on modern hardware.
// Raise it over time; existing hashes keep verifying at their original cost.
const bcryptCost = 12

const maxPasswordBytes = 72 // bcrypt ignores anything beyond this

var (
	ErrEmptyPassword   = errors.New("password must not be empty")
	ErrPasswordTooLong = errors.New("password must not exceed 72 bytes")
)

func hashPassword(pwRaw string) (string, error) {
	if pwRaw == "" {
		return "", ErrEmptyPassword
	}
	if len(pwRaw) > maxPasswordBytes {
		return "", ErrPasswordTooLong
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(pwRaw), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func verifyPassword(pwRaw string, pwHash string) bool {
	// CompareHashAndPassword is constant-time and parses cost + salt from pwHash.
	return bcrypt.CompareHashAndPassword([]byte(pwHash), []byte(pwRaw)) == nil
}

package user

import "errors"

// Sentinel errors the service returns for conditions the caller is expected
// to handle. Their text is user-facing: handlers pass it straight through.
var (
	ErrNotFound        = errors.New("user not found")
	ErrInvalidUsername = errors.New("username must be 3-20 characters, using only letters, numbers, underscores or hyphens")
	ErrUsernameTaken   = errors.New("username is already taken")
)

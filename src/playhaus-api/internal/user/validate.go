package user

import (
	"errors"
	"net/mail"
	"strings"
	"unicode/utf8"
)

var (
	ErrNameRequired = errors.New("user: name is required")
	ErrNameTooLong  = errors.New("user: name is too long")
	ErrEmailInvalid = errors.New("user: email is not a valid address")
)

// ValidateName trims a submitted name and checks it against the same limit the
// app's input field enforces.
func ValidateName(raw string) (string, error) {
	name := strings.TrimSpace(raw)

	switch {
	case name == "":
		return "", ErrNameRequired
	case utf8.RuneCountInString(name) > NameMaxLength:
		return "", ErrNameTooLong
	default:
		return name, nil
	}
}

// NormalizeEmail puts an address in the one form this API stores and compares.
//
// Lower-casing is what makes the unique index mean what people expect. Without
// it Foo@example.com and foo@example.com are two accounts that the same person
// will try to log into interchangeably, and only one of them will work.
//
// Only the domain is genuinely case-insensitive per RFC 5321 — the local part
// is not — but every mail provider a player is realistically using treats it
// that way, and the alternative is a support burden nobody wants.
func NormalizeEmail(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", ErrEmailInvalid
	}

	// ParseAddress also accepts `Name <addr>`, which is not what a signup field
	// should be handing over, so the parsed address must equal what came in.
	parsed, err := mail.ParseAddress(trimmed)
	if err != nil || !strings.EqualFold(parsed.Address, trimmed) {
		return "", ErrEmailInvalid
	}

	return strings.ToLower(parsed.Address), nil
}

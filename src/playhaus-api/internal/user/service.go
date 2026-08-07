package user

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"

	"gorm.io/gorm"
)

const (
	minUsernameLen = 3
	maxUsernameLen = 20
)

// usernamePattern is deliberately narrow: no spaces, no punctuation that
// reads differently in another font, nothing that needs escaping in a URL.
var usernamePattern = regexp.MustCompile(`^[\p{L}\p{N}_-]+$`)

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

// UpdateUsername validates username and stores it against the given user,
// returning the user as it now stands.
//
// Callers should expect ErrInvalidUsername, ErrUsernameTaken and ErrNotFound;
// anything else is a genuine failure and not worth showing to a player.
func (s *Service) UpdateUsername(ctx context.Context, id uuid.UUID, username string) (*User, error) {
	username, err := normalizeUsername(username)
	if err != nil {
		return nil, err
	}

	var u User
	if err := s.db.WithContext(ctx).First(&u, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("load user %s: %w", id, err)
	}

	// Update rather than Save: it writes the one column that changed, so a
	// concurrent settings write can't be clobbered by our stale copy.
	if err := s.db.WithContext(ctx).Model(&u).Update("name", username).Error; err != nil {
		// Relies on the unique index on users.name -- checking for a taken
		// name with a SELECT first would still lose to a concurrent insert.
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, ErrUsernameTaken
		}

		return nil, fmt.Errorf("update username for %s: %w", id, err)
	}

	return &u, nil
}

// normalizeUsername trims surrounding whitespace and rejects what is left if
// it isn't a name we're willing to store.
func normalizeUsername(raw string) (string, error) {
	name := strings.TrimSpace(raw)

	// Count runes, not bytes: "José" is four characters but five bytes.
	if n := utf8.RuneCountInString(name); n < minUsernameLen || n > maxUsernameLen {
		return "", ErrInvalidUsername
	}

	if !usernamePattern.MatchString(name) {
		return "", ErrInvalidUsername
	}

	return name, nil
}

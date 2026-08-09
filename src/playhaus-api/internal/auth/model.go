package auth

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Session is a server-side login session. The raw token lives only in the
// user's cookie; we store its SHA-256 hash so a leaked database dump cannot
// be replayed as a valid login.
type Session struct {
	ID        string    `gorm:"type:text;primaryKey"`
	UserID    string    `gorm:"type:text;not null;index"`
	TokenHash string    `gorm:"type:text;not null;uniqueIndex"`
	ExpiresAt time.Time `gorm:"not null;index"`

	CreatedAt time.Time
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	return nil
}

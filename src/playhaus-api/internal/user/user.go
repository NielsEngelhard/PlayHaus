package user

import (
	"errors"
	"time"

	"playhaus-api/internal/i18n"
)

type User struct {
	ID    string `gorm:"primaryKey;"`
	Email string `gorm:"uniqueIndex;not null"`
	Name  string `gorm:"not null"`

	// PasswordHash is nil for guests
	PasswordHash *string

	IsGuest bool        `gorm:"not null"`
	Locale  i18n.Locale `gorm:"not null"`

	// HexColor e.g. #FFE538
	Color string `gorm:"not null;default:#FFE538"`

	EnableSounds    bool `gorm:"not null;default:true"`
	EnableMusic     bool `gorm:"not null;default:true"`
	EnableVibration bool `gorm:"not null;default:true"`

	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time
}

func (User) TableName() string { return "users" }

var (
	ErrEmailTaken = errors.New("email already in use")
	ErrNotFound   = errors.New("user not found")
)

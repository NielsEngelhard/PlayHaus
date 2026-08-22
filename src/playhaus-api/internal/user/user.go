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

	Color string `gorm:"not null;default:lemon"`

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
	// ErrNotGuest guards the upgrade route. Only a guest may trade its account in
	// for a real one; for anybody else the same call would be a way to change an
	// email and a password without ever being asked for the old one.
	ErrNotGuest = errors.New("account is not a guest")
)

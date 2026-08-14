package user

import (
	"errors"
	"time"

	"playhaus-api/internal/i18n"
)

type User struct {
	ID           string      `gorm:"primaryKey;"`
	Email        string      `gorm:"uniqueIndex;not null"`
	Name         string      `gorm:"not null"`
	PasswordHash string      `gorm:"not null"`
	Locale       i18n.Locale `gorm:"not null"`
	CreatedAt    time.Time   `gorm:"not null"`
	UpdatedAt    time.Time
}

func (User) TableName() string { return "users" }

var (
	ErrEmailTaken = errors.New("email already in use")
	ErrNotFound   = errors.New("user not found")
)

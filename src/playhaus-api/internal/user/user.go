package user

import (
	"errors"
	"time"
)

type User struct {
	ID           string    `gorm:"primaryKey;"`
	Email        string    `gorm:"uniqueIndex;not null"`
	Name         string    `gorm:"not null"`
	PasswordHash string    `gorm:"not null"`
	language     string    `gorm:"not null"`
	CreatedAt    time.Time `gorm:"not null"`
	UpdatedAt    time.Time
}

func (User) TableName() string { return "users" }

var (
	ErrEmailTaken = errors.New("email already in use")
	ErrNotFound   = errors.New("user not found")
)

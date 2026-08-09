package app_user

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AppUser struct {
	ID             string  `gorm:"type:text;primaryKey"`
	Name           string  `gorm:"not null"`
	Email          *string `gorm:"uniqueIndex"`
	PasswordHash   *string `json:"-"`
	IsGuestAccount bool    `gorm:"not null;default:false"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (u *AppUser) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}

package user

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	// not null is explicit: sqlite lets a non-INTEGER primary key hold NULL
	// unless you say otherwise.
	ID uuid.UUID `gorm:"primarykey;type:text;not null" json:"id"`
	// uniqueIndex is what makes ErrUsernameTaken reliable -- see
	// Service.UpdateUsername.
	Name             string `gorm:"not null;uniqueIndex" json:"name"`
	Color            string `gorm:"not null" json:"color"`
	EnableSound      bool   `gorm:"not null;default:true" json:"enableSound"`
	EnableVibrations bool   `gorm:"not null;default:true" json:"enableVibrations"`
}

// BeforeCreate fills the ID so callers never have to. Leaving it set lets
// tests and seeds pin a known value.
func (u *User) BeforeCreate(*gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}

	return nil
}

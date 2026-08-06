package user

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User is a player's account. Deliberately minimal -- no timestamps, no soft
// delete, and no gorm.Model embed (which would force a uint primary key).
type User struct {
	// not null is explicit: sqlite lets a non-INTEGER primary key hold NULL
	// unless you say otherwise.
	ID               string `gorm:"primarykey;type:text;not null" json:"id"`
	Name             string `gorm:"not null" json:"name"`
	Color            string `gorm:"not null" json:"color"`
	EnableSound      bool   `gorm:"not null;default:true" json:"enableSound"`
	EnableVibrations bool   `gorm:"not null;default:true" json:"enableVibrations"`
}

// BeforeCreate fills the ID so callers never have to. Leaving it set lets
// tests and seeds pin a known value.
func (u *User) BeforeCreate(*gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}

	return nil
}

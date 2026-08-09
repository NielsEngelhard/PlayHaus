package app_user

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// How long a name may be. Mirrors NAME_MAX_LENGTH in the app's
// src/features/settings/profile.ts — the field caps typing there, this refuses
// anything that arrives past it anyway.
const NameMaxLength = 16

// The avatar swatches the app offers, and the one a new account starts on.
//
// The colours themselves live in the app's theme: what the account stores is
// which swatch was picked, so restyling the palette never has to touch a row.
const DefaultAvatarColorID = "lemon"

var avatarColorIDs = map[string]struct{}{
	"lemon":  {},
	"fire":   {},
	"cobalt": {},
	"mint":   {},
	"blush":  {},
	"ink":    {},
}

func IsAvatarColorID(id string) bool {
	_, ok := avatarColorIDs[id]
	return ok
}

type AppUser struct {
	ID             string  `gorm:"type:text;primaryKey"`
	Name           string  `gorm:"not null"`
	Email          *string `gorm:"uniqueIndex"`
	PasswordHash   *string `json:"-"`
	IsGuestAccount bool    `gorm:"not null;default:false"`

	// Profile preferences. The column defaults are what backfills the accounts
	// that already existed when these were added, so they have to match the
	// values BeforeCreate hands a new one.
	AvatarColorID    string `gorm:"not null;default:'lemon'"`
	SoundEnabled     bool   `gorm:"not null;default:true"`
	VibrationEnabled bool   `gorm:"not null;default:true"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// Fills in what every account starts with, so no caller has to remember it.
//
// The two booleans are set unconditionally rather than only when unset: a bool
// has no "unset" to test for, and nothing creates an account that wants either
// preference off. Preferences are turned off afterwards, through the profile
// endpoint, never at signup.
func (u *AppUser) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	if u.AvatarColorID == "" {
		u.AvatarColorID = DefaultAvatarColorID
	}
	u.SoundEnabled = true
	u.VibrationEnabled = true

	return nil
}

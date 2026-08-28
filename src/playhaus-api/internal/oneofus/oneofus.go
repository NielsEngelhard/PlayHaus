package oneofus

import (
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type Role int

const (
	Civilian Role = 0
	Imposter Role = 1
)

type OneOfUsSingleDeviceGame struct {
	ID               uuid.UUID            `gorm:"primaryKey;type:text"`
	OwnerID          string               `gorm:"index;not null"`
	Locale           i18n.Locale          `gorm:"not null"`
	CreatedAt        time.Time            `gorm:"not null"`
	ActualQuestion   string               `gorm:"not null"`
	ImposterQuestion string               `gorm:"not null"`
	Players          []OneOfUsLocalPlayer `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`
}

func (OneOfUsSingleDeviceGame) TableName() string { return "oou_single_device_games" }

type OneOfUsLocalPlayer struct {
	playerID   uuid.UUID `gorm:"primaryKey;type:text"`
	Name       string    `gorm:"not null"`
	Score      int       `gorm:"not null;default:0"`
	Role       Role      `gorm:"not null"`
	CreatedAt  time.Time `gorm:"not null"`
	IsVotedOut bool      `gorm:"not null"`
}

func (OneOfUsLocalPlayer) TableName() string { return "oou_local_players" }

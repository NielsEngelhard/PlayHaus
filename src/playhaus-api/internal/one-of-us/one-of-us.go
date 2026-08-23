package one_of_us

import (
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type OneOfUsRound struct {
	GameID           uuid.UUID            `gorm:"primaryKey;type:text"`
	RoundNumber      int                  `gorm:"primaryKey;not null;index"`
	ActualQuestion   string               `gorm:"not null"`
	ImposterQuestion string               `gorm:"not null"`
	Imposters        []OneOfUsLocalPlayer `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`
}

func (OneOfUsRound) TableName() string { return "ooa_round" }

type OneOfUsSingleDeviceGame struct {
	ID        uuid.UUID            `gorm:"primaryKey;type:text"`
	OwnerID   string               `gorm:"index;not null"`
	Locale    i18n.Locale          `gorm:"not null"`
	CreatedAt time.Time            `gorm:"not null"`
	Rounds    []OneOfUsRound       `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`
	Players   []OneOfUsLocalPlayer `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`
}

func (OneOfUsSingleDeviceGame) TableName() string { return "oou_single_device_games" }

type OneOfUsLocalPlayer struct {
	GameId    uuid.UUID `gorm:"primaryKey;type:text"`
	Seat      int       `gorm:"primaryKey"` // Seat is where they are sitting, left to right, because the phone gets turned round the table
	Name      string    `gorm:"not null"`
	Score     int       `gorm:"not null;default:0"`
	CreatedAt time.Time `gorm:"not null"`
}

func (OneOfUsLocalPlayer) TableName() string { return "oou_local_players" }

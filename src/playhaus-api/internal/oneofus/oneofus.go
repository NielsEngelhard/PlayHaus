package oneofus

import (
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type Role int

const (
	Civilian Role = 0 // Sees "real"
	Imposter Role = 1 // Sees "fake"
	Nitwit   Role = 2 // Sees nothing
)

func (r Role) WithCivilians() bool {
	return r == Civilian
}

func (r Role) KnowsAWord() bool {
	return r != Nitwit
}

type OneOfUsSingleDeviceGame struct {
	ID               uuid.UUID            `gorm:"primaryKey;type:text" json:"id"`
	OwnerID          string               `gorm:"index;not null" json:"ownerId"`
	Locale           i18n.Locale          `gorm:"not null" json:"locale"`
	CreatedAt        time.Time            `gorm:"not null" json:"createdAt"`
	ActualQuestion   string               `gorm:"not null" json:"actualQuestion"`
	ImposterQuestion string               `gorm:"not null" json:"imposterQuestion"`
	FinishedAt       *time.Time           `json:"finishedAt"`
	CiviliansWon     *bool                `json:"civiliansWon"`
	Players          []OneOfUsLocalPlayer `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"players"`
}

func (OneOfUsSingleDeviceGame) TableName() string { return "oou_single_device_games" }

type OneOfUsLocalPlayer struct {
	PlayerID   uuid.UUID `gorm:"primaryKey;type:text" json:"playerId"`
	SessionID  uuid.UUID `gorm:"index;not null;type:text" json:"-"`
	Name       string    `gorm:"not null" json:"name"`
	Score      int       `gorm:"not null;default:0" json:"score"`
	Role       Role      `gorm:"not null" json:"role"`
	CreatedAt  time.Time `gorm:"not null" json:"createdAt"`
	IsVotedOut bool      `gorm:"not null" json:"isVotedOut"`
	IsMayor    bool      `gorm:"not null;default:false" json:"isMayor"`
}

func (OneOfUsLocalPlayer) TableName() string { return "oou_local_players" }

func Models() []any {
	return []any{
		&OneOfUsSingleDeviceGame{},
		&OneOfUsLocalPlayer{},
	}
}

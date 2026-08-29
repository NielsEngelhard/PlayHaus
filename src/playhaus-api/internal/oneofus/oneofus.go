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

// OneOfUsSingleDeviceGame is one table playing off one phone.
//
// The whole deal lives in this row: both halves of the word pair and, through the
// association, everybody's role. That is not a leak to fix — a single device has one
// screen for the whole table, so the phone has to hold what it is about to reveal one
// player at a time. Keeping the secrets off it would mean a round trip per reveal and a
// game that stops working the moment the wifi does.
type OneOfUsSingleDeviceGame struct {
	ID               uuid.UUID   `gorm:"primaryKey;type:text" json:"id"`
	OwnerID          string      `gorm:"index;not null" json:"ownerId"`
	Locale           i18n.Locale `gorm:"not null" json:"locale"`
	CreatedAt        time.Time   `gorm:"not null" json:"createdAt"`
	ActualQuestion   string      `gorm:"not null" json:"actualQuestion"`
	ImposterQuestion string      `gorm:"not null" json:"imposterQuestion"`

	// Set once, when a side has won. Nil for a game still being played, which is what
	// the app reads to tell "carry on where you left off" from "show me the result".
	//
	// The game used to be deleted at this point. That answered the reconnect endpoint
	// with a 404 in exactly the situation somebody most wants it to work — the phone
	// locked on the final screen — so the row now stays and says how it ended.
	FinishedAt   *time.Time `json:"finishedAt"`
	CiviliansWon *bool      `json:"civiliansWon"`

	Players []OneOfUsLocalPlayer `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"players"`
}

func (OneOfUsSingleDeviceGame) TableName() string { return "oou_single_device_games" }

type OneOfUsLocalPlayer struct {
	PlayerID uuid.UUID `gorm:"primaryKey;type:text" json:"playerId"`
	// The game this seat belongs to. Named for the association above rather than
	// GameID, and it has to exist as a field: GORM builds the foreign key from the
	// struct, so a `foreignKey:SessionID` with no SessionID migrates to a players
	// table that cannot be joined to anything.
	SessionID  uuid.UUID `gorm:"index;not null;type:text" json:"-"`
	Name       string    `gorm:"not null" json:"name"`
	Score      int       `gorm:"not null;default:0" json:"score"`
	Role       Role      `gorm:"not null" json:"role"`
	CreatedAt  time.Time `gorm:"not null" json:"createdAt"`
	IsVotedOut bool      `gorm:"not null" json:"isVotedOut"`
}

func (OneOfUsLocalPlayer) TableName() string { return "oou_local_players" }

// Models are the tables this game owns, parents before children so a fresh database
// can build the foreign keys as it goes.
func Models() []any {
	return []any{
		&OneOfUsSingleDeviceGame{},
		&OneOfUsLocalPlayer{},
	}
}

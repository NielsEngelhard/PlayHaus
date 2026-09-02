package fakefiller

import (
	"errors"
	"time"

	"github.com/google/uuid"

	"playhaus-api/internal/i18n"
)

type FFGameMode string

const (
	GameModeFacts    FFGameMode = "facts"
	GameModeCreative FFGameMode = "creative"
)

func (m FFGameMode) Valid() bool {
	switch m {
	case GameModeFacts, GameModeCreative:
		return true
	default:
		return false
	}
}

type FFLobby struct {
	ID            string      `gorm:"primaryKey;type:text"`
	OwnerID       string      `gorm:"type:text;index;not null"`
	Locale        i18n.Locale `gorm:"type:text;not null"`
	CurrentGameID *uuid.UUID  `gorm:"type:text;index"`
	RematchCode   *string     `gorm:"type:text;index"`
	Players       []FFPlayer  `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE"`
	CreatedAt     time.Time   `gorm:"not null"`
}

func (FFLobby) TableName() string { return "fakefiller_mp_lobby" }

type FFPlayer struct {
	LobbyID string `gorm:"primaryKey;type:text"`
	UserID  string `gorm:"primaryKey;type:text;index"`
	Score   int    `gorm:"not null"`
}

func (FFPlayer) TableName() string { return "fakefiller_mp_player" }

type FFMultiDeviceGame struct {
	ID           uuid.UUID   `gorm:"primaryKey;type:text"`
	LobbyID      string      `gorm:"type:text;uniqueIndex;not null"`
	OwnerID      string      `gorm:"type:text;index;not null"`
	Locale       i18n.Locale `gorm:"type:text;not null"`
	GameMode     FFGameMode  `gorm:"type:text;not null"`
	CurrentRound int         `gorm:"not null;default:1"`
	Players      []FFPlayer  `gorm:"foreignKey:LobbyID;references:LobbyID;-:migration"`
	Rounds       []FFRound   `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`
	CreatedAt    time.Time   `gorm:"not null"`
	EndedAt      *time.Time  `gorm:"index"`
}

func (FFMultiDeviceGame) TableName() string { return "fakefiller_mp_game" }

type FFRound struct {
	ID              uuid.UUID `gorm:"primaryKey;type:text"`
	GameID          uuid.UUID `gorm:"type:text;not null;uniqueIndex:idx_ff_round_game_number,priority:1"`
	Number          int       `gorm:"not null;uniqueIndex:idx_ff_round_game_number,priority:2"`
	Line            string    `gorm:"type:text;not null"`
	PlayerOneUserID string    `gorm:"type:text;not null;index"`
	PlayerTwoUserID string    `gorm:"type:text;not null;index"`
	PlayerOneAnswer *string   `gorm:"type:text"`
	PlayerTwoAnswer *string   `gorm:"type:text"`
	Votes           []FFVote  `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`
	CreatedAt       time.Time `gorm:"not null"`
}

func (FFRound) TableName() string { return "fakefiller_mp_round" }

type FFVote struct {
	RoundID        uuid.UUID `gorm:"primaryKey;type:text"`
	VoterUserID    string    `gorm:"primaryKey;type:text;index"`
	VotedForUserID string    `gorm:"type:text;not null"`
	CreatedAt      time.Time `gorm:"not null"`
}

func (FFVote) TableName() string { return "fakefiller_mp_vote" }

var (
	ErrGameNotFound = errors.New("ff game not found")
	ErrInvalidInput = errors.New("ff invalid game settings")
)

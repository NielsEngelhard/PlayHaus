package league_of_letters

import (
	"errors"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

type LetterStatus string

const (
	LetterCorrect LetterStatus = "correct" // right letter, right spot
	LetterPresent LetterStatus = "present" // right letter, wrong spot
	LetterAbsent  LetterStatus = "absent"
)

type GameStatus string

const (
	GameInProgress GameStatus = "in_progress"
	GameCompleted  GameStatus = "completed"
	GameAbandoned  GameStatus = "abandoned"
)

const (
	MinWordLength = 4
	MaxWordLength = 8
)

var (
	ErrGameNotFound = errors.New("game not found")
	ErrInvalidInput = errors.New("invalid game settings")
)

type SoloLeagueOfLettersGame struct {
	ID         uuid.UUID   `gorm:"primaryKey;type:text"`
	OwnerID    string      `gorm:"index;not null"`
	Locale     i18n.Locale `gorm:"not null"`
	WordLength int         `gorm:"not null"`

	Rounds          []LeagueOfLettersRound `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`
	SecondsPerGuess *int                   // optional
	CurrentRound    int                    `gorm:"not null"`
	Score           int                    `gorm:"not null"`
	Status          GameStatus             `gorm:"not null"`
	CreatedAt       time.Time              `gorm:"not null"`
}

func (SoloLeagueOfLettersGame) TableName() string { return "solo_lol_games" }

type LeagueOfLettersRound struct {
	ID     uuid.UUID `gorm:"primaryKey;type:text"`
	GameID uuid.UUID `gorm:"index;not null;type:text"`

	RoundNumber int                    `gorm:"not null"`
	Word        string                 `gorm:"not null"` // the answer -- never leaves the server
	Guesses     []LeagueOfLettersGuess `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`
}

func (LeagueOfLettersRound) TableName() string { return "solo_lol_rounds" }

type LeagueOfLettersGuess struct {
	ID      uuid.UUID `gorm:"primaryKey;type:text"`
	RoundID uuid.UUID `gorm:"index;not null;type:text"`
	OwnerID string    `gorm:"index;not null"`

	GuessNumber int                              `gorm:"not null"`
	Letters     []LeagueOfLettersValidatedLetter `gorm:"foreignKey:GuessID;constraint:OnDelete:CASCADE"`
	CreatedAt   time.Time                        `gorm:"not null"`
}

func (LeagueOfLettersGuess) TableName() string { return "solo_lol_guesses" }

type LeagueOfLettersValidatedLetter struct {
	ID      uuid.UUID `gorm:"primaryKey;type:text"`
	GuessID uuid.UUID `gorm:"index;not null;type:text"`

	Position int          `gorm:"not null"`
	Letter   string       `gorm:"not null"`
	Status   LetterStatus `gorm:"not null"`
}

func (LeagueOfLettersValidatedLetter) TableName() string { return "solo_lol_letters" }

func Models() []any {
	return []any{
		&SoloLeagueOfLettersGame{},
		&LeagueOfLettersRound{},
		&LeagueOfLettersGuess{},
		&LeagueOfLettersValidatedLetter{},
	}
}

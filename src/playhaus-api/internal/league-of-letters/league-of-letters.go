package league_of_letters

import (
	"playhaus-api/internal/user"
	"time"

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

type SoloLeagueOfLettersGame struct {
	ID              uuid.UUID              `gorm:"primaryKey;"`
	OwnerId         user.User              `gorm:"foreignKey:ID"`
	Rounds          []LeagueOfLettersRound ``
	SecondsPerGuess *int                   // optional
	CurrentRound    int                    `gorm:"not null"`
	Score           int                    `gorm:"not null"`
	Status          GameStatus             `gorm:"not null"`
	CreatedAt       time.Time              `gorm:"not null"`
}

type LeagueOfLettersRound struct {
	ID          uuid.UUID              `gorm:"primaryKey;"`
	RoundNumber int                    `gorm:"not null"`
	Word        string                 `gorm:"not null"`
	Guesses     []LeagueOfLettersGuess ``
}

type LeagueOfLettersGuess struct {
	ID          uuid.UUID                        `gorm:"primaryKey;"`
	GuessNumber int                              `gorm:"not null"` // guess number, round number and gameid together is unique but maybe not how I want to model it
	OwnerId     user.User                        `gorm:"foreignKey:ID"`
	Letters     []LeagueOfLettersValidatedLetter ``
	CreatedAt   time.Time
}

type LeagueOfLettersValidatedLetter struct { // Might be saved as JSON? Why not. Maybe more can be.
	ID       uuid.UUID    `gorm:"primaryKey;"` // Not really needed but idk how to otherwise
	position int          `gorm:"not null"`
	letter   byte         `gorm:"not null"`
	Status   LetterStatus `gorm:"not null"`
}

func (SoloLeagueOfLettersGame) TableName() string { return "solo_lol_game" }

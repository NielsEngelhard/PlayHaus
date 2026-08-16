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

const MaxGuesses = 6

var (
	ErrGameNotFound = errors.New("game not found")
	ErrInvalidInput = errors.New("invalid game settings")

	ErrInvalidGuess   = errors.New("invalid guess")
	ErrDuplicateGuess = errors.New("word already guessed this round")
	ErrRoundClosed    = errors.New("round takes no more guesses")
	ErrGameFinished   = errors.New("game is over")
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

// Solved reports whether some guess in this round landed the word.
func (r LeagueOfLettersRound) Solved() bool {
	for _, guess := range r.Guesses {
		if guess.Correct() {
			return true
		}
	}
	return false
}

// IsOver reports whether this round can still take a guess.
func (r LeagueOfLettersRound) IsOver() bool {
	return r.Solved() || len(r.Guesses) >= MaxGuesses
}

// FirstLetter is the hint the round opens with
func (r LeagueOfLettersRound) FirstLetter() string {
	if r.Word == "" {
		return ""
	}
	return string([]rune(r.Word)[0])
}

type LeagueOfLettersGuess struct {
	ID          uuid.UUID                        `gorm:"primaryKey;type:text"`
	RoundID     uuid.UUID                        `gorm:"index;not null;uniqueIndex:idx_lol_guess_slot;type:text"`
	OwnerID     string                           `gorm:"index;not null"`
	Word        string                           `gorm:"not null"`
	GuessNumber int                              `gorm:"not null;uniqueIndex:idx_lol_guess_slot"`
	Letters     []LeagueOfLettersValidatedLetter `gorm:"foreignKey:GuessID;constraint:OnDelete:CASCADE"`
	CreatedAt   time.Time                        `gorm:"not null"`
}

// Correct reports whether this guess was the answer.
func (g LeagueOfLettersGuess) Correct() bool {
	if len(g.Letters) == 0 {
		return false
	}
	for _, letter := range g.Letters {
		if letter.Status != LetterCorrect {
			return false
		}
	}
	return true
}

// Marks are this guess's letter statuses in playing order.
func (g LeagueOfLettersGuess) Marks() []LetterStatus {
	marks := make([]LetterStatus, 0, len(g.Letters))
	for _, letter := range g.Letters {
		marks = append(marks, letter.Status)
	}
	return marks
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

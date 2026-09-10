package lol

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

var (
	ErrGameNotFound = errors.New("game not found")
	ErrInvalidInput = errors.New("invalid game settings")

	ErrInvalidGuessCharacters      = errors.New("invalid guess")
	ErrInvalidGuessWordNonExisting = errors.New("invalid guess")
	ErrDuplicateGuess              = errors.New("word already guessed this round")
	ErrRoundClosed                 = errors.New("round takes no more guesses")
	ErrGameFinished                = errors.New("game is over")

	ErrLobbyNotFound    = errors.New("lobby not found")
	ErrLobbyFull        = errors.New("lobby is full")
	ErrLobbyStarted     = errors.New("lobby has already started")
	ErrNotHost          = errors.New("only the host may do that")
	ErrNotEnoughPlayers = errors.New("not enough players to start")
	ErrNotYourTurn      = errors.New("it is not your turn")

	// ErrGameNotOver is a rematch asked for while the table is still playing.
	ErrGameNotOver = errors.New("game is not over yet")

	ErrAlreadyPlayedToday = errors.New("word of the day already played today")
	ErrNoWordForDay       = errors.New("no word of the day for that day")
)

type LobbyStatus string

const (
	LobbyWaiting LobbyStatus = "waiting" // waiting to start
	LobbyStarted LobbyStatus = "started"
)

type MultiplayerLeagueOfLettersLobby struct {
	ID             string                   `gorm:"primaryKey;type:text"`
	OwnerID        string                   `gorm:"index;not null"`
	Locale         i18n.Locale              `gorm:"not null"`
	WordLength     int                      `gorm:"not null"`
	SecondsPerTurn int                      `gorm:"not null"`
	Status         LobbyStatus              `gorm:"not null"`
	GameID         *uuid.UUID               `gorm:"type:text"`
	Players        []MultiplayerLobbyPlayer `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE"`
	CreatedAt      time.Time                `gorm:"not null"`
	RematchCode    *string                  `gorm:"type:text"` // RematchCode is the room this one's table moved on to, once the game was over and
}

func (MultiplayerLeagueOfLettersLobby) TableName() string { return "mp_lol_lobbies" }

func (l MultiplayerLeagueOfLettersLobby) Full() bool { return len(l.Players) >= MaxLobbyPlayers }

func (l MultiplayerLeagueOfLettersLobby) Has(userID string) bool {
	for _, player := range l.Players {
		if player.UserID == userID {
			return true
		}
	}
	return false
}

type MultiplayerLobbyPlayer struct {
	LobbyID  string    `gorm:"primaryKey;type:text"`
	UserID   string    `gorm:"primaryKey;index"`
	Seat     int       `gorm:"not null"` // Seat is the order people walked in
	JoinedAt time.Time `gorm:"not null"`
}

// NextSeat is the seat a new arrival should take.
func (l MultiplayerLeagueOfLettersLobby) NextSeat() int {
	next := 0
	for _, player := range l.Players {
		if player.Seat >= next {
			next = player.Seat + 1
		}
	}
	return next
}

func (MultiplayerLobbyPlayer) TableName() string { return "mp_lol_lobby_players" }

// MultiplayerLeagueOfLettersGame is a started room.
type MultiplayerLeagueOfLettersGame struct {
	ID         uuid.UUID   `gorm:"primaryKey;type:text"`
	LobbyID    string      `gorm:"index;not null;type:text"`
	OwnerID    string      `gorm:"index;not null"`
	Locale     i18n.Locale `gorm:"not null"`
	WordLength int         `gorm:"not null"`

	Rounds  []LeagueOfLettersRound  `gorm:"foreignKey:GameID;-:migration"`
	Players []MultiplayerGamePlayer `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`

	CurrentRound int `gorm:"not null"`

	// TurnUserID is the only player the server will take a guess from right now,
	TurnUserID string    `gorm:"not null"`
	TurnEndsAt time.Time `gorm:"not null"`

	Status          GameStatus `gorm:"not null"`
	CreatedAt       time.Time  `gorm:"not null"`
	SecondsPerGuess int        `gorm:"not null;default:35"`
}

func (MultiplayerLeagueOfLettersGame) TableName() string { return "mp_lol_games" }

type MultiplayerGamePlayer struct {
	GameID    uuid.UUID `gorm:"primaryKey;type:text"`
	UserID    string    `gorm:"primaryKey;index"`
	TurnOrder int       `gorm:"not null"`
	Score     int       `gorm:"not null"`
}

func (MultiplayerGamePlayer) TableName() string { return "mp_lol_game_players" }

type SoloLeagueOfLettersGame struct {
	ID              uuid.UUID              `gorm:"primaryKey;type:text"`
	OwnerID         string                 `gorm:"index;not null"`
	Locale          i18n.Locale            `gorm:"not null"`
	WordLength      int                    `gorm:"not null"`
	Rounds          []LeagueOfLettersRound `gorm:"foreignKey:GameID;-:migration"`
	SecondsPerGuess *int                   // optional
	CurrentRound    int                    `gorm:"not null"`
	Score           int                    `gorm:"not null"`
	Status          GameStatus             `gorm:"not null"`
	CreatedAt       time.Time              `gorm:"not null"`

	// Competitive is the mode the game was set up in: a zen game keeps no score and runs no clock.
	Competitive bool `gorm:"not null;default:false"`
	// TimeBonus is what the clock was worth, folded into Score once the last round closed.
	TimeBonus  int `gorm:"not null;default:0"`
	FinishedAt *time.Time
}

func (SoloLeagueOfLettersGame) TableName() string { return "solo_lol_games" }

// SoloCompetitiveHighScore is an account's best competitive run at one word length.
type SoloCompetitiveHighScore struct {
	UserID     string    `gorm:"primaryKey"`
	WordLength int       `gorm:"primaryKey"`
	Score      int       `gorm:"not null"`
	Seconds    int       `gorm:"not null"`
	GameID     uuid.UUID `gorm:"type:text;not null"`
	AchievedAt time.Time `gorm:"not null"`
}

func (SoloCompetitiveHighScore) TableName() string { return "solo_lol_high_scores" }

// DailyWord is the answer one locale plays on one day, picked before anyone asks for it.
type DailyWord struct {
	Day        string      `gorm:"primaryKey;type:text"` // YYYY-MM-DD in the reset zone
	Locale     i18n.Locale `gorm:"primaryKey"`
	Word       string      `gorm:"not null"`
	WordLength int         `gorm:"not null"`
	CreatedAt  time.Time   `gorm:"not null"`
}

func (DailyWord) TableName() string { return "daily_lol_words" }

// DailyGame is an account's single attempt at one day's word: one word, six guesses, no clock.
type DailyGame struct {
	ID      uuid.UUID `gorm:"primaryKey;type:text"`
	OwnerID string    `gorm:"not null;index;uniqueIndex:idx_daily_lol_one_a_day"`
	// Day and OwnerID share a unique index, and that index is the once-a-day rule.
	Day        string                 `gorm:"not null;type:text;index;uniqueIndex:idx_daily_lol_one_a_day"`
	Locale     i18n.Locale            `gorm:"not null"`
	WordLength int                    `gorm:"not null"`
	Rounds     []LeagueOfLettersRound `gorm:"foreignKey:GameID;-:migration"`
	Status     GameStatus             `gorm:"not null"`
	// Solved and Guesses are denormalised so the streak and stats never preload a board.
	Solved     bool      `gorm:"not null;default:false"`
	Guesses    int       `gorm:"not null;default:0"`
	CreatedAt  time.Time `gorm:"not null"`
	FinishedAt *time.Time
}

func (DailyGame) TableName() string { return "daily_lol_games" }

// Round is the one round a daily game is played on.
func (g *DailyGame) Round() *LeagueOfLettersRound {
	if len(g.Rounds) == 0 {
		return nil
	}
	return &g.Rounds[0]
}

type LeagueOfLettersRound struct {
	ID          uuid.UUID              `gorm:"primaryKey;type:text"`
	GameID      uuid.UUID              `gorm:"index;not null;type:text"`
	RoundNumber int                    `gorm:"not null"`
	Word        string                 `gorm:"not null"` // the answer -- never leaves the server
	Guesses     []LeagueOfLettersGuess `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`
}

func (LeagueOfLettersRound) TableName() string { return "lol_rounds" }

// Solved reports whether some guess in this round landed the word.
func (r LeagueOfLettersRound) Solved() bool {
	for _, guess := range r.Guesses {
		if guess.Correct() {
			return true
		}
	}
	return false
}

func (r LeagueOfLettersRound) IsOver() bool {
	return RoundIsOver(r.Solved(), len(r.Guesses))
}

func (r LeagueOfLettersRound) FirstLetter() string {
	return HintLetter(r.Word)
}

type LeagueOfLettersGuess struct {
	ID          uuid.UUID                        `gorm:"primaryKey;type:text"`
	RoundID     uuid.UUID                        `gorm:"index;not null;uniqueIndex:idx_lol_guess_slot;type:text"`
	OwnerID     string                           `gorm:"index;not null"`
	Word        string                           `gorm:"not null"`
	GuessNumber int                              `gorm:"not null;uniqueIndex:idx_lol_guess_slot"`
	Letters     []LeagueOfLettersValidatedLetter `gorm:"foreignKey:GuessID;constraint:OnDelete:CASCADE"`
	Skipped     bool                             `gorm:"not null;default:false"`
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

func (LeagueOfLettersGuess) TableName() string { return "lol_guesses" }

type LeagueOfLettersValidatedLetter struct {
	ID      uuid.UUID `gorm:"primaryKey;type:text"`
	GuessID uuid.UUID `gorm:"index;not null;type:text"`

	Position int          `gorm:"not null"`
	Letter   string       `gorm:"not null"`
	Status   LetterStatus `gorm:"not null"`
}

func (LeagueOfLettersValidatedLetter) TableName() string { return "lol_letters" }

func Models() []any {
	return []any{
		&SoloLeagueOfLettersGame{},
		&SoloCompetitiveHighScore{},
		&DailyWord{},
		&DailyGame{},
		&LeagueOfLettersRound{},
		&LeagueOfLettersGuess{},
		&LeagueOfLettersValidatedLetter{},
		&MultiplayerLeagueOfLettersLobby{},
		&MultiplayerLobbyPlayer{},
		&MultiplayerLeagueOfLettersGame{},
		&MultiplayerGamePlayer{},
	}
}

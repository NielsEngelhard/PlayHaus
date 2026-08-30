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

	// ErrGameNotOver is a rematch asked for while the table is still playing. Its own
	// error rather than ErrGameFinished inverted, because the two are asked by
	// different screens about different things: one is a guess arriving too late, this
	// is a room being reopened too early.
	ErrGameNotOver = errors.New("game is not over yet")
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
	LobbyID string `gorm:"primaryKey;type:text"`
	UserID  string `gorm:"primaryKey;index"`

	// Seat is the order people walked in, and becomes the turn order when the game
	// starts. Stored rather than worked out from JoinedAt: two players who join in
	// the same microsecond -- which SQLite's resolution makes a real possibility,
	// and a test makes a certainty -- would otherwise sort in whatever order the
	// database felt like, and that order decides who plays first.
	Seat int `gorm:"not null"`

	JoinedAt time.Time `gorm:"not null"`
}

// NextSeat is the seat a new arrival should take.
//
// The highest in use plus one rather than the number of players: somebody leaving
// takes their seat number out of the middle, and reusing it would put the new
// arrival ahead of people who were already waiting.
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
//
// It shares the round, guess and letter tables with the solo game -- the board is
// the same board, and a guess is the same guess -- and adds the two things a solo
// game has no use for: who is up, and until when.
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
}

func (SoloLeagueOfLettersGame) TableName() string { return "solo_lol_games" }

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

// Correct reports whether this guess was the answer. A skipped row never is: it
// has no letters, so there is nothing in it that could be right.
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
		&LeagueOfLettersRound{},
		&LeagueOfLettersGuess{},
		&LeagueOfLettersValidatedLetter{},
		&MultiplayerLeagueOfLettersLobby{},
		&MultiplayerLobbyPlayer{},
		&MultiplayerLeagueOfLettersGame{},
		&MultiplayerGamePlayer{},
	}
}

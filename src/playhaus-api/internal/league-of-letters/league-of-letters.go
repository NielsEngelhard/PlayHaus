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

// DefaultWordLength is what a room plays at until its host says otherwise.
//
// A lobby is opened before anybody has been asked anything -- the code has to exist
// to be shared -- so it needs a length to sit at while the room fills up. Classic
// League of Letters, and the same figure DEFAULT_SOLO_SETTINGS starts the solo
// screen on.
const DefaultWordLength = 5

// MaxGuesses is how many rows a round has.
//
// In solo they are all yours. In multiplayer the table shares them -- six rows
// between however many of you there are -- which is what makes a wasted turn cost
// everybody something.
const MaxGuesses = 6

// The shape of a multiplayer room, all of it fixed rather than configurable.
const (
	// MaxLobbyPlayers matches MAX_LOBBY_PLAYERS in the app's lobby module.
	MaxLobbyPlayers = 6
	// MinLobbyPlayers -- a game with one player in it is a solo game with extra
	// steps. Matches MIN_LOBBY_PLAYERS in the app's lobby module.
	MinLobbyPlayers = 2
	// JoinCodeLength matches LOBBY_CODE_LENGTH, and the join card's input.
	JoinCodeLength = 4
	// SecondsPerTurn is how long you get. Run it out and the row is filled in blank
	// and the next player is up.
	SecondsPerTurn = 35
)

// joinCodeAlphabet leaves out O/0 and I/1. Codes get read out loud across a room,
// and the app's own generator made the same choice.
const joinCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

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
	ID         string                   `gorm:"primaryKey;type:text"`
	OwnerID    string                   `gorm:"index;not null"`
	Locale     i18n.Locale              `gorm:"not null"`
	WordLength int                      `gorm:"not null"`
	Status     LobbyStatus              `gorm:"not null"`
	GameID     *uuid.UUID               `gorm:"type:text"`
	Players    []MultiplayerLobbyPlayer `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE"`
	CreatedAt  time.Time                `gorm:"not null"`

	// RematchCode is the room this one's table moved on to, once the game was over and
	// the host opened another.
	//
	// Written once and never cleared, which is what makes a second press of play again
	// answer with the room that already exists rather than opening a third and splitting
	// the table between two codes. It is also how somebody whose connection blipped over
	// the announcement still finds out: it rides along on every lobby the room sends.
	RematchCode *string `gorm:"type:text"`
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

	Status    GameStatus `gorm:"not null"`
	CreatedAt time.Time  `gorm:"not null"`
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

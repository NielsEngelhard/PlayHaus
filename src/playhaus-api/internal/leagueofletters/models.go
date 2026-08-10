// Package leagueofletters implements the League of Letters game.
//
// It is split by layer rather than by endpoint. Files inside a Go package share
// one namespace, so splitting per handler would separate nothing; splitting per
// layer means each file can only be reached through the one above it:
//
//	handlers.go  HTTP — decodes, calls the service, maps errors to statuses
//	service.go   the rules — what a legal game and a legal guess are
//	store.go     every SQL statement in the package, and nothing else
//	dto.go       the wire shapes, and pure functions that build them
//	models.go    the rows as they exist in the database
//	scoring.go   marking and scoring, pure and heavily tested
//	roomcode.go  room code generation
package leagueofletters

import (
	"time"

	"playhausapi/internal/leagueofletters/wordlists"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// How long a game runs once it starts.
//
// TODO: unused until multiplayer can be started. Only a started multiplayer
// game sets Game.EndsAt, and nothing sets it yet, so every game is currently
// untimed and HasExpired never fires.
const GameDuration = 5 * time.Minute

// Guesses each player gets per round. Classic League of Letters.
const MaxGuesses = 6

type Mode string

const (
	ModeSolo        Mode = "solo"
	ModeMultiplayer Mode = "multiplayer"
)

func ParseMode(s string) (Mode, bool) {
	switch Mode(s) {
	case ModeSolo, ModeMultiplayer:
		return Mode(s), true
	default:
		return "", false
	}
}

type Status string

const (
	// StatusLobby is a multiplayer game waiting for players. Solo games never
	// pass through it — there is nobody to wait for.
	StatusLobby    Status = "lobby"
	StatusActive   Status = "active"
	StatusFinished Status = "finished"
)

type Game struct {
	ID string `gorm:"type:text;primaryKey"`

	// The room code players type to join, six characters. A pointer because
	// solo games have none: SQLite's unique index treats every NULL as distinct
	// but two empty strings as a collision, so the second solo game ever
	// created would be refused if this were a plain string.
	Code *string `gorm:"type:text;uniqueIndex"`

	HostUserID string `gorm:"type:text;index;not null"`
	Mode       Mode   `gorm:"type:text;not null"`
	Status     Status `gorm:"type:text;not null"`

	Language   string `gorm:"type:text;not null"`
	WordLength int    `gorm:"not null"`

	// Both nil until the game starts, which for a solo game is the moment it is
	// created and for a multiplayer one is when the host starts it.
	StartedAt *time.Time
	EndsAt    *time.Time

	// Bumped on every mutation, so a client can tell "nothing has changed" from
	// "I have not looked yet" without diffing the state itself.
	//
	// TODO: the polling half of this is not built. Nothing reads a version from
	// the request or answers 304, so the column is currently written and never
	// used.
	Version int `gorm:"not null;default:1"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Game) TableName() string { return "lol_games" }

func (g *Game) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	if g.Version == 0 {
		g.Version = 1
	}
	return nil
}

// HasExpired reports whether the game's clock has run out. Nothing sweeps
// finished games; the deadline is simply read whenever anyone asks, so a game
// nobody looks at costs nothing.
func (g *Game) HasExpired(now time.Time) bool {
	return g.EndsAt != nil && now.After(*g.EndsAt)
}

type Player struct {
	GameID string `gorm:"type:text;primaryKey"`
	UserID string `gorm:"type:text;primaryKey"`

	Score    int `gorm:"not null;default:0"`
	JoinedAt time.Time

	// Declared only so AutoMigrate emits a real foreign key. Without a relation
	// field GORM writes a plain column, and the foreign_keys pragma the
	// connection sets would be guarding nothing. Never loaded — the game is
	// always already in hand by the time players are read — hence the json tag,
	// so an accidental marshal of the row cannot recurse into it.
	//
	// UserID has no such constraint: app_users belongs to another package, and
	// importing it here to gain a database constraint would couple the game to
	// the account model for the rest of the project's life.
	Game *Game `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE" json:"-"`
}

func (Player) TableName() string { return "lol_players" }

func (p *Player) BeforeCreate(tx *gorm.DB) error {
	if p.JoinedAt.IsZero() {
		p.JoinedAt = time.Now()
	}
	return nil
}

type Round struct {
	ID     string `gorm:"type:text;primaryKey"`
	GameID string `gorm:"type:text;index;not null"`
	Number int    `gorm:"not null"`

	// The word being guessed. This must never reach a client before the round
	// is over. `json:"-"` stops an accidental marshal of the model itself, but
	// the real guard is that responses are built from RoundResponse, which has
	// no field to put it in.
	Word string `gorm:"type:text;not null" json:"-"`

	StartedAt time.Time

	// Nil when the round is untimed, which is every solo round: a solo player
	// is racing nobody, and the app shows them no clock. Only a shared game
	// needs a deadline, because there the clock is what makes it a race.
	EndsAt *time.Time

	Game *Game `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE" json:"-"`
}

func (Round) TableName() string { return "lol_rounds" }

func (r *Round) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type Guess struct {
	ID string `gorm:"type:text;primaryKey"`

	// One row per player per slot per round. The service already refuses a
	// seventh guess, but it decides that from rows it read moments earlier;
	// this index is what makes the rule true rather than merely enforced, and
	// it is the database that has to hold it.
	RoundID string `gorm:"type:text;not null;index;uniqueIndex:idx_lol_guess_slot,priority:1"`
	UserID  string `gorm:"type:text;not null;index;uniqueIndex:idx_lol_guess_slot,priority:2"`

	// This player's nth guess in this round, counting from 1.
	Number int    `gorm:"not null;uniqueIndex:idx_lol_guess_slot,priority:3"`
	Word   string `gorm:"type:text;not null"`

	CreatedAt time.Time

	Round *Round `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE" json:"-"`
}

func (Guess) TableName() string { return "lol_guesses" }

func (g *Guess) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	return nil
}

// NewRound builds the next round of a game, drawing a word from the embedded
// lists. It does not save; the caller decides which transaction it belongs to.
//
// A nil endsAt makes the round untimed.
func NewRound(game Game, number int, endsAt *time.Time) (Round, error) {
	lang, err := wordlists.ParseLanguage(game.Language)
	if err != nil {
		return Round{}, err
	}
	length, err := wordlists.ParseLength(game.WordLength)
	if err != nil {
		return Round{}, err
	}

	word, err := wordlists.GetRandomWord(lang, length)
	if err != nil {
		return Round{}, err
	}

	return Round{
		GameID:    game.ID,
		Number:    number,
		Word:      word,
		StartedAt: time.Now(),
		EndsAt:    endsAt,
	}, nil
}

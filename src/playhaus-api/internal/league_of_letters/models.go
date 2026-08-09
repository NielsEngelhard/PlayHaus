package leagueofletters

import (
	"crypto/rand"
	"strings"
	"time"

	wordlists "playhausapi/internal/league_of_letters/words"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// How long a game runs once it starts.
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

	// Bumped on every mutation. Clients poll with the version they last saw so
	// the server can tell them "nothing changed" without shipping the state
	// again.
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
	EndsAt    time.Time
}

func (Round) TableName() string { return "lol_rounds" }

func (r *Round) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.NewString()
	}
	return nil
}

type Guess struct {
	ID      string `gorm:"type:text;primaryKey"`
	RoundID string `gorm:"type:text;index;not null"`
	UserID  string `gorm:"type:text;index;not null"`

	// This player's nth guess in this round, counting from 1.
	Number int    `gorm:"not null"`
	Word   string `gorm:"type:text;not null"`

	CreatedAt time.Time
}

func (Guess) TableName() string { return "lol_guesses" }

func (g *Guess) BeforeCreate(tx *gorm.DB) error {
	if g.ID == "" {
		g.ID = uuid.NewString()
	}
	return nil
}

// Mark is what one letter of a guess turned out to be worth.
//
// Marks are never stored. They are derived from the guess and the round's word
// whenever a guess is read, which keeps a scoring bug a redeploy rather than a
// migration, and means the guesses table holds only what the player actually
// did.
type Mark string

const (
	MarkCorrect Mark = "correct" // Right letter, right place. Green.
	MarkPresent Mark = "present" // Right letter, wrong place. Orange.
	MarkAbsent  Mark = "absent"
)

// Evaluate scores a guess against the round's word.
//
// Two passes, because a letter can only be spent once. Guessing "geel" against
// "regel" has to mark exactly one of the two e's — the pass that finds exact
// hits claims its letters first, so the near-miss pass can only use what is
// genuinely left over. A single pass would light up both.
func Evaluate(guess, target string) []Mark {
	g := []rune(strings.ToLower(guess))
	t := []rune(strings.ToLower(target))

	marks := make([]Mark, len(g))

	remaining := make(map[rune]int, len(t))
	for _, r := range t {
		remaining[r]++
	}

	for i := range g {
		if i < len(t) && g[i] == t[i] {
			marks[i] = MarkCorrect
			remaining[g[i]]--
		}
	}

	for i := range g {
		if marks[i] == MarkCorrect {
			continue
		}
		if remaining[g[i]] > 0 {
			marks[i] = MarkPresent
			remaining[g[i]]--
			continue
		}
		marks[i] = MarkAbsent
	}

	return marks
}

// Room codes are read aloud and typed in by hand, so the alphabet leaves out
// the pairs that get misheard or mistyped: no O/0, no I/1. What is left is
// exactly 32 characters, which is a power of two — so a random byte masked to
// five bits picks one without the modulo bias a 26- or 36-character alphabet
// would introduce.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// CodeLength mirrors CODE_LENGTH in the app's JoinLeagueOfLettersGameCard.
const CodeLength = 6

// NewRoomCode returns a random room code. Uniqueness is not checked here — the
// unique index on Game.Code is what actually enforces it, and the caller
// retries on conflict. At 32^6 combinations that retry is close to never.
func NewRoomCode() (string, error) {
	buf := make([]byte, CodeLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	code := make([]byte, CodeLength)
	for i, b := range buf {
		code[i] = codeAlphabet[b&31]
	}

	return string(code), nil
}

// NewRound builds the next round of a game, drawing a word from the embedded
// lists. It does not save; the caller decides which transaction it belongs to.
func NewRound(game Game, number int, endsAt time.Time) (Round, error) {
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

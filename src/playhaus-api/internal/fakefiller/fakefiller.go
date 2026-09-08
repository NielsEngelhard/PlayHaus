// Package fakefiller is the Fake Filler game.
package fakefiller

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"playhaus-api/internal/i18n"
)

// FFGameMode is which pile of prompts a room is playing out of.
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

// HasTruth reports whether a round in this mode carries a real answer among its options.
func (m FFGameMode) HasTruth() bool { return m == GameModeFacts }

// LobbyStatus is the same two-state life a League of Letters room has: open, then spent.
type LobbyStatus string

const (
	LobbyWaiting LobbyStatus = "waiting"
	LobbyStarted LobbyStatus = "started"
)

// GameStatus mirrors lol.GameStatus, down to the spellings.
type GameStatus string

const (
	GameInProgress GameStatus = "in_progress"
	GameCompleted  GameStatus = "completed"
	GameAbandoned  GameStatus = "abandoned"
)

// GamePhase is the half of the game being played, and it is what this game has instead of a turn.
type GamePhase string

const (
	PhaseWriting GamePhase = "writing"
	PhaseVoting  GamePhase = "voting"
)

// TruthAuthorID is the author id the real answer is filed under.
const TruthAuthorID = "__truth__"

// Fills is one author's answer to one prompt: a value for every blank in the line, in the order the blanks appear.
type Fills []string

// Value stores the fills as a JSON array.
func (f Fills) Value() (driver.Value, error) {
	if f == nil {
		return "[]", nil
	}
	encoded, err := json.Marshal([]string(f))
	if err != nil {
		return nil, fmt.Errorf("fakefiller: encode fills: %w", err)
	}
	return string(encoded), nil
}

func (f *Fills) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case nil:
		*f = nil
		return nil
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	default:
		return fmt.Errorf("fakefiller: cannot scan %T into Fills", src)
	}

	var decoded []string
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return fmt.Errorf("fakefiller: decode fills: %w", err)
	}
	*f = decoded
	return nil
}

// GormDataType tells GORM to give the column a plain string type when it builds the DDL, rather than guessing from the Valuer.
func (Fills) GormDataType() string { return "string" }

// FFLobby is the room, keyed by its own join code.
type FFLobby struct {
	ID          string          `gorm:"primaryKey;type:text"`
	OwnerID     string          `gorm:"type:text;index;not null"`
	Locale      i18n.Locale     `gorm:"type:text;not null"`
	GameMode    FFGameMode      `gorm:"type:text;not null"`
	Status      LobbyStatus     `gorm:"type:text;not null"`
	GameID      *uuid.UUID      `gorm:"type:text;index"`
	RematchCode *string         `gorm:"type:text;index"`
	Players     []FFLobbyPlayer `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE"`
	CreatedAt   time.Time       `gorm:"not null"`
}

func (FFLobby) TableName() string { return "ff_lobbies" }

func (l FFLobby) Full() bool { return len(l.Players) >= MaxLobbyPlayers }

func (l FFLobby) Has(userID string) bool {
	for _, player := range l.Players {
		if player.UserID == userID {
			return true
		}
	}
	return false
}

// NextSeat is the highest seat in use plus one, not len(Players).
func (l FFLobby) NextSeat() int {
	next := 0
	for _, player := range l.Players {
		if player.Seat >= next {
			next = player.Seat + 1
		}
	}
	return next
}

// FFLobbyPlayer is somebody in the room before it starts.
type FFLobbyPlayer struct {
	LobbyID  string    `gorm:"primaryKey;type:text"`
	UserID   string    `gorm:"primaryKey;type:text;index"`
	Seat     int       `gorm:"not null"`
	JoinedAt time.Time `gorm:"not null"`
}

func (FFLobbyPlayer) TableName() string { return "ff_lobby_players" }

// FFMultiDeviceGame is a started game: a fixed roster, a fixed set of prompts, and a phase.
type FFMultiDeviceGame struct {
	ID       uuid.UUID   `gorm:"primaryKey;type:text"`
	LobbyID  string      `gorm:"type:text;index;not null"`
	OwnerID  string      `gorm:"type:text;index;not null"`
	Locale   i18n.Locale `gorm:"type:text;not null"`
	GameMode FFGameMode  `gorm:"type:text;not null"`

	Phase GamePhase `gorm:"type:text;not null"`

	// CurrentRound only means anything in PhaseVoting -- during the writing phase every round is open at once.
	CurrentRound int `gorm:"not null;default:1"`

	Players []FFGamePlayer `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`
	Rounds  []FFRound      `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`

	Status    GameStatus `gorm:"type:text;not null"`
	CreatedAt time.Time  `gorm:"not null"`
}

func (FFMultiDeviceGame) TableName() string { return "ff_games" }

func (g FFMultiDeviceGame) Has(userID string) bool {
	for _, player := range g.Players {
		if player.UserID == userID {
			return true
		}
	}
	return false
}

// Round finds a round by its 1-based number, or nil.
func (g *FFMultiDeviceGame) Round(number int) *FFRound {
	for i := range g.Rounds {
		if g.Rounds[i].Number == number {
			return &g.Rounds[i]
		}
	}
	return nil
}

// Score is one player's score, or zero for somebody not at this table.
func (g FFMultiDeviceGame) Score(userID string) int {
	for _, player := range g.Players {
		if player.UserID == userID {
			return player.Score
		}
	}
	return 0
}

// FFGamePlayer is a seat at a started game, and the scoreboard.
type FFGamePlayer struct {
	GameID uuid.UUID `gorm:"primaryKey;type:text"`
	UserID string    `gorm:"primaryKey;type:text;index"`
	// TurnOrder is the shuffled seating the prompts were dealt against.
	TurnOrder int `gorm:"not null"`
	Score     int `gorm:"not null"`
}

func (FFGamePlayer) TableName() string { return "ff_game_players" }

// FFRound is one prompt, its two assigned authors, the options that grew on it, and the votes cast for them.
type FFRound struct {
	ID     uuid.UUID `gorm:"primaryKey;type:text"`
	GameID uuid.UUID `gorm:"type:text;not null;uniqueIndex:idx_ff_round_game_number,priority:1"`
	Number int       `gorm:"not null;uniqueIndex:idx_ff_round_game_number,priority:2"`

	// Line still carries its blanks; the fills are kept apart from it so that one prompt can be rendered three different ways without three copies of the sentence.
	Line string `gorm:"type:text;not null"`
	// Blanks is how many placeholders Line has, settled when the round was dealt.
	Blanks int `gorm:"not null"`

	AuthorOneUserID string `gorm:"type:text;not null;index"`
	AuthorTwoUserID string `gorm:"type:text;not null;index"`

	Options []FFOption `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`
	Votes   []FFVote   `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time `gorm:"not null"`
}

func (FFRound) TableName() string { return "ff_rounds" }

// WrittenBy reports whether this prompt is one of the two that were dealt to a player.
func (r FFRound) WrittenBy(userID string) bool {
	return userID == r.AuthorOneUserID || userID == r.AuthorTwoUserID
}

// Option finds the option filed under an author id, or nil.
func (r *FFRound) Option(authorID string) *FFOption {
	for i := range r.Options {
		if r.Options[i].AuthorID == authorID {
			return &r.Options[i]
		}
	}
	return nil
}

// OptionInSlot finds the option shown in a given position, or nil.
func (r *FFRound) OptionInSlot(slot int) *FFOption {
	if slot < 0 {
		return nil
	}
	for i := range r.Options {
		if r.Options[i].Slot == slot {
			return &r.Options[i]
		}
	}
	return nil
}

// Answered reports whether both authors have written their fake.
func (r FFRound) Answered() bool {
	return r.Option(r.AuthorOneUserID) != nil && r.Option(r.AuthorTwoUserID) != nil
}

// VoteBy finds a player's vote on this round, or nil.
func (r *FFRound) VoteBy(userID string) *FFVote {
	for i := range r.Votes {
		if r.Votes[i].VoterUserID == userID {
			return &r.Votes[i]
		}
	}
	return nil
}

// FFOption is one of the things a voter can pick.
type FFOption struct {
	RoundID  uuid.UUID `gorm:"primaryKey;type:text"`
	AuthorID string    `gorm:"primaryKey;type:text"`
	Fills    Fills     `gorm:"not null"`

	// Slot is the shuffled position this option is shown in, assigned once when voting opens and never again.
	Slot int `gorm:"not null"`

	CreatedAt time.Time `gorm:"not null"`
}

func (FFOption) TableName() string { return "ff_round_options" }

// UnassignedSlot is the Slot of an option that voting has not opened on yet.
const UnassignedSlot = -1

func (o FFOption) IsTruth() bool { return o.AuthorID == TruthAuthorID }

// FFVote is one player's pick on one round.
type FFVote struct {
	RoundID     uuid.UUID `gorm:"primaryKey;type:text"`
	VoterUserID string    `gorm:"primaryKey;type:text;index"`
	// VotedForAuthorID is an author id, and may be TruthAuthorID.
	VotedForAuthorID string    `gorm:"type:text;not null"`
	CreatedAt        time.Time `gorm:"not null"`
}

func (FFVote) TableName() string { return "ff_votes" }

func Models() []any {
	return []any{
		&FFLobby{},
		&FFLobbyPlayer{},
		&FFMultiDeviceGame{},
		&FFGamePlayer{},
		&FFRound{},
		&FFOption{},
		&FFVote{},
	}
}

var (
	ErrGameNotFound = errors.New("game not found")
	ErrInvalidInput = errors.New("invalid game settings")

	ErrLobbyNotFound    = errors.New("lobby not found")
	ErrLobbyFull        = errors.New("lobby is full")
	ErrLobbyStarted     = errors.New("lobby has already started")
	ErrNotHost          = errors.New("only the host may do that")
	ErrNotEnoughPlayers = errors.New("not enough players to start")
	ErrTooManyPlayers   = errors.New("too many players to start")
	ErrGameNotOver      = errors.New("game is not over yet")

	ErrGameFinished        = errors.New("game is over")
	ErrWrongPhase          = errors.New("game is not in that phase")
	ErrWrongRound          = errors.New("game is not on that round")
	ErrRoundNotFound       = errors.New("no such round")
	ErrNotYourPrompt       = errors.New("that prompt was not dealt to you")
	ErrAlreadyAnswered     = errors.New("you have already answered that prompt")
	ErrAlreadyVoted        = errors.New("you have already voted on that round")
	ErrCannotVoteOwnPrompt = errors.New("you wrote for that prompt, so you cannot vote on it")
	ErrOptionNotFound      = errors.New("no such option on that round")

	// ErrNotEnoughContent is a broken build rather than a broken request.
	ErrNotEnoughContent = errors.New("not enough prompts for that many players")
)

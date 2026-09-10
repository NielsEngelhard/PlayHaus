package oneofus

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type Role int

const (
	Civilian Role = 0 // Sees "real"
	Imposter Role = 1 // Sees "fake"
	Nitwit   Role = 2 // Sees nothing
)

func (r Role) WithCivilians() bool {
	return r == Civilian
}

func (r Role) KnowsAWord() bool {
	return r != Nitwit
}

type OneOfUsSingleDeviceGame struct {
	ID               uuid.UUID            `gorm:"primaryKey;type:text" json:"id"`
	OwnerID          string               `gorm:"index;not null" json:"ownerId"`
	Locale           i18n.Locale          `gorm:"not null" json:"locale"`
	CreatedAt        time.Time            `gorm:"not null" json:"createdAt"`
	ActualQuestion   string               `gorm:"not null" json:"actualQuestion"`
	ImposterQuestion string               `gorm:"not null" json:"imposterQuestion"`
	FinishedAt       *time.Time           `json:"finishedAt"`
	CiviliansWon     *bool                `json:"civiliansWon"`
	Players          []OneOfUsLocalPlayer `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"players"`
}

func (OneOfUsSingleDeviceGame) TableName() string { return "oou_single_device_games" }

type OneOfUsLocalPlayer struct {
	PlayerID   uuid.UUID `gorm:"primaryKey;type:text" json:"playerId"`
	SessionID  uuid.UUID `gorm:"index;not null;type:text" json:"-"`
	Name       string    `gorm:"not null" json:"name"`
	Score      int       `gorm:"not null;default:0" json:"score"`
	Role       Role      `gorm:"not null" json:"role"`
	CreatedAt  time.Time `gorm:"not null" json:"createdAt"`
	IsVotedOut bool      `gorm:"not null" json:"isVotedOut"`
	IsMayor    bool      `gorm:"not null;default:false" json:"isMayor"`
}

func (OneOfUsLocalPlayer) TableName() string { return "oou_local_players" }

// LobbyStatus is the same two-state life every other room in this build has: open, then spent.
type LobbyStatus string

const (
	LobbyWaiting LobbyStatus = "waiting"
	LobbyStarted LobbyStatus = "started"
)

// GameStatus mirrors fakefiller.GameStatus, down to the spellings.
type GameStatus string

const (
	GameInProgress GameStatus = "in_progress"
	GameCompleted  GameStatus = "completed"
	GameAbandoned  GameStatus = "abandoned"
)

// RoleSet is which imposter roles a table is willing to be dealt, stored as a JSON array.
type RoleSet []Role

func (s RoleSet) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}

	encoded, err := json.Marshal([]Role(s))
	if err != nil {
		return nil, fmt.Errorf("oneofus: encode role set: %w", err)
	}

	return string(encoded), nil
}

func (s *RoleSet) Scan(src any) error {
	var raw []byte

	switch v := src.(type) {
	case nil:
		*s = nil
		return nil
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	default:
		return fmt.Errorf("oneofus: cannot scan %T into RoleSet", src)
	}

	var decoded []Role
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return fmt.Errorf("oneofus: decode role set: %w", err)
	}

	*s = decoded

	return nil
}

// GormDataType keeps the column a plain string rather than letting GORM guess from the Valuer.
func (RoleSet) GormDataType() string { return "string" }

// OOULobby is the room, keyed by its own join code.
type OOULobby struct {
	ID           string           `gorm:"primaryKey;type:text"`
	OwnerID      string           `gorm:"type:text;index;not null"`
	Locale       i18n.Locale      `gorm:"type:text;not null"`
	GameMode     GameMode         `gorm:"type:text;not null"`
	EnabledRoles RoleSet          `gorm:"not null"`
	Status       LobbyStatus      `gorm:"type:text;not null"`
	GameID       *uuid.UUID       `gorm:"type:text;index"`
	RematchCode  *string          `gorm:"type:text;index"`
	Players      []OOULobbyPlayer `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE"`
	CreatedAt    time.Time        `gorm:"not null"`
}

func (OOULobby) TableName() string { return "oou_lobbies" }

func (l OOULobby) Full() bool { return len(l.Players) >= MaxPlayers }

func (l OOULobby) Has(userID string) bool {
	for _, player := range l.Players {
		if player.UserID == userID {
			return true
		}
	}

	return false
}

// NextSeat is the highest seat in use plus one, not len(Players).
func (l OOULobby) NextSeat() int {
	next := 0

	for _, player := range l.Players {
		if player.Seat >= next {
			next = player.Seat + 1
		}
	}

	return next
}

// OOULobbyPlayer is somebody in the room before it starts.
type OOULobbyPlayer struct {
	LobbyID  string    `gorm:"primaryKey;type:text"`
	UserID   string    `gorm:"primaryKey;type:text;index"`
	Seat     int       `gorm:"not null"`
	JoinedAt time.Time `gorm:"not null"`
}

func (OOULobbyPlayer) TableName() string { return "oou_lobby_players" }

// OOUMultiDeviceGame is a started game: a dealt roster, one prompt pair for the whole game, and a phase.
type OOUMultiDeviceGame struct {
	ID       uuid.UUID   `gorm:"primaryKey;type:text"`
	LobbyID  string      `gorm:"type:text;index;not null"`
	OwnerID  string      `gorm:"type:text;index;not null"`
	Locale   i18n.Locale `gorm:"type:text;not null"`
	GameMode GameMode    `gorm:"type:text;not null"`

	// The one prompt pair, drawn once and played all game.
	ActualQuestion   string `gorm:"not null"`
	ImposterQuestion string `gorm:"not null"`

	Phase        Phase `gorm:"type:text;not null"`
	CurrentRound int   `gorm:"not null;default:1"`

	Players []OOUGamePlayer `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`
	Rounds  []OOURound      `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`

	Status       GameStatus `gorm:"type:text;not null"`
	CiviliansWon *bool
	FinishedAt   *time.Time
	CreatedAt    time.Time `gorm:"not null"`
}

func (OOUMultiDeviceGame) TableName() string { return "oou_multi_device_games" }

func (g OOUMultiDeviceGame) Has(userID string) bool {
	for _, player := range g.Players {
		if player.UserID == userID {
			return true
		}
	}

	return false
}

// Player finds somebody at this table, or nil.
func (g *OOUMultiDeviceGame) Player(userID string) *OOUGamePlayer {
	for i := range g.Players {
		if g.Players[i].UserID == userID {
			return &g.Players[i]
		}
	}

	return nil
}

// Round finds a round by its 1-based number, or nil.
func (g *OOUMultiDeviceGame) Round(number int) *OOURound {
	for i := range g.Rounds {
		if g.Rounds[i].Number == number {
			return &g.Rounds[i]
		}
	}

	return nil
}

// Over reports whether this game has stopped being playable, however it stopped.
func (g OOUMultiDeviceGame) Over() bool { return g.Status != GameInProgress }

// OOUGamePlayer is a seat at a started game. There is no score: this game is won or lost, not tallied.
type OOUGamePlayer struct {
	GameID uuid.UUID `gorm:"primaryKey;type:text"`
	UserID string    `gorm:"primaryKey;type:text;index"`
	// Seat is the shuffled order the roles were dealt against.
	Seat          int  `gorm:"not null"`
	Role          Role `gorm:"not null"`
	IsVotedOut    bool `gorm:"not null;default:false"`
	IsMayor       bool `gorm:"not null;default:false"`
	VotedOutRound *int
}

func (OOUGamePlayer) TableName() string { return "oou_game_players" }

// OOURound is one pass of the table: everybody's answer, everybody's vote, and who it cost.
type OOURound struct {
	ID     uuid.UUID `gorm:"primaryKey;type:text"`
	GameID uuid.UUID `gorm:"type:text;not null;uniqueIndex:idx_oou_round_game_number,priority:1"`
	Number int       `gorm:"not null;uniqueIndex:idx_oou_round_game_number,priority:2"`

	// LivingCount is frozen when the round opens, because it is the denominator for both answers and votes -- recomputing it after the elimination would misreport a closed round.
	LivingCount int `gorm:"not null"`

	Answers []OOUAnswer `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`
	Votes   []OOUVote   `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`

	EliminatedUserID *string `gorm:"type:text"`
	EliminatedRole   *Role
	EliminatedVotes  int  `gorm:"not null;default:0"`
	TieBrokenByMayor bool `gorm:"not null;default:false"`
	ClosedAt         *time.Time

	CreatedAt time.Time `gorm:"not null"`
}

func (OOURound) TableName() string { return "oou_rounds" }

// AnswerBy finds a player's answer on this round, or nil.
func (r *OOURound) AnswerBy(userID string) *OOUAnswer {
	for i := range r.Answers {
		if r.Answers[i].UserID == userID {
			return &r.Answers[i]
		}
	}

	return nil
}

// AnswerInSlot finds the answer shown in a given position, or nil.
func (r *OOURound) AnswerInSlot(slot int) *OOUAnswer {
	if slot < 0 {
		return nil
	}

	for i := range r.Answers {
		if r.Answers[i].Slot == slot {
			return &r.Answers[i]
		}
	}

	return nil
}

// VoteBy finds a player's vote on this round, or nil.
func (r *OOURound) VoteBy(userID string) *OOUVote {
	for i := range r.Votes {
		if r.Votes[i].VoterUserID == userID {
			return &r.Votes[i]
		}
	}

	return nil
}

// VotersFor is everybody who pointed at one player this round.
func (r *OOURound) VotersFor(userID string) []string {
	voters := make([]string, 0, len(r.Votes))

	for _, vote := range r.Votes {
		if vote.AccusedUserID == userID {
			voters = append(voters, vote.VoterUserID)
		}
	}

	return voters
}

// OOUAnswer is what one player typed this round.
type OOUAnswer struct {
	RoundID uuid.UUID `gorm:"primaryKey;type:text"`
	UserID  string    `gorm:"primaryKey;type:text;index"`
	Text    string    `gorm:"type:text;not null"`

	// Slot is the shuffled position this answer is shown in, assigned once when voting opens and never again.
	Slot int `gorm:"not null"`

	CreatedAt time.Time `gorm:"not null"`
}

func (OOUAnswer) TableName() string { return "oou_answers" }

// UnassignedSlot is the Slot of an answer that voting has not opened on yet.
const UnassignedSlot = -1

// OOUVote is one player's accusation, stored against the accused rather than the slot they picked.
type OOUVote struct {
	RoundID       uuid.UUID `gorm:"primaryKey;type:text"`
	VoterUserID   string    `gorm:"primaryKey;type:text;index"`
	AccusedUserID string    `gorm:"type:text;not null;index"`
	CreatedAt     time.Time `gorm:"not null"`
}

func (OOUVote) TableName() string { return "oou_votes" }

func Models() []any {
	return []any{
		&OneOfUsSingleDeviceGame{},
		&OneOfUsLocalPlayer{},
		&OOULobby{},
		&OOULobbyPlayer{},
		&OOUMultiDeviceGame{},
		&OOUGamePlayer{},
		&OOURound{},
		&OOUAnswer{},
		&OOUVote{},
	}
}

// These belong to the multi-device path. The single-device service still returns bare fmt.Errorf, and changing that would change its status codes.
var (
	ErrLobbyNotFound    = errors.New("lobby not found")
	ErrLobbyFull        = errors.New("lobby is full")
	ErrLobbyStarted     = errors.New("lobby has already started")
	ErrNotHost          = errors.New("only the host may do that")
	ErrNotEnoughPlayers = errors.New("not enough players to start")
	ErrTooManyPlayers   = errors.New("too many players to start")

	ErrGameNotFound = errors.New("game not found")
	ErrGameNotOver  = errors.New("game is not over yet")
	ErrGameFinished = errors.New("game is over")

	ErrWrongPhase    = errors.New("game is not in that phase")
	ErrWrongRound    = errors.New("game is not on that round")
	ErrRoundNotFound = errors.New("no such round")

	ErrVotedOut        = errors.New("you have been voted out")
	ErrAlreadyAnswered = errors.New("you have already answered this round")
	ErrAlreadyVoted    = errors.New("you have already voted this round")
	ErrCannotVoteSelf  = errors.New("you cannot vote for your own answer")
	ErrAnswerNotFound  = errors.New("no such answer on that round")

	ErrInvalidInput = errors.New("invalid game settings")

	// ErrNoContent is a broken build rather than a broken request.
	ErrNoContent = errors.New("no prompts available")
)

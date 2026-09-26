// Package wittywars is the Witty Wars game: two players answer one prompt and the rest of the table votes for the funnier one.
package wittywars

import (
	"errors"
	"time"

	"github.com/google/uuid"

	"playhaus-api/internal/i18n"
)

// WWGameMode is which pile of prompts a room is playing out of.
type WWGameMode string

const (
	GameModeFamily   WWGameMode = "family"
	GameModeRude     WWGameMode = "rude"
	GameModeCaliente WWGameMode = "caliente"
)

// GameModes is every mode a room can be set to, in the order the app offers them.
var GameModes = []WWGameMode{GameModeFamily, GameModeRude, GameModeCaliente}

func (m WWGameMode) Valid() bool {
	switch m {
	case GameModeFamily, GameModeRude, GameModeCaliente:
		return true
	default:
		return false
	}
}

// LobbyStatus is the same two-state life every room has: open, then spent.
type LobbyStatus string

const (
	LobbyWaiting LobbyStatus = "waiting"
	LobbyStarted LobbyStatus = "started"
)

type GameStatus string

const (
	GameInProgress GameStatus = "in_progress"
	GameCompleted  GameStatus = "completed"
	GameAbandoned  GameStatus = "abandoned"
)

// GamePhase is the half of the game being played.
type GamePhase string

const (
	PhaseWriting GamePhase = "writing"
	PhaseVoting  GamePhase = "voting"
	// PhaseReveal is the round just decided, held there until the host moves the table on.
	PhaseReveal GamePhase = "reveal"
)

// WWLobby is the room, keyed by its own join code.
type WWLobby struct {
	ID               string          `gorm:"primaryKey;type:text"`
	OwnerID          string          `gorm:"type:text;index;not null"`
	Locale           i18n.Locale     `gorm:"type:text;not null"`
	GameMode         WWGameMode      `gorm:"type:text;not null"`
	AnswersPerPlayer int             `gorm:"not null;default:3"`
	Status           LobbyStatus     `gorm:"type:text;not null"`
	GameID           *uuid.UUID      `gorm:"type:text;index"`
	RematchCode      *string         `gorm:"type:text;index"`
	Players          []WWLobbyPlayer `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE"`
	CreatedAt        time.Time       `gorm:"not null"`
}

func (WWLobby) TableName() string { return "ww_lobbies" }

func (l WWLobby) Full() bool { return len(l.Players) >= MaxLobbyPlayers }

func (l WWLobby) Has(userID string) bool {
	for _, player := range l.Players {
		if player.UserID == userID {
			return true
		}
	}
	return false
}

// NextSeat is the highest seat in use plus one, not len(Players).
func (l WWLobby) NextSeat() int {
	next := 0
	for _, player := range l.Players {
		if player.Seat >= next {
			next = player.Seat + 1
		}
	}
	return next
}

type WWLobbyPlayer struct {
	LobbyID  string    `gorm:"primaryKey;type:text"`
	UserID   string    `gorm:"primaryKey;type:text;index"`
	Seat     int       `gorm:"not null"`
	JoinedAt time.Time `gorm:"not null"`
}

func (WWLobbyPlayer) TableName() string { return "ww_lobby_players" }

// WWMultiDeviceGame is a started game: a fixed roster, a fixed set of prompts, and a phase.
type WWMultiDeviceGame struct {
	ID               uuid.UUID   `gorm:"primaryKey;type:text"`
	LobbyID          string      `gorm:"type:text;index;not null"`
	OwnerID          string      `gorm:"type:text;index;not null"`
	Locale           i18n.Locale `gorm:"type:text;not null"`
	GameMode         WWGameMode  `gorm:"type:text;not null"`
	AnswersPerPlayer int         `gorm:"not null;default:3"`

	Phase GamePhase `gorm:"type:text;not null"`
	// CurrentRound only means anything once voting has opened -- during writing every round is open at once.
	CurrentRound int `gorm:"not null;default:1"`

	Players []WWGamePlayer `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`
	Rounds  []WWRound      `gorm:"foreignKey:GameID;constraint:OnDelete:CASCADE"`

	Status    GameStatus `gorm:"type:text;not null"`
	CreatedAt time.Time  `gorm:"not null"`
}

func (WWMultiDeviceGame) TableName() string { return "ww_games" }

func (g WWMultiDeviceGame) Has(userID string) bool {
	for _, player := range g.Players {
		if player.UserID == userID {
			return true
		}
	}
	return false
}

// Round finds a round by its 1-based number, or nil.
func (g *WWMultiDeviceGame) Round(number int) *WWRound {
	for i := range g.Rounds {
		if g.Rounds[i].Number == number {
			return &g.Rounds[i]
		}
	}
	return nil
}

// Score is one player's score, or zero for somebody not at this table.
func (g WWMultiDeviceGame) Score(userID string) int {
	for _, player := range g.Players {
		if player.UserID == userID {
			return player.Score
		}
	}
	return 0
}

// RoundsFor is every round dealt to one player, in round order.
func (g WWMultiDeviceGame) RoundsFor(userID string) []WWRound {
	var out []WWRound
	for _, round := range g.Rounds {
		if round.WrittenBy(userID) {
			out = append(out, round)
		}
	}
	return out
}

type WWGamePlayer struct {
	GameID uuid.UUID `gorm:"primaryKey;type:text"`
	UserID string    `gorm:"primaryKey;type:text;index"`
	// TurnOrder is the shuffled seating the prompts were dealt against.
	TurnOrder int `gorm:"not null"`
	Score     int `gorm:"not null"`
}

func (WWGamePlayer) TableName() string { return "ww_game_players" }

// WWRound is one prompt, the two players it was dealt to, their answers, and the votes cast for them.
type WWRound struct {
	ID     uuid.UUID `gorm:"primaryKey;type:text"`
	GameID uuid.UUID `gorm:"type:text;not null;uniqueIndex:idx_ww_round_game_number,priority:1"`
	Number int       `gorm:"not null;uniqueIndex:idx_ww_round_game_number,priority:2"`

	// Line still carries its placeholder; the name is put in on the way out, so a renamed player is read under their new name.
	Line string `gorm:"type:text;not null"`
	// SubjectUserID is who the placeholder names, empty on a line without one.
	SubjectUserID string `gorm:"type:text;not null"`

	AuthorOneUserID string `gorm:"type:text;not null;index"`
	AuthorTwoUserID string `gorm:"type:text;not null;index"`

	Options []WWOption `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`
	Votes   []WWVote   `gorm:"foreignKey:RoundID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time `gorm:"not null"`
}

func (WWRound) TableName() string { return "ww_rounds" }

// WrittenBy reports whether this prompt is one of the ones a player was dealt.
func (r WWRound) WrittenBy(userID string) bool {
	if userID == "" {
		return false
	}
	return userID == r.AuthorOneUserID || userID == r.AuthorTwoUserID
}

func (r WWRound) Authors() []string {
	return []string{r.AuthorOneUserID, r.AuthorTwoUserID}
}

// Option finds the answer filed under an author id, or nil.
func (r *WWRound) Option(authorID string) *WWOption {
	for i := range r.Options {
		if r.Options[i].AuthorID == authorID {
			return &r.Options[i]
		}
	}
	return nil
}

// OptionInSlot finds the answer shown in a given position, or nil.
func (r *WWRound) OptionInSlot(slot int) *WWOption {
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

// OptionsInSlot is every answer shown in a given position, which is both of them when the two writers wrote the same thing.
func (r WWRound) OptionsInSlot(slot int) []WWOption {
	var out []WWOption
	for _, option := range r.Options {
		if slot >= 0 && option.Slot == slot {
			out = append(out, option)
		}
	}
	return out
}

// VoteBy finds a player's vote on this round, or nil.
func (r *WWRound) VoteBy(userID string) *WWVote {
	for i := range r.Votes {
		if r.Votes[i].VoterUserID == userID {
			return &r.Votes[i]
		}
	}
	return nil
}

// WWOption is one writer's answer to one prompt.
type WWOption struct {
	RoundID  uuid.UUID `gorm:"primaryKey;type:text"`
	AuthorID string    `gorm:"primaryKey;type:text"`
	Answer   string    `gorm:"type:text;not null"`

	// Slot is the shuffled position this answer is shown in, assigned once when voting opens and never again.
	Slot int `gorm:"not null"`

	CreatedAt time.Time `gorm:"not null"`
}

func (WWOption) TableName() string { return "ww_round_options" }

// UnassignedSlot is the Slot of an answer that voting has not opened on yet.
const UnassignedSlot = -1

// WWVote is one player's pick on one round.
type WWVote struct {
	RoundID          uuid.UUID `gorm:"primaryKey;type:text"`
	VoterUserID      string    `gorm:"primaryKey;type:text;index"`
	VotedForAuthorID string    `gorm:"type:text;not null"`
	CreatedAt        time.Time `gorm:"not null"`
}

func (WWVote) TableName() string { return "ww_votes" }

func Models() []any {
	return []any{
		&WWLobby{},
		&WWLobbyPlayer{},
		&WWMultiDeviceGame{},
		&WWGamePlayer{},
		&WWRound{},
		&WWOption{},
		&WWVote{},
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
	ErrAlreadyAnswered     = errors.New("you have already answered")
	ErrIncompleteAnswers   = errors.New("answers must cover every prompt dealt to you, once each")
	ErrAnswerTooLong       = errors.New("that answer is too long")
	ErrAlreadyVoted        = errors.New("you have already voted on that round")
	ErrCannotVoteOwnPrompt = errors.New("you wrote for that prompt, so you cannot vote on it")
	ErrOptionNotFound      = errors.New("no such answer on that round")

	// ErrNotEnoughContent is a broken build rather than a broken request.
	ErrNotEnoughContent = errors.New("not enough prompts for that many players")
)

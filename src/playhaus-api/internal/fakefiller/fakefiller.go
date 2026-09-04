// Package fakefiller is the Fake Filler game: a prompt with blanks, two players secretly
// inventing a plausible fill-in for it, and everyone else trying to pick the real one out
// of the line-up.
//
// The shape it borrows from League of Letters is the lobby: a host opens a room, people
// walk in with a join code, the host starts, and a socket keeps the table in step. What it
// does not borrow is the turn. League of Letters has exactly one player who may act at any
// moment; here everybody writes at once and then everybody votes at once, which changes
// how the writes have to be guarded -- see the note on FFVote.
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

// FFGameMode is which pile of prompts a room is playing out of, and it decides whether
// there is a truth to find at all.
//
// facts prompts carry the real answer in the data file, so a round is two fakes and the
// truth and you score for spotting it. creative prompts have no truth -- nobody was ever
// going to guess "the funniest thing to say here" -- so a round is the two fakes alone and
// the only points are for being picked.
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

// GameStatus mirrors lol.GameStatus, down to the spellings, so the two games' rows read
// the same way in the database and in a log line.
type GameStatus string

const (
	GameInProgress GameStatus = "in_progress"
	GameCompleted  GameStatus = "completed"
	GameAbandoned  GameStatus = "abandoned"
)

// GamePhase is the half of the game being played, and it is what this game has instead of
// a turn.
//
// In PhaseWriting every round is open at once and each player fills the two prompts they
// were dealt, in whatever order they like. In PhaseVoting the table walks the rounds one
// at a time and everyone who did not write for a round votes on it. There is no third
// phase: a finished game is Status GameCompleted, because "over" is a fact about the game
// rather than a stage of it.
type GamePhase string

const (
	PhaseWriting GamePhase = "writing"
	PhaseVoting  GamePhase = "voting"
)

// TruthAuthorID is the author id the real answer is filed under.
//
// The truth is stored as just another option row rather than as a column on the round, and
// this constant is what makes that possible. Three things all want the truth to have the
// same shape as a fake and an id of its own: the voting screen shuffles the options
// together, a vote records the author it was cast for, and scoring is one loop over the
// votes. Special-casing the truth would mean special-casing it in all three.
//
// It cannot collide with a real user id: those are UUIDs, and this is not the shape of one.
const TruthAuthorID = "__truth__"

// Fills is one author's answer to one prompt: a value for every blank in the line, in the
// order the blanks appear.
//
// It is a column rather than a table because the blanks are only ever read and written
// together -- you fill a prompt in one go, and a half-filled prompt is not a thing the game
// has -- so a row each would buy nothing and cost a join. The Valuer/Scanner pair is the
// same trick i18n.Locale uses to be a struct field with no converter and no type tag.
type Fills []string

// Value stores the fills as a JSON array. A nil Fills is written as an empty array rather
// than NULL so that Scan never has to answer what a missing answer means -- an option row
// only exists once it has been answered.
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

// GormDataType tells GORM to give the column a plain string type when it builds the DDL,
// rather than guessing from the Valuer.
func (Fills) GormDataType() string { return "string" }

// FFLobby is the room, keyed by its own join code.
//
// The code is the primary key rather than a surrogate id, exactly as in League of Letters:
// the code is what a player types and what a socket room is named after, so giving it a
// second identity would only create two things that have to agree.
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

// NextSeat is the highest seat in use plus one, not len(Players): somebody leaving must not
// hand their seat to the next arrival ahead of the people already sitting down.
func (l FFLobby) NextSeat() int {
	next := 0
	for _, player := range l.Players {
		if player.Seat >= next {
			next = player.Seat + 1
		}
	}
	return next
}

// FFLobbyPlayer is somebody in the room before it starts. Seat is the order they walked in,
// and it is what the round pairing is dealt against, so it has to be stable.
type FFLobbyPlayer struct {
	LobbyID  string    `gorm:"primaryKey;type:text"`
	UserID   string    `gorm:"primaryKey;type:text;index"`
	Seat     int       `gorm:"not null"`
	JoinedAt time.Time `gorm:"not null"`
}

func (FFLobbyPlayer) TableName() string { return "ff_lobby_players" }

// FFMultiDeviceGame is a started game: a fixed roster, a fixed set of prompts, and a phase.
//
// The roster is copied onto the game rather than read back off the lobby because the two
// answer different questions. The lobby roster is who is in the room now; this is who the
// game is being played by, which was settled the moment it started and cannot change --
// every prompt was dealt to two of these people, and the game waits for all of them.
type FFMultiDeviceGame struct {
	ID       uuid.UUID   `gorm:"primaryKey;type:text"`
	LobbyID  string      `gorm:"type:text;index;not null"`
	OwnerID  string      `gorm:"type:text;index;not null"`
	Locale   i18n.Locale `gorm:"type:text;not null"`
	GameMode FFGameMode  `gorm:"type:text;not null"`

	Phase GamePhase `gorm:"type:text;not null"`

	// CurrentRound only means anything in PhaseVoting -- during the writing phase every
	// round is open at once. It is 1-based, and a value past len(Rounds) never persists:
	// the game is completed instead.
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
	// TurnOrder is the shuffled seating the prompts were dealt against. It is not a turn --
	// nobody plays one at a time -- but it is the order the scoreboard is drawn in, and it
	// is what makes the pairing legible from the rows rather than only from the moment it
	// was dealt.
	TurnOrder int `gorm:"not null"`
	Score     int `gorm:"not null"`
}

func (FFGamePlayer) TableName() string { return "ff_game_players" }

// FFRound is one prompt, its two assigned authors, the options that grew on it, and the
// votes cast for them.
type FFRound struct {
	ID     uuid.UUID `gorm:"primaryKey;type:text"`
	GameID uuid.UUID `gorm:"type:text;not null;uniqueIndex:idx_ff_round_game_number,priority:1"`
	Number int       `gorm:"not null;uniqueIndex:idx_ff_round_game_number,priority:2"`

	// Line still carries its blanks; the fills are kept apart from it so that one prompt can
	// be rendered three different ways without three copies of the sentence.
	Line string `gorm:"type:text;not null"`
	// Blanks is how many placeholders Line has, settled when the round was dealt. It is
	// stored rather than recounted so that a later change to the placeholder spelling cannot
	// silently start rejecting answers to games already in flight.
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
//
// This is how a vote is resolved: the voting screen is sent slots rather than author ids,
// because an author id is either a player or the string "__truth__" and either would give
// the round away before it is voted on. Only meaningful once voting has opened -- before
// that every option sits at UnassignedSlot, which is why that constant is negative and no
// slot ever is.
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

// FFOption is one of the things a voter can pick: a fake written by a player, or -- filed
// under TruthAuthorID -- the real answer that came with the prompt.
type FFOption struct {
	RoundID  uuid.UUID `gorm:"primaryKey;type:text"`
	AuthorID string    `gorm:"primaryKey;type:text"`
	Fills    Fills     `gorm:"not null"`

	// Slot is the shuffled position this option is shown in, assigned once when voting opens
	// and never again. Shuffling per request would be cheaper, but then a player who dropped
	// their connection and came back would be looking at the same options in a different
	// order -- with no way to know that the one they had half decided on had moved.
	//
	// It is UnassignedSlot for the whole of the writing phase, when there is nothing to show
	// and no order to fix.
	Slot int `gorm:"not null"`

	CreatedAt time.Time `gorm:"not null"`
}

func (FFOption) TableName() string { return "ff_round_options" }

// UnassignedSlot is the Slot of an option that voting has not opened on yet.
const UnassignedSlot = -1

func (o FFOption) IsTruth() bool { return o.AuthorID == TruthAuthorID }

// FFVote is one player's pick on one round.
//
// The composite primary key is not bookkeeping, it is the concurrency control. League of
// Letters can guard a write by checking that it is still your turn, because only one player
// may act at a time; here every voter acts at once and that check would pass for all of
// them. What actually makes a second vote impossible is this key: the insert is attempted
// first and the unique constraint refuses the duplicate. The same goes for the
// (RoundID, AuthorID) key on FFOption.
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

	// ErrNotEnoughContent is a broken build rather than a broken request: a locale whose
	// data file has fewer prompts than the table has players cannot deal a game at all.
	ErrNotEnoughContent = errors.New("not enough prompts for that many players")
)

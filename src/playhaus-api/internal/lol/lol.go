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

	ErrTournamentNotFound = errors.New("tournament not found")
	ErrNotATournament     = errors.New("that room is not a tournament")
	ErrStageNotOver       = errors.New("some matches of this round are still being played")
	ErrStageStarted       = errors.New("this round has already started")
	ErrTournamentOver     = errors.New("tournament is already over")
	ErrTournamentRoom     = errors.New("that room belongs to a tournament")
)

type LobbyStatus string

const (
	LobbyWaiting LobbyStatus = "waiting" // waiting to start
	LobbyStarted LobbyStatus = "started"
)

type LobbyKind string

const (
	LobbyMultiplayer LobbyKind = "multiplayer"
	LobbyTournament  LobbyKind = "tournament"
)

func (k LobbyKind) Valid() bool { return k == LobbyMultiplayer || k == LobbyTournament }

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
	Kind           LobbyKind                `gorm:"not null;default:multiplayer"`
	// TournamentID is set both on a tournament's own lobby and on every match room it opens.
	TournamentID *uuid.UUID `gorm:"index;type:text"`
}

func (MultiplayerLeagueOfLettersLobby) TableName() string { return "mp_lol_lobbies" }

func (l MultiplayerLeagueOfLettersLobby) Full() bool {
	return len(l.Players) >= MaxPlayersFor(l.Kind)
}

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

type TournamentStatus string

const (
	TournamentInProgress TournamentStatus = "in_progress"
	TournamentCompleted  TournamentStatus = "completed"
)

type Bracket string

const (
	BracketWinners Bracket = "winners"
	BracketLosers  Bracket = "losers"
	BracketFinal   Bracket = "final"
)

type MatchStatus string

const (
	// MatchPending is a match that has been drawn but whose room has not been opened yet.
	MatchPending MatchStatus = "pending"
	MatchLive    MatchStatus = "live"
	MatchDone    MatchStatus = "done"
	MatchBye     MatchStatus = "bye"
)

// Tournament is a bracket of ordinary multiplayer games played by one lobby's table.
type Tournament struct {
	ID             uuid.UUID   `gorm:"primaryKey;type:text"`
	LobbyID        string      `gorm:"index;not null;type:text"` // the tournament lobby's join code
	OwnerID        string      `gorm:"index;not null"`
	Locale         i18n.Locale `gorm:"not null"`
	WordLength     int         `gorm:"not null"`
	SecondsPerTurn int         `gorm:"not null"`
	// Stage is the round of the bracket on the table right now, counting from 1.
	Stage     int                `gorm:"not null"`
	Status    TournamentStatus   `gorm:"not null"`
	WinnerID  *string            `gorm:"index"`
	Players   []TournamentPlayer `gorm:"foreignKey:TournamentID;constraint:OnDelete:CASCADE"`
	Matches   []TournamentMatch  `gorm:"foreignKey:TournamentID;constraint:OnDelete:CASCADE"`
	CreatedAt time.Time          `gorm:"not null"`
}

func (Tournament) TableName() string { return "tn_lol_tournaments" }

// Player is the entry this account holds in the bracket.
func (t Tournament) Player(userID string) *TournamentPlayer {
	for i := range t.Players {
		if t.Players[i].UserID == userID {
			return &t.Players[i]
		}
	}
	return nil
}

// Stand is who is still in, split by how many losses they carry.
func (t Tournament) Stand() (winners, losers []string) {
	for _, player := range t.Players {
		switch {
		case player.Eliminated():
			continue
		case player.Losses == 0:
			winners = append(winners, player.UserID)
		default:
			losers = append(losers, player.UserID)
		}
	}
	return winners, losers
}

// MatchesInStage are the matches drawn for one round of the bracket.
func (t Tournament) MatchesInStage(stage int) []TournamentMatch {
	var matches []TournamentMatch
	for _, match := range t.Matches {
		if match.Stage == stage {
			matches = append(matches, match)
		}
	}
	return matches
}

// StageOver reports whether every match of the stage on the table has a result.
func (t Tournament) StageOver() bool {
	for _, match := range t.MatchesInStage(t.Stage) {
		// A drawn round has not been played either, so it must not open the ready gate.
		if match.Status == MatchLive || match.Status == MatchPending {
			return false
		}
	}
	return true
}

// StagePending reports whether the stage on the table is drawn but waiting on the host to open it.
func (t Tournament) StagePending() bool {
	for _, match := range t.MatchesInStage(t.Stage) {
		if match.Status == MatchPending {
			return true
		}
	}
	return false
}

type TournamentPlayer struct {
	TournamentID uuid.UUID `gorm:"primaryKey;type:text"`
	UserID       string    `gorm:"primaryKey;index"`
	Seed         int       `gorm:"not null"` // Seed is the lobby seat they came in on
	Losses       int       `gorm:"not null"`
	// ReadyStage is the stage this player has readied for, so readiness resets when the bracket moves on.
	ReadyStage int  `gorm:"not null"`
	Placement  *int // Placement is the finishing position, set the moment they are out
}

func (TournamentPlayer) TableName() string { return "tn_lol_tournament_players" }

func (p TournamentPlayer) Eliminated() bool { return p.Losses >= TournamentLossesAllowed }

type TournamentMatch struct {
	ID           uuid.UUID `gorm:"primaryKey;type:text"`
	TournamentID uuid.UUID `gorm:"index;not null;type:text"`
	Stage        int       `gorm:"not null"`
	Bracket      Bracket   `gorm:"not null"`
	Position     int       `gorm:"not null"` // Position orders the matches within one bracket column
	// LobbyID and GameID are the ordinary multiplayer room this match is played in, and are nil for a bye.
	LobbyID   *string                 `gorm:"type:text"`
	GameID    *uuid.UUID              `gorm:"index;type:text"`
	Status    MatchStatus             `gorm:"not null"`
	WinnerID  *string                 `gorm:"index"`
	Players   []TournamentMatchPlayer `gorm:"foreignKey:MatchID;constraint:OnDelete:CASCADE"`
	CreatedAt time.Time               `gorm:"not null"`
}

func (TournamentMatch) TableName() string { return "tn_lol_matches" }

func (m TournamentMatch) Has(userID string) bool {
	for _, player := range m.Players {
		if player.UserID == userID {
			return true
		}
	}
	return false
}

type TournamentMatchPlayer struct {
	MatchID uuid.UUID `gorm:"primaryKey;type:text"`
	UserID  string    `gorm:"primaryKey;index"`
	Slot    int       `gorm:"not null"`
	Score   int       `gorm:"not null"`
	Place   int       `gorm:"not null"` // Place is 1-based and 0 until the match is settled
}

func (TournamentMatchPlayer) TableName() string { return "tn_lol_match_players" }

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
		&Tournament{},
		&TournamentPlayer{},
		&TournamentMatch{},
		&TournamentMatchPlayer{},
	}
}

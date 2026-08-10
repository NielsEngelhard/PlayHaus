package leagueofletters

import (
	"context"
	"errors"
	"time"

	"playhausapi/internal/database"

	"gorm.io/gorm"
)

// Errors the store speaks. They are deliberately not GORM's: this is the only
// file in the package that imports gorm, so that swapping the ORM — or the
// database — is a change to one file rather than to the rules of the game.
var (
	// ErrNotFound means a read matched no row.
	ErrNotFound = errors.New("leagueofletters: not found")

	// ErrConflict means a write lost a race with a unique index.
	ErrConflict = errors.New("leagueofletters: conflicting row")
)

// Store is every SQL statement in the package.
type Store struct{ db *database.DB }

func NewStore(db *database.DB) *Store { return &Store{db: db} }

// ScoreboardRow is one line of the scoreboard, joined against the accounts
// table so a player who renames mid-game is renamed on everyone's screen.
type ScoreboardRow struct {
	UserID        string
	Name          string
	AvatarColorID string
	Score         int
	JoinedAt      time.Time
}

func (s *Store) Game(ctx context.Context, gameID string) (Game, error) {
	var game Game
	err := s.db.Read.WithContext(ctx).Where("id = ?", gameID).First(&game).Error
	if err != nil {
		return Game{}, translate(err)
	}
	return game, nil
}

func (s *Store) IsPlayer(ctx context.Context, gameID, userID string) (bool, error) {
	var count int64
	err := s.db.Read.WithContext(ctx).Model(&Player{}).
		Where("game_id = ? AND user_id = ?", gameID, userID).
		Count(&count).Error
	if err != nil {
		return false, translate(err)
	}
	return count > 0, nil
}

// LatestRound returns the round in play. Rounds are numbered from 1 and never
// deleted, so the highest number is always the current one.
func (s *Store) LatestRound(ctx context.Context, gameID string) (Round, error) {
	return latestRound(s.db.Read.WithContext(ctx), gameID)
}

func (s *Store) RoundGuesses(ctx context.Context, roundID string) ([]Guess, error) {
	var guesses []Guess
	err := s.db.Read.WithContext(ctx).
		Where("round_id = ?", roundID).
		Order("created_at").
		Find(&guesses).Error
	if err != nil {
		return nil, translate(err)
	}
	return guesses, nil
}

func (s *Store) Scoreboard(ctx context.Context, gameID string) ([]ScoreboardRow, error) {
	var rows []ScoreboardRow

	err := s.db.Read.WithContext(ctx).
		Table("lol_players").
		Select("lol_players.user_id, app_users.name, app_users.avatar_color_id, lol_players.score, lol_players.joined_at").
		Joins("JOIN app_users ON app_users.id = lol_players.user_id").
		Where("lol_players.game_id = ?", gameID).
		Order("lol_players.joined_at").
		Scan(&rows).Error
	if err != nil {
		return nil, translate(err)
	}

	return rows, nil
}

// CreateGame writes the game, its host as the first player, and — when there is
// one — the opening round, as a single transaction. Half a game is worse than
// no game: a row with no players in it would be joinable and unplayable.
func (s *Store) CreateGame(ctx context.Context, game *Game, player *Player, round *Round) error {
	err := s.db.Write.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(game).Error; err != nil {
			return err
		}

		player.GameID = game.ID
		if err := tx.Create(player).Error; err != nil {
			return err
		}

		if round == nil {
			return nil
		}

		round.GameID = game.ID
		return tx.Create(round).Error
	})

	return translate(err)
}

// FinishGame closes a game, but only if it is still open, so two readers
// noticing the same expiry cannot both count as the one that ended it.
func (s *Store) FinishGame(ctx context.Context, gameID string) error {
	err := s.db.Write.WithContext(ctx).Model(&Game{}).
		Where("id = ? AND status = ?", gameID, StatusActive).
		Updates(map[string]any{
			"status":  StatusFinished,
			"version": gorm.Expr("version + 1"),
		}).Error

	return translate(err)
}

// InTx runs fn inside a write transaction. Everything fn touches goes through
// the Tx it is handed, so a read it depends on cannot accidentally be served
// from outside the transaction by the read pool.
func (s *Store) InTx(ctx context.Context, fn func(*Tx) error) error {
	err := s.db.Write.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(&Tx{tx: tx})
	})
	return translate(err)
}

// Tx is the store's API from inside a transaction.
type Tx struct{ tx *gorm.DB }

// Game re-reads the game inside the transaction. Callers generally already hold
// a copy, but that copy was read before the write lock was taken and may
// describe a game that has since finished.
func (t *Tx) Game(gameID string) (Game, error) {
	var game Game
	if err := t.tx.Where("id = ?", gameID).First(&game).Error; err != nil {
		return Game{}, translate(err)
	}
	return game, nil
}

func (t *Tx) LatestRound(gameID string) (Round, error) {
	return latestRound(t.tx, gameID)
}

// PlayerGuesses returns one player's guesses this round, oldest first. Read
// inside the transaction on purpose: how many guesses someone has already had
// is exactly the kind of thing two requests in flight at once would both read
// as five.
func (t *Tx) PlayerGuesses(roundID, userID string) ([]Guess, error) {
	var guesses []Guess
	err := t.tx.Where("round_id = ? AND user_id = ?", roundID, userID).
		Order("number").Find(&guesses).Error
	if err != nil {
		return nil, translate(err)
	}
	return guesses, nil
}

func (t *Tx) AddGuess(guess *Guess) error {
	return translate(t.tx.Create(guess).Error)
}

// AddScore moves a player's running total. Expressed as a relative update so it
// is the database that adds, never a read-modify-write in Go.
func (t *Tx) AddScore(gameID, userID string, points int) error {
	err := t.tx.Model(&Player{}).
		Where("game_id = ? AND user_id = ?", gameID, userID).
		Update("score", gorm.Expr("score + ?", points)).Error
	return translate(err)
}

// TouchGame bumps the game's version, and moves its status when one is given.
// The version bump is the record that something changed.
func (t *Tx) TouchGame(gameID string, status *Status) error {
	updates := map[string]any{"version": gorm.Expr("version + 1")}
	if status != nil {
		updates["status"] = *status
	}

	return translate(t.tx.Model(&Game{}).Where("id = ?", gameID).Updates(updates).Error)
}

func latestRound(db *gorm.DB, gameID string) (Round, error) {
	var round Round
	err := db.Where("game_id = ?", gameID).Order("number DESC").First(&round).Error
	if err != nil {
		return Round{}, translate(err)
	}
	return round, nil
}

// translate maps the driver's errors onto the store's own, so no caller has to
// know what GORM calls things.
func translate(err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, gorm.ErrRecordNotFound):
		return ErrNotFound
	case errors.Is(err, gorm.ErrDuplicatedKey):
		return ErrConflict
	default:
		return err
	}
}

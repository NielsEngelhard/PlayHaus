package fakefiller

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// The GORM half of Fake Filler.

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

// Compile-time check that we satisfy the interface.
var _ Store = (*GormStore)(nil)

// withRoster preloads a room's players in the order they arrived.
func withRoster(db *gorm.DB) *gorm.DB {
	return db.Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("seat ASC")
	})
}

// withBoard preloads everything a game is played on, already in the order it is drawn in.
func withBoard(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Order("turn_order ASC")
		}).
		Preload("Rounds", func(db *gorm.DB) *gorm.DB {
			return db.Order("number ASC")
		}).
		Preload("Rounds.Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("slot ASC, author_id ASC")
		}).
		Preload("Rounds.Votes", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC, voter_user_id ASC")
		})
}

// isUniqueViolation is the same test internal/user makes, and for the same reason.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	return strings.Contains(err.Error(), "UNIQUE constraint failed")
}

func (s *GormStore) CreateLobby(ctx context.Context, lobby *FFLobby) error {
	if err := s.db.WithContext(ctx).Create(lobby).Error; err != nil {
		return fmt.Errorf("insert lobby: %w", err)
	}
	return nil
}

func (s *GormStore) LobbyByCode(ctx context.Context, code string) (*FFLobby, error) {
	var lobby FFLobby

	err := withRoster(s.db.WithContext(ctx)).
		Where("id = ?", code).
		First(&lobby).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrLobbyNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select lobby: %w", err)
	}
	return &lobby, nil
}

func (s *GormStore) LobbyCodeTaken(ctx context.Context, code string) (bool, error) {
	var count int64

	err := s.db.WithContext(ctx).
		Model(&FFLobby{}).
		Where("id = ?", code).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count lobbies by code: %w", err)
	}

	return count > 0, nil
}

// WaitingLobbyByOwnerID is the newest room this player opened that nobody has started yet, and nothing else.
func (s *GormStore) WaitingLobbyByOwnerID(ctx context.Context, userID string) (*FFLobby, error) {
	var lobby FFLobby

	err := withRoster(s.db.WithContext(ctx)).
		Where("owner_id = ? AND status = ?", userID, LobbyWaiting).
		Order("created_at DESC").
		First(&lobby).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrLobbyNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select waiting lobby by owner: %w", err)
	}
	return &lobby, nil
}

func (s *GormStore) AddLobbyPlayer(ctx context.Context, player *FFLobbyPlayer) error {
	if err := s.db.WithContext(ctx).Create(player).Error; err != nil {
		return fmt.Errorf("insert lobby player: %w", err)
	}
	return nil
}

func (s *GormStore) RemoveLobbyPlayer(ctx context.Context, code, userID string) error {
	err := s.db.WithContext(ctx).
		Where("lobby_id = ? AND user_id = ?", code, userID).
		Delete(&FFLobbyPlayer{}).Error
	if err != nil {
		return fmt.Errorf("delete lobby player: %w", err)
	}
	return nil
}

func (s *GormStore) SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error {
	err := s.db.WithContext(ctx).
		Model(&FFLobby{}).
		Where("id = ?", code).
		Updates(map[string]any{
			"locale":    in.Locale,
			"game_mode": in.GameMode,
		}).Error
	if err != nil {
		return fmt.Errorf("update lobby settings: %w", err)
	}
	return nil
}

// SaveRematchCode points a finished room at the one its table moved on to.
func (s *GormStore) SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error) {
	res := s.db.WithContext(ctx).
		Model(&FFLobby{}).
		Where("id = ? AND rematch_code IS NULL", code).
		Update("rematch_code", rematchCode)
	if res.Error != nil {
		return false, fmt.Errorf("update lobby rematch code: %w", res.Error)
	}

	return res.RowsAffected == 1, nil
}

// DeleteLobby drops the room and its seats.
func (s *GormStore) DeleteLobby(ctx context.Context, code string) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("lobby_id = ?", code).Delete(&FFLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		if err := tx.Where("id = ?", code).Delete(&FFLobby{}).Error; err != nil {
			return fmt.Errorf("delete lobby: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete lobby: %w", err)
	}
	return nil
}

// DeleteLobbiesOlderThan drops rooms and their seats, waiting or started.
func (s *GormStore) DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var codes []string
		err := tx.Model(&FFLobby{}).
			Where("created_at < ?", before).
			Pluck("id", &codes).Error
		if err != nil {
			return fmt.Errorf("select lobbies: %w", err)
		}
		if len(codes) == 0 {
			return nil
		}

		if err := tx.Where("lobby_id IN ?", codes).Delete(&FFLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		result := tx.Where("id IN ?", codes).Delete(&FFLobby{})
		if result.Error != nil {
			return fmt.Errorf("delete lobbies: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("delete lobbies older than cutoff: %w", err)
	}
	return deleted, nil
}

// StartLobby writes the game and points the room at it, together.
func (s *GormStore) StartLobby(ctx context.Context, lobby *FFLobby, game *FFMultiDeviceGame) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the rounds, the scoreboard and the truth option, all through their associations.
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("insert game: %w", err)
		}

		// Named columns rather than Save: the lobby was loaded with its players preloaded.
		res := tx.Model(&FFLobby{}).
			Where("id = ? AND status = ?", lobby.ID, LobbyWaiting).
			Updates(map[string]any{"status": LobbyStarted, "game_id": game.ID})
		if res.Error != nil {
			return fmt.Errorf("mark lobby started: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			// Somebody else started it between the read and here.
			return ErrLobbyStarted
		}

		return nil
	})
}

func (s *GormStore) GameByID(ctx context.Context, id uuid.UUID) (*FFMultiDeviceGame, error) {
	var game FFMultiDeviceGame

	err := withBoard(s.db.WithContext(ctx)).
		Where("id = ?", id).
		First(&game).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select game: %w", err)
	}
	return &game, nil
}

// GamesByUserID is every unfinished game this player has a seat at.
func (s *GormStore) GamesByUserID(ctx context.Context, userID string) ([]*FFMultiDeviceGame, error) {
	var games []*FFMultiDeviceGame

	err := s.db.WithContext(ctx).
		Joins("JOIN ff_game_players ON ff_game_players.game_id = ff_games.id").
		Where("ff_game_players.user_id = ? AND ff_games.status = ?", userID, GameInProgress).
		Order("ff_games.created_at DESC").
		Find(&games).Error
	if err != nil {
		return nil, fmt.Errorf("select games for user: %w", err)
	}

	return games, nil
}

// AbandonGame ends a game for the whole table.
func (s *GormStore) AbandonGame(ctx context.Context, gameID uuid.UUID) error {
	err := s.db.WithContext(ctx).
		Model(&FFMultiDeviceGame{}).
		Where("id = ? AND status = ?", gameID, GameInProgress).
		Update("status", GameAbandoned).Error
	if err != nil {
		return fmt.Errorf("abandon game: %w", err)
	}
	return nil
}

// DeleteGamesOlderThan drops games and everything hanging off them.
func (s *GormStore) DeleteGamesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var gameIDs []uuid.UUID
		err := tx.Model(&FFMultiDeviceGame{}).
			Where("created_at < ?", before).
			Pluck("id", &gameIDs).Error
		if err != nil {
			return fmt.Errorf("select games: %w", err)
		}
		if len(gameIDs) == 0 {
			return nil
		}

		var roundIDs []uuid.UUID
		err = tx.Model(&FFRound{}).
			Where("game_id IN ?", gameIDs).
			Pluck("id", &roundIDs).Error
		if err != nil {
			return fmt.Errorf("select rounds: %w", err)
		}

		// Deepest first, so no row is ever orphaned mid-transaction.
		if len(roundIDs) > 0 {
			if err := tx.Where("round_id IN ?", roundIDs).Delete(&FFVote{}).Error; err != nil {
				return fmt.Errorf("delete votes: %w", err)
			}
			if err := tx.Where("round_id IN ?", roundIDs).Delete(&FFOption{}).Error; err != nil {
				return fmt.Errorf("delete options: %w", err)
			}
			if err := tx.Where("id IN ?", roundIDs).Delete(&FFRound{}).Error; err != nil {
				return fmt.Errorf("delete rounds: %w", err)
			}
		}
		if err := tx.Where("game_id IN ?", gameIDs).Delete(&FFGamePlayer{}).Error; err != nil {
			return fmt.Errorf("delete game players: %w", err)
		}
		result := tx.Where("id IN ?", gameIDs).Delete(&FFMultiDeviceGame{})
		if result.Error != nil {
			return fmt.Errorf("delete games: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("delete games older than cutoff: %w", err)
	}
	return deleted, nil
}

// SaveAnswer writes one option row and reports how many player-written answers the game holds afterwards.
func (s *GormStore) SaveAnswer(ctx context.Context, in SaveAnswerInput) (int, error) {
	var answered int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(in.Option).Error; err != nil {
			if isUniqueViolation(err) {
				return ErrAlreadyAnswered
			}
			return fmt.Errorf("insert answer: %w", err)
		}

		// Everything but the truth: that row was written when the game was dealt.
		err := tx.Model(&FFOption{}).
			Joins("JOIN ff_rounds ON ff_rounds.id = ff_round_options.round_id").
			Where("ff_rounds.game_id = ? AND ff_round_options.author_id <> ?", in.GameID, TruthAuthorID).
			Count(&answered).Error
		if err != nil {
			return fmt.Errorf("count answers: %w", err)
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	return int(answered), nil
}

// errVotingAlreadyOpen unwinds OpenVoting's transaction without it being a failure.
var errVotingAlreadyOpen = errors.New("voting is already open")

// OpenVoting flips a game into its second half and writes down the order the options are to be shown in.
func (s *GormStore) OpenVoting(ctx context.Context, gameID uuid.UUID, slots []SlotAssignment) (bool, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&FFMultiDeviceGame{}).
			Where("id = ? AND phase = ? AND status = ?", gameID, PhaseWriting, GameInProgress).
			Updates(map[string]any{"phase": PhaseVoting, "current_round": 1})
		if res.Error != nil {
			return fmt.Errorf("open voting: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return errVotingAlreadyOpen
		}

		for _, slot := range slots {
			err := tx.Model(&FFOption{}).
				Where("round_id = ? AND author_id = ?", slot.RoundID, slot.AuthorID).
				Update("slot", slot.Slot).Error
			if err != nil {
				return fmt.Errorf("assign option slot: %w", err)
			}
		}

		return nil
	})

	if errors.Is(err, errVotingAlreadyOpen) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// RecordVote writes one vote, pays for it, and moves the game on if it was the last one the round was waiting for.
func (s *GormStore) RecordVote(ctx context.Context, in RecordVoteInput) (*RecordVoteResult, error) {
	result := &RecordVoteResult{}

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var game FFMultiDeviceGame
		if err := tx.Where("id = ?", in.GameID).First(&game).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrGameNotFound
			}
			return fmt.Errorf("select game: %w", err)
		}
		if game.Status != GameInProgress {
			return ErrGameFinished
		}
		if game.Phase != PhaseVoting {
			return ErrWrongPhase
		}
		if game.CurrentRound != in.RoundNumber {
			return ErrWrongRound
		}

		if err := tx.Create(in.Vote).Error; err != nil {
			if isUniqueViolation(err) {
				return ErrAlreadyVoted
			}
			return fmt.Errorf("insert vote: %w", err)
		}

		// Increments rather than a read and a write.
		if in.GuesserID != "" && in.GuesserPoints != 0 {
			if err := addScore(tx, in.GameID, in.GuesserID, in.GuesserPoints); err != nil {
				return err
			}
		}
		if in.AuthorID != "" && in.AuthorPoints != 0 {
			if err := addScore(tx, in.GameID, in.AuthorID, in.AuthorPoints); err != nil {
				return err
			}
		}

		var votes int64
		if err := tx.Model(&FFVote{}).Where("round_id = ?", in.Vote.RoundID).Count(&votes).Error; err != nil {
			return fmt.Errorf("count votes: %w", err)
		}
		result.Votes = int(votes)
		result.CurrentRound = in.RoundNumber

		if int(votes) < in.VotersNeeded {
			return nil
		}

		result.RoundOver = true

		// Past the last round there is nothing to advance to.
		update := map[string]any{"current_round": in.RoundNumber + 1}
		if in.RoundNumber >= in.TotalRounds {
			update = map[string]any{"status": GameCompleted}
			result.GameOver = true
			result.CurrentRound = in.RoundNumber
		} else {
			result.CurrentRound = in.RoundNumber + 1
		}

		res := tx.Model(&FFMultiDeviceGame{}).
			Where("id = ? AND current_round = ? AND status = ?", in.GameID, in.RoundNumber, GameInProgress).
			Updates(update)
		if res.Error != nil {
			return fmt.Errorf("advance game: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			// Cannot happen: the read at the top of this transaction saw the game on this round.
			return ErrWrongRound
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return result, nil
}

func addScore(tx *gorm.DB, gameID uuid.UUID, userID string, points int) error {
	err := tx.Model(&FFGamePlayer{}).
		Where("game_id = ? AND user_id = ?", gameID, userID).
		UpdateColumn("score", gorm.Expr("score + ?", points)).Error
	if err != nil {
		return fmt.Errorf("add score: %w", err)
	}
	return nil
}

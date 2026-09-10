package oneofus

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// The GORM half of multi-device One of Us, on the same store the single-device game uses.

var _ MultiDeviceStore = (*GormStore)(nil)

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
			return db.Order("seat ASC")
		}).
		Preload("Rounds", func(db *gorm.DB) *gorm.DB {
			return db.Order("number ASC")
		}).
		Preload("Rounds.Answers", func(db *gorm.DB) *gorm.DB {
			return db.Order("slot ASC, user_id ASC")
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

func (s *GormStore) CreateLobby(ctx context.Context, lobby *OOULobby) error {
	if err := s.db.WithContext(ctx).Create(lobby).Error; err != nil {
		return fmt.Errorf("insert lobby: %w", err)
	}

	return nil
}

func (s *GormStore) LobbyByCode(ctx context.Context, code string) (*OOULobby, error) {
	var lobby OOULobby

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
		Model(&OOULobby{}).
		Where("id = ?", code).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count lobbies by code: %w", err)
	}

	return count > 0, nil
}

// WaitingLobbyByOwnerID is the newest room this player opened that nobody has started yet, and nothing else.
func (s *GormStore) WaitingLobbyByOwnerID(ctx context.Context, userID string) (*OOULobby, error) {
	var lobby OOULobby

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

func (s *GormStore) AddLobbyPlayer(ctx context.Context, player *OOULobbyPlayer) error {
	if err := s.db.WithContext(ctx).Create(player).Error; err != nil {
		return fmt.Errorf("insert lobby player: %w", err)
	}

	return nil
}

func (s *GormStore) RemoveLobbyPlayer(ctx context.Context, code, userID string) error {
	err := s.db.WithContext(ctx).
		Where("lobby_id = ? AND user_id = ?", code, userID).
		Delete(&OOULobbyPlayer{}).Error
	if err != nil {
		return fmt.Errorf("delete lobby player: %w", err)
	}

	return nil
}

func (s *GormStore) SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error {
	err := s.db.WithContext(ctx).
		Model(&OOULobby{}).
		Where("id = ?", code).
		Updates(map[string]any{
			"locale":        in.Locale,
			"game_mode":     in.GameMode,
			"enabled_roles": in.EnabledRoles,
		}).Error
	if err != nil {
		return fmt.Errorf("update lobby settings: %w", err)
	}

	return nil
}

// SaveRematchCode points a finished room at the one its table moved on to.
func (s *GormStore) SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error) {
	res := s.db.WithContext(ctx).
		Model(&OOULobby{}).
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
		if err := tx.Where("lobby_id = ?", code).Delete(&OOULobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		if err := tx.Where("id = ?", code).Delete(&OOULobby{}).Error; err != nil {
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
		err := tx.Model(&OOULobby{}).
			Where("created_at < ?", before).
			Pluck("id", &codes).Error
		if err != nil {
			return fmt.Errorf("select lobbies: %w", err)
		}
		if len(codes) == 0 {
			return nil
		}

		if err := tx.Where("lobby_id IN ?", codes).Delete(&OOULobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}

		result := tx.Where("id IN ?", codes).Delete(&OOULobby{})
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

// StartLobby writes the dealt game and points the room at it, together.
func (s *GormStore) StartLobby(ctx context.Context, lobby *OOULobby, game *OOUMultiDeviceGame) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the roster and the first round through their associations.
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("insert game: %w", err)
		}

		// Named columns rather than Save: the lobby was loaded with its players preloaded.
		res := tx.Model(&OOULobby{}).
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

func (s *GormStore) MultiDeviceGameByID(ctx context.Context, id uuid.UUID) (*OOUMultiDeviceGame, error) {
	var game OOUMultiDeviceGame

	err := withBoard(s.db.WithContext(ctx)).
		Where("id = ?", id).
		First(&game).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select multi device game: %w", err)
	}

	return &game, nil
}

// MultiDeviceGamesByUserID is every unfinished game this player has a seat at.
func (s *GormStore) MultiDeviceGamesByUserID(ctx context.Context, userID string) ([]*OOUMultiDeviceGame, error) {
	var games []*OOUMultiDeviceGame

	err := s.db.WithContext(ctx).
		Joins("JOIN oou_game_players ON oou_game_players.game_id = oou_multi_device_games.id").
		Where("oou_game_players.user_id = ? AND oou_multi_device_games.status = ?", userID, GameInProgress).
		Order("oou_multi_device_games.created_at DESC").
		Find(&games).Error
	if err != nil {
		return nil, fmt.Errorf("select multi device games for user: %w", err)
	}

	return games, nil
}

// AbandonMultiDeviceGame ends a game for the whole table.
func (s *GormStore) AbandonMultiDeviceGame(ctx context.Context, gameID uuid.UUID) error {
	err := s.db.WithContext(ctx).
		Model(&OOUMultiDeviceGame{}).
		Where("id = ? AND status = ?", gameID, GameInProgress).
		Updates(map[string]any{"status": GameAbandoned, "finished_at": time.Now().UTC()}).Error
	if err != nil {
		return fmt.Errorf("abandon multi device game: %w", err)
	}

	return nil
}

// DeleteMultiDeviceGamesOlderThan drops games and everything hanging off them.
func (s *GormStore) DeleteMultiDeviceGamesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var gameIDs []uuid.UUID
		err := tx.Model(&OOUMultiDeviceGame{}).
			Where("created_at < ?", before).
			Pluck("id", &gameIDs).Error
		if err != nil {
			return fmt.Errorf("select multi device games: %w", err)
		}
		if len(gameIDs) == 0 {
			return nil
		}

		var roundIDs []uuid.UUID
		err = tx.Model(&OOURound{}).
			Where("game_id IN ?", gameIDs).
			Pluck("id", &roundIDs).Error
		if err != nil {
			return fmt.Errorf("select rounds: %w", err)
		}

		// Deepest first, so no row is ever orphaned mid-transaction.
		if len(roundIDs) > 0 {
			if err := tx.Where("round_id IN ?", roundIDs).Delete(&OOUVote{}).Error; err != nil {
				return fmt.Errorf("delete votes: %w", err)
			}
			if err := tx.Where("round_id IN ?", roundIDs).Delete(&OOUAnswer{}).Error; err != nil {
				return fmt.Errorf("delete answers: %w", err)
			}
			if err := tx.Where("id IN ?", roundIDs).Delete(&OOURound{}).Error; err != nil {
				return fmt.Errorf("delete rounds: %w", err)
			}
		}

		if err := tx.Where("game_id IN ?", gameIDs).Delete(&OOUGamePlayer{}).Error; err != nil {
			return fmt.Errorf("delete game players: %w", err)
		}

		result := tx.Where("id IN ?", gameIDs).Delete(&OOUMultiDeviceGame{})
		if result.Error != nil {
			return fmt.Errorf("delete multi device games: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("delete multi device games older than cutoff: %w", err)
	}

	return deleted, nil
}

// SaveAnswer writes one answer row and reports how many the round holds afterwards.
func (s *GormStore) SaveAnswer(ctx context.Context, in SaveAnswerInput) (int, error) {
	var answered int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := guardPlayable(tx, in.GameID, PhaseAnswer, in.RoundNumber); err != nil {
			return err
		}

		if err := tx.Create(in.Answer).Error; err != nil {
			if isUniqueViolation(err) {
				return ErrAlreadyAnswered
			}

			return fmt.Errorf("insert answer: %w", err)
		}

		if err := tx.Model(&OOUAnswer{}).Where("round_id = ?", in.Answer.RoundID).Count(&answered).Error; err != nil {
			return fmt.Errorf("count answers: %w", err)
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	return int(answered), nil
}

// errPhaseAlreadyMoved unwinds a transaction that lost the race, without it being a failure.
var errPhaseAlreadyMoved = errors.New("phase has already moved")

// guardPlayable is the check every play write makes before it writes: this game, this phase, this round.
func guardPlayable(tx *gorm.DB, gameID uuid.UUID, phase Phase, roundNumber int) error {
	var game OOUMultiDeviceGame

	if err := tx.Where("id = ?", gameID).First(&game).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGameNotFound
		}

		return fmt.Errorf("select multi device game: %w", err)
	}

	if game.Over() {
		return ErrGameFinished
	}
	if game.Phase != phase {
		return ErrWrongPhase
	}
	if game.CurrentRound != roundNumber {
		return ErrWrongRound
	}

	return nil
}

// OpenVoting flips a round into its voting half and writes down the order the answers are to be shown in.
func (s *GormStore) OpenVoting(ctx context.Context, in OpenVotingInput) (bool, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&OOUMultiDeviceGame{}).
			Where("id = ? AND phase = ? AND current_round = ? AND status = ?", in.GameID, PhaseAnswer, in.RoundNumber, GameInProgress).
			Update("phase", PhaseVote)
		if res.Error != nil {
			return fmt.Errorf("open voting: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return errPhaseAlreadyMoved
		}

		for _, slot := range in.Slots {
			err := tx.Model(&OOUAnswer{}).
				Where("round_id = ? AND user_id = ?", slot.RoundID, slot.UserID).
				Update("slot", slot.Slot).Error
			if err != nil {
				return fmt.Errorf("assign answer slot: %w", err)
			}
		}

		return nil
	})

	if errors.Is(err, errPhaseAlreadyMoved) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

// RecordVote writes one accusation and reports how many the round holds afterwards.
func (s *GormStore) RecordVote(ctx context.Context, in RecordVoteInput) (int, error) {
	var votes int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := guardPlayable(tx, in.GameID, PhaseVote, in.RoundNumber); err != nil {
			return err
		}

		if err := tx.Create(in.Vote).Error; err != nil {
			if isUniqueViolation(err) {
				return ErrAlreadyVoted
			}

			return fmt.Errorf("insert vote: %w", err)
		}

		if err := tx.Model(&OOUVote{}).Where("round_id = ?", in.Vote.RoundID).Count(&votes).Error; err != nil {
			return fmt.Errorf("count votes: %w", err)
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	return int(votes), nil
}

// CloseRound stamps the round with what the vote decided, takes the player it named, and ends the game if that was the last one.
func (s *GormStore) CloseRound(ctx context.Context, in CloseRoundInput) (bool, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now().UTC()

		res := tx.Model(&OOUMultiDeviceGame{}).
			Where("id = ? AND phase = ? AND current_round = ? AND status = ?", in.GameID, PhaseVote, in.RoundNumber, GameInProgress).
			Update("phase", PhaseReveal)
		if res.Error != nil {
			return fmt.Errorf("close round: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return errPhaseAlreadyMoved
		}

		err := tx.Model(&OOURound{}).
			Where("id = ? AND closed_at IS NULL", in.RoundID).
			Updates(map[string]any{
				"eliminated_user_id":  in.EliminatedUserID,
				"eliminated_role":     in.EliminatedRole,
				"eliminated_votes":    in.EliminatedVotes,
				"tie_broken_by_mayor": in.TieBrokenByMayor,
				"closed_at":           now,
			}).Error
		if err != nil {
			return fmt.Errorf("stamp round: %w", err)
		}

		err = tx.Model(&OOUGamePlayer{}).
			Where("game_id = ? AND user_id = ?", in.GameID, in.EliminatedUserID).
			Updates(map[string]any{"is_voted_out": true, "is_mayor": false, "voted_out_round": in.RoundNumber}).Error
		if err != nil {
			return fmt.Errorf("vote player out: %w", err)
		}

		if len(in.MayorOrder) > 0 {
			if err := handOnTheChain(tx, in.GameID, in.MayorOrder); err != nil {
				return err
			}
		}

		if in.GameEnded {
			err := tx.Model(&OOUMultiDeviceGame{}).
				Where("id = ? AND status = ?", in.GameID, GameInProgress).
				Updates(map[string]any{
					"status":        GameCompleted,
					"civilians_won": in.CiviliansWon,
					"finished_at":   now,
				}).Error
			if err != nil {
				return fmt.Errorf("finish game: %w", err)
			}
		}

		return nil
	})

	if errors.Is(err, errPhaseAlreadyMoved) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

// handOnTheChain gives the mayor's chain to the first of order who is still in the game.
func handOnTheChain(tx *gorm.DB, gameID uuid.UUID, order []string) error {
	err := tx.Model(&OOUGamePlayer{}).
		Where("game_id = ?", gameID).
		Update("is_mayor", false).Error
	if err != nil {
		return fmt.Errorf("take the chain off: %w", err)
	}

	for _, userID := range order {
		res := tx.Model(&OOUGamePlayer{}).
			Where("game_id = ? AND user_id = ? AND is_voted_out = ?", gameID, userID, false).
			Update("is_mayor", true)
		if res.Error != nil {
			return fmt.Errorf("hand the chain on: %w", res.Error)
		}
		if res.RowsAffected == 1 {
			return nil
		}
	}

	return nil
}

// OpenRound leaves the reveal and writes the next round, together.
func (s *GormStore) OpenRound(ctx context.Context, in OpenRoundInput) (bool, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&OOUMultiDeviceGame{}).
			Where("id = ? AND phase = ? AND current_round = ? AND status = ?", in.GameID, PhaseReveal, in.FromRound, GameInProgress).
			Updates(map[string]any{"phase": PhaseAnswer, "current_round": in.Round.Number})
		if res.Error != nil {
			return fmt.Errorf("open round: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return errPhaseAlreadyMoved
		}

		if err := tx.Create(in.Round).Error; err != nil {
			if isUniqueViolation(err) {
				// The CAS above was won, so a round already on this number is a row this transaction can leave alone.
				return nil
			}

			return fmt.Errorf("insert round: %w", err)
		}

		return nil
	})

	if errors.Is(err, errPhaseAlreadyMoved) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

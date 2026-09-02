package lol

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Compile-time check that the multiplayer half is implemented too.
var _ MultiplayerStore = (*GormStore)(nil)

// withRoster preloads a lobby's players in the order they arrived, which is the
// order the room list draws them in and the order the turns are dealt in.
//
// By seat rather than by joined_at: the timestamps can tie, and a turn order that
// depends on which of two equal timestamps the database returns first is not one.
func withRoster(db *gorm.DB) *gorm.DB {
	return db.Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("seat ASC")
	})
}

// withTable preloads everything a multiplayer game is played on: the same board
// tree as a solo game, plus the scoreboard.
func withTable(db *gorm.DB) *gorm.DB {
	return withBoard(db).Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("turn_order ASC")
	})
}

func (s *GormStore) CreateLobby(ctx context.Context, lobby *MultiplayerLeagueOfLettersLobby) error {
	if err := s.db.WithContext(ctx).Create(lobby).Error; err != nil {
		return fmt.Errorf("insert lobby: %w", err)
	}
	return nil
}

func (s *GormStore) LobbyByCode(ctx context.Context, code string) (*MultiplayerLeagueOfLettersLobby, error) {
	var lobby MultiplayerLeagueOfLettersLobby

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

// WaitingLobbyByOwnerID is the newest room this player opened that nobody has
// started yet, and nothing else: a room that has become a game is a game, and the
// question this answers is "is there still a door standing open with my name on it".
//
// Rooms are handed back when their host leaves the screen, so in practice this only
// finds one the give-back never reached -- an app that was killed, a connection that
// died on the way out. Which is exactly the room the host has forgotten about and
// would otherwise strand.
func (s *GormStore) WaitingLobbyByOwnerID(ctx context.Context, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	var lobby MultiplayerLeagueOfLettersLobby

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

// AbandonMultiplayerGame ends a game for the whole table.
//
// Conditional on it still being in progress, so a host pressing this while the last
// round is being decided does not overwrite a game that finished properly -- a
// completed game is a result people are looking at, and this is not a way to take it
// off them.
func (s *GormStore) AbandonMultiplayerGame(ctx context.Context, gameID uuid.UUID) error {
	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersGame{}).
		Where("id = ? AND status = ?", gameID, GameInProgress).
		Update("status", GameAbandoned).Error
	if err != nil {
		return fmt.Errorf("abandon multiplayer game: %w", err)
	}
	return nil
}

func (s *GormStore) LobbyCodeTaken(ctx context.Context, code string) (bool, error) {
	var count int64

	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersLobby{}).
		Where("id = ?", code).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count lobbies by code: %w", err)
	}

	return count > 0, nil
}

func (s *GormStore) AddLobbyPlayer(ctx context.Context, player *MultiplayerLobbyPlayer) error {
	if err := s.db.WithContext(ctx).Create(player).Error; err != nil {
		return fmt.Errorf("insert lobby player: %w", err)
	}
	return nil
}

func (s *GormStore) RemoveLobbyPlayer(ctx context.Context, code, userID string) error {
	err := s.db.WithContext(ctx).
		Where("lobby_id = ? AND user_id = ?", code, userID).
		Delete(&MultiplayerLobbyPlayer{}).Error
	if err != nil {
		return fmt.Errorf("delete lobby player: %w", err)
	}
	return nil
}

func (s *GormStore) SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error {
	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersLobby{}).
		Where("id = ?", code).
		Updates(map[string]any{"locale": in.Locale, "word_length": in.WordLength}).Error
	if err != nil {
		return fmt.Errorf("update lobby settings: %w", err)
	}
	return nil
}

// SaveRematchCode points a finished room at the one its table moved on to, and reports
// whether this caller was the one that got to set it.
//
// Conditional on the slot still being empty, the same way StartLobby's write is
// conditional on the room still waiting: the host pressing the button twice is two
// rooms opened and only one of them anybody is told about, so the loser has to find out
// that it lost.
func (s *GormStore) SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error) {
	res := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersLobby{}).
		Where("id = ? AND rematch_code IS NULL", code).
		Update("rematch_code", rematchCode)
	if res.Error != nil {
		return false, fmt.Errorf("update lobby rematch code: %w", res.Error)
	}

	return res.RowsAffected == 1, nil
}

// DeleteLobby drops the room and its seats. The game a started room left behind is
// deliberately not touched: people are still playing it, and the room was only ever
// the door they came in through.
func (s *GormStore) DeleteLobby(ctx context.Context, code string) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("lobby_id = ?", code).Delete(&MultiplayerLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		if err := tx.Where("id = ?", code).Delete(&MultiplayerLeagueOfLettersLobby{}).Error; err != nil {
			return fmt.Errorf("delete lobby: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete lobby: %w", err)
	}
	return nil
}

// DeleteLobbiesOlderThan drops rooms (and their seats) created before the cutoff,
// waiting or started -- a room this old has nobody still walking through its door.
// Used by the retention sweep, not by anything a player triggers.
func (s *GormStore) DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var codes []string
		err := tx.Model(&MultiplayerLeagueOfLettersLobby{}).
			Where("created_at < ?", before).
			Pluck("id", &codes).Error
		if err != nil {
			return fmt.Errorf("select lobbies: %w", err)
		}
		if len(codes) == 0 {
			return nil
		}

		if err := tx.Where("lobby_id IN ?", codes).Delete(&MultiplayerLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		result := tx.Where("id IN ?", codes).Delete(&MultiplayerLeagueOfLettersLobby{})
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

// DeleteMultiplayerGamesOlderThan drops started games (and their boards and
// scoreboards) created before the cutoff. Used by the retention sweep, not by
// anything a player triggers.
func (s *GormStore) DeleteMultiplayerGamesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var gameIDs []uuid.UUID
		err := tx.Model(&MultiplayerLeagueOfLettersGame{}).
			Where("created_at < ?", before).
			Pluck("id", &gameIDs).Error
		if err != nil {
			return fmt.Errorf("select games: %w", err)
		}
		if len(gameIDs) == 0 {
			return nil
		}

		var roundIDs []uuid.UUID
		err = tx.Model(&LeagueOfLettersRound{}).
			Where("game_id IN ?", gameIDs).
			Pluck("id", &roundIDs).Error
		if err != nil {
			return fmt.Errorf("select rounds: %w", err)
		}

		var guessIDs []uuid.UUID
		if len(roundIDs) > 0 {
			err = tx.Model(&LeagueOfLettersGuess{}).
				Where("round_id IN ?", roundIDs).
				Pluck("id", &guessIDs).Error
			if err != nil {
				return fmt.Errorf("select guesses: %w", err)
			}
		}

		// Deepest first, so no row is ever orphaned mid-transaction.
		if len(guessIDs) > 0 {
			if err := tx.Where("guess_id IN ?", guessIDs).Delete(&LeagueOfLettersValidatedLetter{}).Error; err != nil {
				return fmt.Errorf("delete letters: %w", err)
			}
			if err := tx.Where("id IN ?", guessIDs).Delete(&LeagueOfLettersGuess{}).Error; err != nil {
				return fmt.Errorf("delete guesses: %w", err)
			}
		}
		if len(roundIDs) > 0 {
			if err := tx.Where("id IN ?", roundIDs).Delete(&LeagueOfLettersRound{}).Error; err != nil {
				return fmt.Errorf("delete rounds: %w", err)
			}
		}
		if err := tx.Where("game_id IN ?", gameIDs).Delete(&MultiplayerGamePlayer{}).Error; err != nil {
			return fmt.Errorf("delete game players: %w", err)
		}
		result := tx.Where("id IN ?", gameIDs).Delete(&MultiplayerLeagueOfLettersGame{})
		if result.Error != nil {
			return fmt.Errorf("delete games: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("delete multiplayer games older than cutoff: %w", err)
	}
	return deleted, nil
}

// StartLobby writes the game and points the lobby at it, together.
//
// One transaction because the two halves are meaningless apart: a lobby marked
// started with no game is a room whose players are sent to a board that is not
// there, and a game no lobby points at is one nobody can find.
func (s *GormStore) StartLobby(ctx context.Context, lobby *MultiplayerLeagueOfLettersLobby, game *MultiplayerLeagueOfLettersGame) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the rounds and the scoreboard through their associations.
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("insert multiplayer game: %w", err)
		}

		// Named columns rather than Save: the lobby was loaded with its players
		// preloaded, and saving it whole would write the roster back too.
		res := tx.Model(&MultiplayerLeagueOfLettersLobby{}).
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
	if err != nil {
		return err
	}
	return nil
}

func (s *GormStore) MultiplayerGameByID(ctx context.Context, id uuid.UUID) (*MultiplayerLeagueOfLettersGame, error) {
	var game MultiplayerLeagueOfLettersGame

	err := withTable(s.db.WithContext(ctx)).
		Where("id = ?", id).
		First(&game).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select multiplayer game: %w", err)
	}
	return &game, nil
}

// MultiplayerGamesByUserID is every unfinished game this player has a seat at.
// Used by the reconnect list, so the board is not loaded -- only the row is.
func (s *GormStore) MultiplayerGamesByUserID(ctx context.Context, userID string) ([]*MultiplayerLeagueOfLettersGame, error) {
	var games []*MultiplayerLeagueOfLettersGame

	err := s.db.WithContext(ctx).
		Joins("JOIN mp_lol_game_players ON mp_lol_game_players.game_id = mp_lol_games.id").
		Where("mp_lol_game_players.user_id = ? AND mp_lol_games.status = ?", userID, GameInProgress).
		Order("mp_lol_games.created_at DESC").
		Find(&games).Error
	if err != nil {
		return nil, fmt.Errorf("select multiplayer games for user: %w", err)
	}

	return games, nil
}

// RecordMultiplayerGuess writes one row and the game state it moved -- but only if
// the game is still where the caller found it.
//
// The conditional update goes first, before anything is inserted, so a guess that
// lost a race to the turn timeout is refused rather than half-applied. With SQLite
// on a single connection this is belt and braces; with anything else it is the
// thing that makes two players pressing Raden at once safe.
func (s *GormStore) RecordMultiplayerGuess(ctx context.Context, in RecordMultiplayerGuessInput) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&MultiplayerLeagueOfLettersGame{}).
			Where("id = ? AND turn_user_id = ? AND current_round = ? AND status = ?",
				in.Game.ID, in.ExpectTurnUserID, in.ExpectRound, GameInProgress).
			Updates(map[string]any{
				"turn_user_id":  in.Game.TurnUserID,
				"turn_ends_at":  in.Game.TurnEndsAt,
				"current_round": in.Game.CurrentRound,
				"status":        in.Game.Status,
			})
		if res.Error != nil {
			return fmt.Errorf("update multiplayer game: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return ErrNotYourTurn
		}

		// Creates the letters too, through the association. A skipped row has none,
		// which is what makes it draw as an empty row rather than a scored one.
		if err := tx.Create(in.Guess).Error; err != nil {
			return fmt.Errorf("insert guess: %w", err)
		}

		if in.ScoreFor != "" && in.Score != 0 {
			err := tx.Model(&MultiplayerGamePlayer{}).
				Where("game_id = ? AND user_id = ?", in.Game.ID, in.ScoreFor).
				UpdateColumn("score", gorm.Expr("score + ?", in.Score)).Error
			if err != nil {
				return fmt.Errorf("add score: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

// RestartTurn gives the current player their clock back. Conditional on it still
// being their turn, so a resume that raced a real guess does nothing.
func (s *GormStore) RestartTurn(ctx context.Context, gameID uuid.UUID, expectTurnUserID string, endsAt time.Time) error {
	err := s.db.WithContext(ctx).
		Model(&MultiplayerLeagueOfLettersGame{}).
		Where("id = ? AND turn_user_id = ? AND status = ?", gameID, expectTurnUserID, GameInProgress).
		Update("turn_ends_at", endsAt).Error
	if err != nil {
		return fmt.Errorf("restart turn: %w", err)
	}
	return nil
}

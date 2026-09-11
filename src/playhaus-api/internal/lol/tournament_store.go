package lol

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var _ TournamentStore = (*GormStore)(nil)

// withBracket preloads everything the waiting screen draws.
func withBracket(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Players", func(db *gorm.DB) *gorm.DB { return db.Order("seed ASC") }).
		Preload("Matches", func(db *gorm.DB) *gorm.DB { return db.Order("stage ASC, bracket ASC, position ASC") }).
		Preload("Matches.Players", func(db *gorm.DB) *gorm.DB { return db.Order("slot ASC") })
}

func (s *GormStore) CreateTournament(ctx context.Context, tournament *Tournament) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the entrants and the drawn matches through their associations.
		if err := tx.Create(tournament).Error; err != nil {
			return fmt.Errorf("insert tournament: %w", err)
		}

		// The lobby the field gathered in is now the bracket's home, and takes no more players.
		res := tx.Model(&MultiplayerLeagueOfLettersLobby{}).
			Where("id = ? AND status = ?", tournament.LobbyID, LobbyWaiting).
			Updates(map[string]any{"status": LobbyStarted, "tournament_id": tournament.ID})
		if res.Error != nil {
			return fmt.Errorf("mark tournament lobby started: %w", res.Error)
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

// createMatchRooms writes a stage's rooms, games and matches, associations and all.
func createMatchRooms(tx *gorm.DB, rooms []MatchRoom) error {
	for i := range rooms {
		room := rooms[i]
		if err := tx.Create(room.Lobby).Error; err != nil {
			return fmt.Errorf("insert match lobby: %w", err)
		}
		if err := tx.Create(room.Game).Error; err != nil {
			return fmt.Errorf("insert match game: %w", err)
		}
		if err := tx.Create(&room.Match).Error; err != nil {
			return fmt.Errorf("insert tournament match: %w", err)
		}
	}
	return nil
}

// StartTournamentStage opens the room of every match the stage on the table drew.
func (s *GormStore) StartTournamentStage(ctx context.Context, tournamentID uuid.UUID, rooms []MatchRoom) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i := range rooms {
			room := rooms[i]
			if err := tx.Create(room.Lobby).Error; err != nil {
				return fmt.Errorf("insert match lobby: %w", err)
			}
			if err := tx.Create(room.Game).Error; err != nil {
				return fmt.Errorf("insert match game: %w", err)
			}

			// Claimed once, so a second press rolls the rooms it opened back with it.
			res := tx.Model(&TournamentMatch{}).
				Where("id = ? AND tournament_id = ? AND status = ?", room.Match.ID, tournamentID, MatchPending).
				Updates(map[string]any{"status": MatchLive, "lobby_id": room.Match.LobbyID, "game_id": room.Match.GameID})
			if res.Error != nil {
				return fmt.Errorf("open tournament match: %w", res.Error)
			}
			if res.RowsAffected == 0 {
				return ErrStageStarted
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (s *GormStore) TournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error) {
	var tournament Tournament
	err := withBracket(s.db.WithContext(ctx)).First(&tournament, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrTournamentNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select tournament: %w", err)
	}
	return &tournament, nil
}

func (s *GormStore) TournamentByLobbyCode(ctx context.Context, code string) (*Tournament, error) {
	var tournament Tournament
	err := withBracket(s.db.WithContext(ctx)).First(&tournament, "lobby_id = ?", code).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrTournamentNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select tournament by lobby: %w", err)
	}
	return &tournament, nil
}

// TournamentLobbyCode is one column, because a match room's response only needs the code.
func (s *GormStore) TournamentLobbyCode(ctx context.Context, id uuid.UUID) (string, error) {
	var code string
	err := s.db.WithContext(ctx).Model(&Tournament{}).
		Where("id = ?", id).
		Pluck("lobby_id", &code).Error
	if err != nil {
		return "", fmt.Errorf("select tournament lobby code: %w", err)
	}
	if code == "" {
		return "", ErrTournamentNotFound
	}
	return code, nil
}

func (s *GormStore) TournamentMatchByGameID(ctx context.Context, gameID uuid.UUID) (*TournamentMatch, error) {
	var match TournamentMatch
	err := s.db.WithContext(ctx).
		Preload("Players", func(db *gorm.DB) *gorm.DB { return db.Order("slot ASC") }).
		First(&match, "game_id = ?", gameID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrTournamentNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select tournament match by game: %w", err)
	}
	return &match, nil
}

func (s *GormStore) SettleTournamentMatch(ctx context.Context, in SettleMatchInput) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Claimed once: a match settles on the guess that ended its game, and only then.
		res := tx.Model(&TournamentMatch{}).
			Where("id = ? AND status = ?", in.MatchID, MatchLive).
			Updates(map[string]any{"status": MatchDone, "winner_id": in.WinnerID})
		if res.Error != nil {
			return fmt.Errorf("settle tournament match: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return nil
		}

		for _, player := range in.Players {
			err := tx.Model(&TournamentMatchPlayer{}).
				Where("match_id = ? AND user_id = ?", in.MatchID, player.UserID).
				Updates(map[string]any{"score": player.Score, "place": player.Place}).Error
			if err != nil {
				return fmt.Errorf("record match result: %w", err)
			}
		}

		for _, update := range in.Standings {
			changes := map[string]any{"losses": update.Losses}
			if update.Placement != nil {
				changes["placement"] = *update.Placement
			}
			err := tx.Model(&TournamentPlayer{}).
				Where("tournament_id = ? AND user_id = ?", in.TournamentID, update.UserID).
				Updates(changes).Error
			if err != nil {
				return fmt.Errorf("record tournament standing: %w", err)
			}
		}

		if in.Completed {
			err := tx.Model(&Tournament{}).
				Where("id = ? AND status = ?", in.TournamentID, TournamentInProgress).
				Updates(map[string]any{"status": TournamentCompleted, "winner_id": in.WinnerID}).Error
			if err != nil {
				return fmt.Errorf("crown tournament champion: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (s *GormStore) SetReadyStage(ctx context.Context, tournamentID uuid.UUID, userID string, stage int) error {
	// Guarded so a double tap is one press.
	err := s.db.WithContext(ctx).Model(&TournamentPlayer{}).
		Where("tournament_id = ? AND user_id = ? AND ready_stage < ?", tournamentID, userID, stage).
		Update("ready_stage", stage).Error
	if err != nil {
		return fmt.Errorf("mark tournament player ready: %w", err)
	}
	return nil
}

func (s *GormStore) AdvanceTournamentStage(ctx context.Context, tournamentID uuid.UUID, from int, rooms []MatchRoom) (bool, error) {
	claimed := false

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Claimed first, so the rooms roll back with it when somebody else drew this stage.
		res := tx.Model(&Tournament{}).
			Where("id = ? AND stage = ? AND status = ?", tournamentID, from, TournamentInProgress).
			Update("stage", from+1)
		if res.Error != nil {
			return fmt.Errorf("advance tournament stage: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			return nil
		}
		claimed = true

		return createMatchRooms(tx, rooms)
	})
	if err != nil {
		return false, err
	}
	return claimed, nil
}

// DeleteTournamentsOlderThan drops brackets created before the cutoff, and everything hanging off them.
func (s *GormStore) DeleteTournamentsOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ids []uuid.UUID
		err := tx.Model(&Tournament{}).Where("created_at < ?", before).Pluck("id", &ids).Error
		if err != nil {
			return fmt.Errorf("select tournaments: %w", err)
		}
		if len(ids) == 0 {
			return nil
		}

		var matchIDs []uuid.UUID
		if err := tx.Model(&TournamentMatch{}).Where("tournament_id IN ?", ids).Pluck("id", &matchIDs).Error; err != nil {
			return fmt.Errorf("select tournament matches: %w", err)
		}
		if len(matchIDs) > 0 {
			if err := tx.Where("match_id IN ?", matchIDs).Delete(&TournamentMatchPlayer{}).Error; err != nil {
				return fmt.Errorf("delete tournament match players: %w", err)
			}
		}
		if err := tx.Where("tournament_id IN ?", ids).Delete(&TournamentMatch{}).Error; err != nil {
			return fmt.Errorf("delete tournament matches: %w", err)
		}
		if err := tx.Where("tournament_id IN ?", ids).Delete(&TournamentPlayer{}).Error; err != nil {
			return fmt.Errorf("delete tournament players: %w", err)
		}

		// Releasing the rooms hands them to the ordinary lobby and game sweeps, cascades and all.
		err = tx.Model(&MultiplayerLeagueOfLettersLobby{}).
			Where("tournament_id IN ?", ids).
			Update("tournament_id", nil).Error
		if err != nil {
			return fmt.Errorf("release tournament rooms: %w", err)
		}

		res := tx.Where("id IN ?", ids).Delete(&Tournament{})
		if res.Error != nil {
			return fmt.Errorf("delete tournaments: %w", res.Error)
		}
		deleted = res.RowsAffected

		return nil
	})
	if err != nil {
		return 0, err
	}
	return deleted, nil
}

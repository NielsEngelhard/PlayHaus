package lol

import (
	"context"
	"errors"
	"fmt"

	"playhaus-api/internal/i18n"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *GormStore) DailyWordFor(ctx context.Context, day string, locale i18n.Locale) (*DailyWord, error) {
	var word DailyWord

	err := s.db.WithContext(ctx).
		Where("day = ? AND locale = ?", day, locale).
		First(&word).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNoWordForDay
	}
	if err != nil {
		return nil, fmt.Errorf("select word of the day: %w", err)
	}
	return &word, nil
}

// CreateDailyWord writes the day's pick, leaving whatever is already there alone: two racing ensures must not fail.
func (s *GormStore) CreateDailyWord(ctx context.Context, word *DailyWord) error {
	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(word).Error
	if err != nil {
		return fmt.Errorf("insert word of the day: %w", err)
	}
	return nil
}

// RecentDailyWords is every answer this locale has played since a day, so a pick can avoid repeating one.
func (s *GormStore) RecentDailyWords(ctx context.Context, locale i18n.Locale, sinceDay string) ([]string, error) {
	var words []string

	err := s.db.WithContext(ctx).
		Model(&DailyWord{}).
		Where("locale = ? AND day >= ?", locale, sinceDay).
		Pluck("word", &words).Error
	if err != nil {
		return nil, fmt.Errorf("select recent words of the day: %w", err)
	}
	return words, nil
}

func (s *GormStore) DailyGameForDay(ctx context.Context, userID, day string) (*DailyGame, error) {
	var game DailyGame

	err := withBoard(s.db.WithContext(ctx)).
		Where("owner_id = ? AND day = ?", userID, day).
		First(&game).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select word of the day game: %w", err)
	}
	return &game, nil
}

// DailyGamesForUser is every day this account has played, board left behind: it only feeds the streak and the stats.
func (s *GormStore) DailyGamesForUser(ctx context.Context, userID string) ([]DailyGame, error) {
	var games []DailyGame

	err := s.db.WithContext(ctx).
		Where("owner_id = ?", userID).
		Order("day ASC").
		Find(&games).Error
	if err != nil {
		return nil, fmt.Errorf("select word of the day games: %w", err)
	}
	return games, nil
}

// CreateDailyGame inserts the attempt and its round, and turns a second attempt on the same day into a sentinel.
func (s *GormStore) CreateDailyGame(ctx context.Context, game *DailyGame) error {
	err := s.db.WithContext(ctx).Create(game).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrAlreadyPlayedToday
	}
	if err != nil {
		return fmt.Errorf("insert word of the day game: %w", err)
	}
	return nil
}

// RecordDailyGuess stores a guess and the day's game as it now stands.
func (s *GormStore) RecordDailyGuess(ctx context.Context, guess *LeagueOfLettersGuess, game *DailyGame) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Creates the letters too, through the association.
		if err := tx.Create(guess).Error; err != nil {
			return fmt.Errorf("insert guess: %w", err)
		}

		// Named columns rather than Save: the game was loaded with its round preloaded.
		err := tx.Model(&DailyGame{}).
			Where("id = ?", game.ID).
			Updates(map[string]any{
				"status":      game.Status,
				"solved":      game.Solved,
				"guesses":     game.Guesses,
				"finished_at": game.FinishedAt,
			}).Error
		if err != nil {
			return fmt.Errorf("update game: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("record word of the day guess: %w", err)
	}
	return nil
}

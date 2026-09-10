package lol

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

// DailyStore is the half of Store the word of the day needs.
type DailyStore interface {
	DailyWordFor(ctx context.Context, day string, locale i18n.Locale) (*DailyWord, error)
	CreateDailyWord(ctx context.Context, word *DailyWord) error
	RecentDailyWords(ctx context.Context, locale i18n.Locale, sinceDay string) ([]string, error)
	DailyGameForDay(ctx context.Context, userID, day string) (*DailyGame, error)
	DailyGamesForUser(ctx context.Context, userID string) ([]DailyGame, error)
	CreateDailyGame(ctx context.Context, game *DailyGame) error
	RecordDailyGuess(ctx context.Context, guess *LeagueOfLettersGuess, game *DailyGame) error
}

// DayLayout is how a day is keyed: a bare date in the reset zone, which sorts and compares as text.
const DayLayout = "2006-01-02"

// DailyWordCooldownDays is how long a word stays off the table once it has been the answer.
const DailyWordCooldownDays = 365

// dailyPickTries bounds the retry loop that avoids a recently played word.
const dailyPickTries = 40

// dailyCommonWordsOnly keeps the one puzzle everybody shares out of the obscure end of the list.
const dailyCommonWordsOnly = true

// DailyHistoryDays is how many boxes the streak row holds.
const DailyHistoryDays = 7

// DailyWordLength is how long the answer is on a weekday: gentle on Monday, longest on Sunday.
func DailyWordLength(day time.Weekday) int {
	switch day {
	case time.Monday:
		return 4
	case time.Friday:
		return 6
	case time.Saturday:
		return 7
	case time.Sunday:
		return 8
	default:
		return 5
	}
}

// DayKey is the day a moment belongs to, in the zone the word turns over in.
func DayKey(t time.Time, loc *time.Location) string {
	return t.In(loc).Format(DayLayout)
}

// NextReset is the next midnight in loc after t, which is when the next word becomes playable.
func NextReset(t time.Time, loc *time.Location) time.Time {
	local := t.In(loc)
	year, month, day := local.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, loc).AddDate(0, 0, 1)
}

// ShiftDay moves a day key by whole days.
func ShiftDay(day string, by int) string {
	parsed, err := time.Parse(DayLayout, day)
	if err != nil {
		return day
	}
	return parsed.AddDate(0, 0, by).Format(DayLayout)
}

// WeekdayOf is the weekday a day key falls on.
func WeekdayOf(day string) time.Weekday {
	parsed, err := time.Parse(DayLayout, day)
	if err != nil {
		return time.Monday
	}
	return parsed.Weekday()
}

// PlayedDays is the set of days an account has a game for.
func PlayedDays(games []DailyGame) map[string]bool {
	played := make(map[string]bool, len(games))
	for _, game := range games {
		played[game.Day] = true
	}
	return played
}

// Streak is the unbroken run of days played. Today still being unplayed does not break it; a whole missed day does.
func Streak(played map[string]bool, today string) int {
	day := today
	if !played[day] {
		day = ShiftDay(day, -1)
	}

	streak := 0
	for played[day] {
		streak++
		day = ShiftDay(day, -1)
	}
	return streak
}

// DailyStatsSummary is the numbers the stats card shows.
type DailyStatsSummary struct {
	BestGuesses    int
	AverageGuesses float64
	DaysPlayed     int
	DaysSolved     int
}

// DailyStats folds a player's days into what they get to improve on. Only a solved day has a guess count worth comparing.
func DailyStats(games []DailyGame) DailyStatsSummary {
	stats := DailyStatsSummary{DaysPlayed: len(games)}

	total := 0
	for _, game := range games {
		if !game.Solved || game.Guesses <= 0 {
			continue
		}
		stats.DaysSolved++
		total += game.Guesses
		if stats.BestGuesses == 0 || game.Guesses < stats.BestGuesses {
			stats.BestGuesses = game.Guesses
		}
	}

	if stats.DaysSolved > 0 {
		stats.AverageGuesses = float64(total) / float64(stats.DaysSolved)
	}
	return stats
}

// DailyDay is one box in the streak row.
type DailyDay struct {
	Day     string
	Weekday time.Weekday
	Played  bool
	Solved  bool
	Guesses int
}

// DailyHistory is the last count days ending on today, oldest first.
func DailyHistory(games []DailyGame, today string, count int) []DailyDay {
	byDay := make(map[string]DailyGame, len(games))
	for _, game := range games {
		byDay[game.Day] = game
	}

	history := make([]DailyDay, 0, count)
	for offset := count - 1; offset >= 0; offset-- {
		day := ShiftDay(today, -offset)
		entry := DailyDay{Day: day, Weekday: WeekdayOf(day)}
		if game, ok := byDay[day]; ok {
			entry.Played = true
			entry.Solved = game.Solved
			entry.Guesses = game.Guesses
		}
		history = append(history, entry)
	}
	return history
}

// DailyStatus is everything the word of the day screen draws.
type DailyStatus struct {
	Day        string
	Locale     i18n.Locale
	WordLength int
	ResetsAt   time.Time
	Game       *DailyGame
	Streak     int
	Stats      DailyStatsSummary
	History    []DailyDay
}

// WordOfTheDay is the day's puzzle plus what this account has done with it, started or not.
func (s *Service) WordOfTheDay(ctx context.Context, userID string, locale i18n.Locale, now time.Time, loc *time.Location) (*DailyStatus, error) {
	if userID == "" {
		return nil, ErrGameNotFound
	}
	if !locale.Valid() {
		locale = i18n.Default
	}

	day := DayKey(now, loc)
	word, err := s.dailyWord(ctx, day, locale)
	if err != nil {
		return nil, err
	}

	status := &DailyStatus{
		Day:        day,
		Locale:     locale,
		WordLength: word.WordLength,
		ResetsAt:   NextReset(now, loc),
	}

	game, err := s.store.DailyGameForDay(ctx, userID, day)
	if err != nil && !errors.Is(err, ErrGameNotFound) {
		return nil, err
	}
	if game != nil {
		status.Game = game
		// The locale was locked in when the game started, whatever the app is set to now.
		status.Locale = game.Locale
	}

	games, err := s.store.DailyGamesForUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	status.Streak = Streak(PlayedDays(games), day)
	status.Stats = DailyStats(games)
	status.History = DailyHistory(games, day, DailyHistoryDays)

	return status, nil
}

// StartWordOfTheDay opens this account's one attempt at today's word.
func (s *Service) StartWordOfTheDay(ctx context.Context, userID string, locale i18n.Locale, now time.Time, loc *time.Location) (*DailyGame, error) {
	if userID == "" {
		return nil, ErrGameNotFound
	}
	if !locale.Valid() {
		locale = i18n.Default
	}

	day := DayKey(now, loc)

	// Read first for the friendlier answer; the unique index on (owner_id, day) is what actually holds the line.
	existing, err := s.store.DailyGameForDay(ctx, userID, day)
	if err != nil && !errors.Is(err, ErrGameNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrAlreadyPlayedToday
	}

	word, err := s.dailyWord(ctx, day, locale)
	if err != nil {
		return nil, err
	}

	game := &DailyGame{
		ID:         uuid.New(),
		OwnerID:    userID,
		Day:        day,
		Locale:     locale,
		WordLength: word.WordLength,
		Status:     GameInProgress,
		CreatedAt:  now.UTC(),
	}
	game.Rounds = []LeagueOfLettersRound{{
		ID:          uuid.New(),
		GameID:      game.ID,
		RoundNumber: 1,
		Word:        word.Word,
	}}

	if err := s.store.CreateDailyGame(ctx, game); err != nil {
		return nil, err
	}
	return game, nil
}

// DailyGameFor is the account's game for a day, board and all.
func (s *Service) DailyGameFor(ctx context.Context, userID, day string) (*DailyGame, error) {
	if userID == "" {
		return nil, ErrGameNotFound
	}
	return s.store.DailyGameForDay(ctx, userID, day)
}

type SubmitDailyGuessInput struct {
	OwnerID string
	Day     string
	Word    string
}

// SubmitDailyGuess plays one word against the day's single round.
func (s *Service) SubmitDailyGuess(ctx context.Context, in SubmitDailyGuessInput) (*GuessOutcome, error) {
	game, err := s.store.DailyGameForDay(ctx, in.OwnerID, in.Day)
	if err != nil {
		return nil, err
	}
	if game.Status != GameInProgress {
		return nil, ErrGameFinished
	}

	round := game.Round()
	if round == nil {
		return nil, fmt.Errorf("daily game %s has no round", game.ID)
	}
	if round.IsOver() {
		return nil, ErrRoundClosed
	}

	word := NormalizeGuess(in.Word)
	if !ValidGuess(word, game.WordLength, round.FirstLetter()) {
		return nil, ErrInvalidGuessCharacters
	}
	if !IsAllowedWord(game.Locale, game.WordLength, word) {
		return nil, ErrInvalidGuessWordNonExisting
	}
	if AlreadyGuessed(round.Guesses, word) {
		return nil, ErrDuplicateGuess
	}

	guess := &LeagueOfLettersGuess{
		ID:          uuid.New(),
		RoundID:     round.ID,
		OwnerID:     in.OwnerID,
		Word:        word,
		GuessNumber: len(round.Guesses) + 1,
		Letters:     validatedLetters(word, round.Word),
		CreatedAt:   time.Now().UTC(),
	}

	solved := guess.Correct()
	roundOver := RoundIsOver(solved, guess.GuessNumber)

	// Guesses used is the whole metric here, so it is kept current on every row.
	game.Guesses = guess.GuessNumber

	outcome := &GuessOutcome{
		Guess:        guess,
		Solved:       solved,
		RoundOver:    roundOver,
		CurrentRound: 1,
	}

	if roundOver {
		finished := time.Now().UTC()
		game.Status = GameCompleted
		game.Solved = solved
		game.FinishedAt = &finished

		outcome.Word = round.Word
		outcome.GameOver = true
	}

	if err := s.store.RecordDailyGuess(ctx, guess, game); err != nil {
		return nil, err
	}
	return outcome, nil
}

// dailyWord reads the day's answer, picking one first if nothing has yet.
func (s *Service) dailyWord(ctx context.Context, day string, locale i18n.Locale) (*DailyWord, error) {
	word, err := s.store.DailyWordFor(ctx, day, locale)
	if err == nil {
		return word, nil
	}
	if !errors.Is(err, ErrNoWordForDay) {
		return nil, err
	}

	// A missed tick, a restart or a cold database must never leave a player without a word.
	if err := s.EnsureDailyWords(ctx, day); err != nil {
		return nil, err
	}
	return s.store.DailyWordFor(ctx, day, locale)
}

// EnsureDailyWords picks the day's answer for every locale that has none yet.
func (s *Service) EnsureDailyWords(ctx context.Context, day string) error {
	length := DailyWordLength(WeekdayOf(day))

	for _, locale := range i18n.Locales {
		_, err := s.store.DailyWordFor(ctx, day, locale)
		if err == nil {
			continue
		}
		if !errors.Is(err, ErrNoWordForDay) {
			return err
		}

		recent, err := s.store.RecentDailyWords(ctx, locale, ShiftDay(day, -DailyWordCooldownDays))
		if err != nil {
			return err
		}

		word, err := pickDailyWord(locale, length, recent)
		if err != nil {
			return err
		}

		err = s.store.CreateDailyWord(ctx, &DailyWord{
			Day:        day,
			Locale:     locale,
			Word:       word,
			WordLength: length,
			CreatedAt:  time.Now().UTC(),
		})
		if err != nil {
			return err
		}
	}

	return nil
}

// pickDailyWord draws a word nobody has played recently. Options.DevMode is ignored on purpose: a fixed answer would never change day to day.
func pickDailyWord(locale i18n.Locale, length int, recent []string) (string, error) {
	seen := make(map[string]bool, len(recent))
	for _, word := range recent {
		seen[word] = true
	}

	for range dailyPickTries {
		word, err := GetRandomWord(locale, length, dailyCommonWordsOnly)
		if err != nil {
			return "", fmt.Errorf("pick word of the day: %w", err)
		}
		if !seen[word] {
			return word, nil
		}
	}

	// Every draw came back recently played, which still beats having no puzzle at all.
	word, err := GetRandomWord(locale, length, dailyCommonWordsOnly)
	if err != nil {
		return "", fmt.Errorf("pick word of the day: %w", err)
	}
	return word, nil
}

// RunDaily keeps today's and tomorrow's words in place, waking just after each midnight in loc until ctx is cancelled.
func (s *Service) RunDaily(ctx context.Context, loc *time.Location, log *slog.Logger) {
	for {
		now := time.Now().In(loc)

		// Tomorrow as well, so the word is already on file the moment the day turns over.
		for _, day := range []string{DayKey(now, loc), DayKey(now.AddDate(0, 0, 1), loc)} {
			if err := s.EnsureDailyWords(ctx, day); err != nil {
				log.Error("pick word of the day", "day", day, "err", err)
			}
		}

		// Recomputed every pass rather than a fixed ticker: a 24h period drifts an hour across a DST change.
		timer := time.NewTimer(time.Until(NextReset(now, loc)) + time.Minute)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
	}
}

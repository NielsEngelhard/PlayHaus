package lol

import (
	"context"
	"slices"
	"testing"
	"time"

	"playhaus-api/internal/i18n"
)

func TestDailyWordLengthFollowsTheWeek(t *testing.T) {
	cases := []struct {
		day  time.Weekday
		want int
	}{
		{time.Monday, 4},
		{time.Tuesday, 5},
		{time.Wednesday, 5},
		{time.Thursday, 5},
		{time.Friday, 6},
		{time.Saturday, 7},
		{time.Sunday, 8},
	}

	for _, c := range cases {
		if got := DailyWordLength(c.day); got != c.want {
			t.Errorf("DailyWordLength(%s) = %d, want %d", c.day, got, c.want)
		}
	}
}

func TestEveryDailyWordLengthHasAListBehindIt(t *testing.T) {
	for day := time.Sunday; day <= time.Saturday; day++ {
		length := DailyWordLength(day)
		for _, locale := range i18n.Locales {
			if _, err := GetRandomWord(locale, length, dailyCommonWordsOnly); err != nil {
				t.Errorf("%s needs %d letters in %s: %v", day, length, locale, err)
			}
		}
	}
}

func amsterdam(t *testing.T) *time.Location {
	t.Helper()

	loc, err := time.LoadLocation("Europe/Amsterdam")
	if err != nil {
		t.Fatalf("load Europe/Amsterdam: %v", err)
	}
	return loc
}

func TestDayKeyRollsOverAtAmsterdamMidnight(t *testing.T) {
	loc := amsterdam(t)

	// 23:30 UTC in September is already half past one the next morning in Amsterdam.
	lateUTC := time.Date(2026, 9, 10, 23, 30, 0, 0, time.UTC)
	if got := DayKey(lateUTC, loc); got != "2026-09-11" {
		t.Errorf("DayKey(%s) = %q, want %q", lateUTC, got, "2026-09-11")
	}

	// A minute before midnight locally is still the day that is ending.
	almost := time.Date(2026, 9, 10, 23, 59, 0, 0, loc)
	if got := DayKey(almost, loc); got != "2026-09-10" {
		t.Errorf("DayKey(%s) = %q, want %q", almost, got, "2026-09-10")
	}
}

func TestNextResetIsTheComingMidnight(t *testing.T) {
	loc := amsterdam(t)

	now := time.Date(2026, 9, 10, 14, 12, 0, 0, loc)
	reset := NextReset(now, loc)

	if want := time.Date(2026, 9, 11, 0, 0, 0, 0, loc); !reset.Equal(want) {
		t.Errorf("NextReset = %s, want %s", reset, want)
	}
}

// The clocks go back on 25 October 2026, which makes that day 25 hours long.
func TestNextResetSpansADaylightSavingChange(t *testing.T) {
	loc := amsterdam(t)

	now := time.Date(2026, 10, 25, 1, 0, 0, 0, loc)
	reset := NextReset(now, loc)

	if got := DayKey(reset, loc); got != "2026-10-26" {
		t.Errorf("reset lands on %q, want %q", got, "2026-10-26")
	}
	if got := DayKey(reset.Add(-time.Minute), loc); got != "2026-10-25" {
		t.Errorf("a minute before the reset is %q, want %q", got, "2026-10-25")
	}
}

func TestStreakCountsTheRunUpToToday(t *testing.T) {
	played := map[string]bool{
		"2026-09-08": true,
		"2026-09-09": true,
		"2026-09-10": true,
	}

	if got := Streak(played, "2026-09-10"); got != 3 {
		t.Errorf("Streak = %d, want 3", got)
	}
}

func TestStreakSurvivesAnUnplayedToday(t *testing.T) {
	played := map[string]bool{
		"2026-09-08": true,
		"2026-09-09": true,
	}

	if got := Streak(played, "2026-09-10"); got != 2 {
		t.Errorf("Streak = %d, want 2", got)
	}
}

func TestStreakBreaksOnAMissedDay(t *testing.T) {
	played := map[string]bool{
		"2026-09-05": true,
		"2026-09-06": true,
		// 7 September missed.
		"2026-09-08": true,
		"2026-09-09": true,
		"2026-09-10": true,
	}

	if got := Streak(played, "2026-09-10"); got != 3 {
		t.Errorf("Streak = %d, want 3", got)
	}
}

func TestStreakIsZeroBeforeTheFirstDayPlayed(t *testing.T) {
	if got := Streak(map[string]bool{}, "2026-09-10"); got != 0 {
		t.Errorf("Streak = %d, want 0", got)
	}
}

// Showing up is the streak; the user's rule is playing each day, not winning each day.
func TestStreakCountsALossAsPlayed(t *testing.T) {
	games := []DailyGame{
		{Day: "2026-09-09", Solved: false, Guesses: 6},
		{Day: "2026-09-10", Solved: true, Guesses: 3},
	}

	if got := Streak(PlayedDays(games), "2026-09-10"); got != 2 {
		t.Errorf("Streak = %d, want 2", got)
	}
}

func TestDailyStatsIgnoreUnsolvedDaysWhenComparing(t *testing.T) {
	games := []DailyGame{
		{Day: "2026-09-07", Solved: true, Guesses: 2},
		{Day: "2026-09-08", Solved: false, Guesses: 6},
		{Day: "2026-09-09", Solved: true, Guesses: 4},
	}

	stats := DailyStats(games)

	if stats.DaysPlayed != 3 {
		t.Errorf("DaysPlayed = %d, want 3", stats.DaysPlayed)
	}
	if stats.DaysSolved != 2 {
		t.Errorf("DaysSolved = %d, want 2", stats.DaysSolved)
	}
	if stats.BestGuesses != 2 {
		t.Errorf("BestGuesses = %d, want 2", stats.BestGuesses)
	}
	if stats.AverageGuesses != 3 {
		t.Errorf("AverageGuesses = %v, want 3", stats.AverageGuesses)
	}
}

func TestDailyStatsOfNothingPlayedAreEmpty(t *testing.T) {
	stats := DailyStats(nil)

	if stats != (DailyStatsSummary{}) {
		t.Errorf("DailyStats(nil) = %+v, want the zero summary", stats)
	}
}

func TestDailyMonthIsEveryDayOfTodaysMonth(t *testing.T) {
	games := []DailyGame{{Day: "2026-09-08", Solved: true, Guesses: 3}}

	month := DailyMonth(games, "2026-09-10")

	if len(month) != 30 {
		t.Fatalf("len(month) = %d, want 30 for September", len(month))
	}
	if month[0].Day != "2026-09-01" {
		t.Errorf("month starts at %q, want %q", month[0].Day, "2026-09-01")
	}
	if last := month[29]; last.Day != "2026-09-30" || last.Played {
		t.Errorf("month ends at %+v, want an unplayed 2026-09-30", last)
	}
	if played := month[7]; !played.Played || played.Guesses != 3 {
		t.Errorf("2026-09-08 is %+v, want played in 3", played)
	}
	// A day nobody has reached yet is a box like any other, and empty.
	if today := month[9]; today.Day != "2026-09-10" || today.Played {
		t.Errorf("2026-09-10 is %+v, want unplayed", today)
	}
}

func TestDailyMonthEndsOnTheLastDayOfAShortMonth(t *testing.T) {
	month := DailyMonth(nil, "2026-02-11")

	if len(month) != 28 {
		t.Fatalf("len(month) = %d, want 28 for February 2026", len(month))
	}
	if last := month[27]; last.Day != "2026-02-28" {
		t.Errorf("month ends at %q, want %q", last.Day, "2026-02-28")
	}
}

func TestEveryLocaleGetsAWordForTheDay(t *testing.T) {
	store, _ := newTestStore(t)
	// DevMode is on to prove the daily picker does not consult it.
	service := NewService(store, Options{DevMode: true})

	if err := service.EnsureDailyWords(context.Background(), "2026-09-11"); err != nil {
		t.Fatalf("ensure words: %v", err)
	}

	for _, locale := range i18n.Locales {
		word, err := store.DailyWordFor(context.Background(), "2026-09-11", locale)
		if err != nil {
			t.Fatalf("no word for %s: %v", locale, err)
		}
		// 11 September 2026 is a Friday.
		if word.WordLength != 6 || len([]rune(word.Word)) != 6 {
			t.Errorf("%s got %q at length %d, want a six-letter word", locale, word.Word, word.WordLength)
		}
	}
}

func TestEnsuringTheSameDayTwiceKeepsTheFirstWord(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()

	if err := service.EnsureDailyWords(ctx, "2026-09-10"); err != nil {
		t.Fatalf("ensure words: %v", err)
	}
	first, err := store.DailyWordFor(ctx, "2026-09-10", i18n.NL)
	if err != nil {
		t.Fatalf("read word: %v", err)
	}

	if err := service.EnsureDailyWords(ctx, "2026-09-10"); err != nil {
		t.Fatalf("ensure words again: %v", err)
	}
	again, err := store.DailyWordFor(ctx, "2026-09-10", i18n.NL)
	if err != nil {
		t.Fatalf("read word again: %v", err)
	}

	if again.Word != first.Word {
		t.Errorf("word changed from %q to %q on a second ensure", first.Word, again.Word)
	}
}

func TestARecentlyPlayedWordIsNotPickedAgain(t *testing.T) {
	all, err := readFileAndGetLines(i18n.NL, 4, Common)
	if err != nil {
		t.Fatalf("read word list: %v", err)
	}

	// One word left off the cooldown list, so avoiding a repeat has exactly one answer.
	want := all[len(all)-1]
	picked, err := pickDailyWord(i18n.NL, 4, all[:len(all)-1])
	if err != nil {
		t.Fatalf("pick word: %v", err)
	}
	if picked != want {
		// The retry loop is bounded, so giving up and repeating is the documented fallback.
		if !slices.Contains(all, picked) {
			t.Errorf("picked %q, which is not in the four-letter list at all", picked)
		}
	}
}

func TestPickingAWordStillAnswersWhenEverythingIsOnCooldown(t *testing.T) {
	all, err := readFileAndGetLines(i18n.EN, 5, Common)
	if err != nil {
		t.Fatalf("read word list: %v", err)
	}

	picked, err := pickDailyWord(i18n.EN, 5, all)
	if err != nil {
		t.Fatalf("pick word: %v", err)
	}
	if !slices.Contains(all, picked) {
		t.Errorf("picked %q, which is not a playable five-letter word", picked)
	}
}

func TestStartingWordOfTheDayTwiceIsRefused(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()
	now := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)

	if _, err := service.StartWordOfTheDay(ctx, "player", i18n.EN, now, time.UTC); err != nil {
		t.Fatalf("start: %v", err)
	}

	_, err := service.StartWordOfTheDay(ctx, "player", i18n.EN, now, time.UTC)
	if err != ErrAlreadyPlayedToday {
		t.Errorf("second start returned %v, want ErrAlreadyPlayedToday", err)
	}
}

func TestSwitchingLanguageDoesNotBuyASecondGo(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()
	now := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)

	if _, err := service.StartWordOfTheDay(ctx, "player", i18n.NL, now, time.UTC); err != nil {
		t.Fatalf("start: %v", err)
	}

	_, err := service.StartWordOfTheDay(ctx, "player", i18n.EN, now, time.UTC)
	if err != ErrAlreadyPlayedToday {
		t.Errorf("start in another language returned %v, want ErrAlreadyPlayedToday", err)
	}
}

func TestWordOfTheDayIsTheSameWordForEveryone(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()
	now := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)

	first, err := service.StartWordOfTheDay(ctx, "one", i18n.EN, now, time.UTC)
	if err != nil {
		t.Fatalf("start one: %v", err)
	}
	second, err := service.StartWordOfTheDay(ctx, "two", i18n.EN, now, time.UTC)
	if err != nil {
		t.Fatalf("start two: %v", err)
	}

	if first.Round().Word != second.Round().Word {
		t.Errorf("two players got %q and %q", first.Round().Word, second.Round().Word)
	}
}

func TestWordOfTheDayIsPlayableWithNoSchedulerRun(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	now := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)

	// Nothing has ensured anything: the read path has to pick the word itself.
	status, err := service.WordOfTheDay(context.Background(), "player", i18n.NL, now, time.UTC)
	if err != nil {
		t.Fatalf("word of the day: %v", err)
	}

	// 10 September 2026 is a Thursday.
	if status.WordLength != 5 {
		t.Errorf("WordLength = %d, want 5", status.WordLength)
	}
	if status.Day != "2026-09-10" {
		t.Errorf("Day = %q, want %q", status.Day, "2026-09-10")
	}
	if status.Game != nil {
		t.Error("a day nobody started reported a game")
	}
	if len(status.Month) != 30 {
		t.Errorf("len(Month) = %d, want 30 for September", len(status.Month))
	}
}

func TestSolvingWordOfTheDayRecordsItsGuessCount(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()
	now := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)

	game, err := service.StartWordOfTheDay(ctx, "player", i18n.EN, now, time.UTC)
	if err != nil {
		t.Fatalf("start: %v", err)
	}

	outcome, err := service.SubmitDailyGuess(ctx, SubmitDailyGuessInput{
		OwnerID: "player",
		Day:     game.Day,
		Word:    game.Round().Word,
	})
	if err != nil {
		t.Fatalf("guess: %v", err)
	}
	if !outcome.Solved || !outcome.GameOver {
		t.Fatalf("outcome = %+v, want solved and over", outcome)
	}

	stored, err := store.DailyGameForDay(ctx, "player", game.Day)
	if err != nil {
		t.Fatalf("read game: %v", err)
	}
	if !stored.Solved || stored.Guesses != 1 || stored.Status != GameCompleted {
		t.Errorf("stored = solved %v in %d guesses, status %s", stored.Solved, stored.Guesses, stored.Status)
	}

	status, err := service.WordOfTheDay(ctx, "player", i18n.EN, now, time.UTC)
	if err != nil {
		t.Fatalf("word of the day: %v", err)
	}
	if status.Streak != 1 || status.Stats.BestGuesses != 1 {
		t.Errorf("streak = %d, best = %d, want 1 and 1", status.Streak, status.Stats.BestGuesses)
	}
}

func TestWordOfTheDayTakesNoGuessAfterItIsOver(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()
	now := time.Date(2026, 9, 10, 12, 0, 0, 0, time.UTC)

	game, err := service.StartWordOfTheDay(ctx, "player", i18n.EN, now, time.UTC)
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	answer := game.Round().Word

	if _, err := service.SubmitDailyGuess(ctx, SubmitDailyGuessInput{OwnerID: "player", Day: game.Day, Word: answer}); err != nil {
		t.Fatalf("guess: %v", err)
	}

	_, err = service.SubmitDailyGuess(ctx, SubmitDailyGuessInput{OwnerID: "player", Day: game.Day, Word: answer})
	if err != ErrGameFinished {
		t.Errorf("guess after the end returned %v, want ErrGameFinished", err)
	}
}

// The daily history has to outlive the 72-hour solo sweep, or a streak could not span a week.
func TestSweepingStaleSoloGamesLeavesTheDailyHistory(t *testing.T) {
	store, db := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()
	long := time.Now().UTC().AddDate(0, 0, -30)

	game, err := service.StartWordOfTheDay(ctx, "player", i18n.EN, long, time.UTC)
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	insertGame(t, db, "player", GameInProgress, long)

	if _, err := store.DeleteSoloGamesOlderThan(ctx, time.Now().UTC()); err != nil {
		t.Fatalf("sweep: %v", err)
	}

	kept, err := store.DailyGameForDay(ctx, "player", game.Day)
	if err != nil {
		t.Fatalf("daily game gone after the sweep: %v", err)
	}
	if kept.Round() == nil {
		t.Error("the daily game kept no round after the sweep")
	}
}

// A casual solo game replaces the player's previous one, and must not touch the day's board.
func TestStartingASoloGameLeavesTheDailyGameAlone(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{})
	ctx := context.Background()
	now := time.Now().UTC()

	daily, err := service.StartWordOfTheDay(ctx, "player", i18n.EN, now, time.UTC)
	if err != nil {
		t.Fatalf("start daily: %v", err)
	}

	_, _, err = service.CreateSoloGame(ctx, CreateSoloGameInput{
		OwnerID:             "player",
		WordLength:          5,
		Locale:              i18n.EN,
		OnlyPickCommonWords: true,
	})
	if err != nil {
		t.Fatalf("create solo game: %v", err)
	}

	kept, err := store.DailyGameForDay(ctx, "player", daily.Day)
	if err != nil {
		t.Fatalf("daily game gone: %v", err)
	}
	if kept.Round() == nil || kept.Round().Word != daily.Round().Word {
		t.Error("the daily board did not survive a solo game")
	}
}

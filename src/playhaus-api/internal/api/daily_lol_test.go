package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"playhaus-api/internal/lol"

	"gorm.io/gorm"
)

const dailyPath = "/api/v1/league-of-letters/word-of-the-day"

// startDaily opens the caller's one attempt at today's word in English, so the
// wrongGuesses helper's word list matches the board.
func startDaily(t *testing.T, h http.Handler, token string) soloGameResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, dailyPath, `{"locale":"en"}`, token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("start word of the day: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	game := decodeBody[soloGameResponse](t, rec)
	if game.Mode != "daily" {
		t.Fatalf("mode = %q, want %q", game.Mode, "daily")
	}
	return game
}

func getDaily(t *testing.T, h http.Handler, token string) wordOfTheDayResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, dailyPath+"?locale=en", "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get word of the day: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[wordOfTheDayResponse](t, rec)
}

func guessDaily(t *testing.T, h http.Handler, token, word string) *httptest.ResponseRecorder {
	t.Helper()
	return do(t, h, http.MethodPost, dailyPath+"/guesses", fmt.Sprintf(`{"word":%q}`, word), token)
}

func TestWordOfTheDayNeedsASession(t *testing.T) {
	h := newTestServer(t)

	for _, req := range []struct {
		method string
		path   string
		body   string
	}{
		{http.MethodGet, dailyPath, ""},
		{http.MethodPost, dailyPath, `{}`},
		{http.MethodPost, dailyPath + "/guesses", `{"word":"apple"}`},
	} {
		rec := do(t, h, req.method, req.path, req.body, "")
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s: status = %d, want %d", req.method, req.path, rec.Code, http.StatusUnauthorized)
		}
	}
}

func TestWordOfTheDayDescribesTodaysPuzzle(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	body := getDaily(t, h, session.Token)

	// The test server is built with lol.Options{}, so the day turns over in UTC.
	today := time.Now().UTC()
	if want := today.Format("2006-01-02"); body.Day != want {
		t.Errorf("day = %q, want %q", body.Day, want)
	}
	if want := lol.DailyWordLength(today.Weekday()); body.WordLength != want {
		t.Errorf("wordLength = %d, want %d on a %s", body.WordLength, want, today.Weekday())
	}
	if body.MaxGuesses != lol.MaxGuesses {
		t.Errorf("maxGuesses = %d, want %d", body.MaxGuesses, lol.MaxGuesses)
	}
	if !body.Playable {
		t.Error("a day nobody has played reported itself unplayable")
	}
	if body.Game != nil {
		t.Error("a day nobody has started came back with a game")
	}
	if body.Streak != 0 || body.Stats.DaysPlayed != 0 {
		t.Errorf("a fresh account has streak %d over %d days", body.Streak, body.Stats.DaysPlayed)
	}
	if want := daysInMonthOf(t, body.Day); len(body.Month) != want {
		t.Fatalf("len(month) = %d, want %d", len(body.Month), want)
	}
	if first := body.Month[0]; first.Day != body.Day[:8]+"01" {
		t.Errorf("month starts on %q, want the first of today's month (%q)", first.Day, body.Day)
	}

	resetsAt, err := time.Parse(time.RFC3339, body.ResetsAt)
	if err != nil {
		t.Fatalf("parse resetsAt %q: %v", body.ResetsAt, err)
	}
	if !resetsAt.After(today) {
		t.Errorf("resetsAt = %s, which is not in the future", resetsAt)
	}
}

// Nothing has run the scheduler in a test server, so the read path has to pick the word itself.
func TestWordOfTheDayIsPlayableWithNoSchedulerRun(t *testing.T) {
	h, db := newTestServerWithDB(t)
	session := newGuestSession(t, h)

	game := startDaily(t, h, session.Token)

	if answer := answerFor(t, db, game.ID, 1); len([]rune(answer)) != game.WordLength {
		t.Errorf("answer %q is not %d letters", answer, game.WordLength)
	}
}

func TestWordOfTheDayIsTheSameWordForEveryone(t *testing.T) {
	h, db := newTestServerWithDB(t)

	first := startDaily(t, h, newGuestSession(t, h).Token)
	second := startDaily(t, h, newGuestSession(t, h).Token)

	if first.ID == second.ID {
		t.Fatal("two accounts were handed the same game")
	}

	if a, b := answerFor(t, db, first.ID, 1), answerFor(t, db, second.ID, 1); a != b {
		t.Errorf("two players are solving %q and %q", a, b)
	}
}

func TestStartingWordOfTheDayTwiceIsRefused(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	startDaily(t, h, session.Token)

	rec := do(t, h, http.MethodPost, dailyPath, `{"locale":"en"}`, session.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("second start: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}

	body := decodeBody[struct {
		Code string `json:"code"`
	}](t, rec)
	if body.Code != "already_played_today" {
		t.Errorf("code = %q, want %q", body.Code, "already_played_today")
	}
}

// The locale is frozen when the day starts, so changing the app language cannot buy a second board.
func TestSwitchingLanguageDoesNotBuyASecondGo(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	rec := do(t, h, http.MethodPost, dailyPath, `{"locale":"nl"}`, session.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("start in Dutch: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	rec = do(t, h, http.MethodPost, dailyPath, `{"locale":"en"}`, session.Token)
	if rec.Code != http.StatusConflict {
		t.Fatalf("start in English: status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}

	body := getDaily(t, h, session.Token)
	if body.Locale != "nl" {
		t.Errorf("locale = %q, want the Dutch game the day was started with", body.Locale)
	}
	if body.Playable {
		t.Error("a day already played reported itself playable")
	}
}

func TestWordOfTheDayNeverLeaksTheAnswerWhileWinnable(t *testing.T) {
	h, db := newTestServerWithDB(t)
	session := newGuestSession(t, h)

	game := startDaily(t, h, session.Token)
	if word := game.Rounds[0].Word; word != "" {
		t.Fatalf("starting the day handed over %q", word)
	}

	answer := answerFor(t, db, game.ID, 1)
	rec := guessDaily(t, h, session.Token, wrongGuess(t, answer))
	if rec.Code != http.StatusCreated {
		t.Fatalf("guess: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	if guess := decodeBody[submitGuessResponse](t, rec); guess.Word != "" {
		t.Errorf("a wrong guess came back with the answer %q", guess.Word)
	}

	body := getDaily(t, h, session.Token)
	if body.Game == nil {
		t.Fatal("a started day came back with no game")
	}
	if word := body.Game.Rounds[0].Word; word != "" {
		t.Errorf("the day in progress leaked %q", word)
	}
}

func TestSolvingWordOfTheDayRecordsItsGuessCount(t *testing.T) {
	h, db := newTestServerWithDB(t)
	session := newGuestSession(t, h)

	game := startDaily(t, h, session.Token)
	answer := answerFor(t, db, game.ID, 1)

	for _, word := range wrongGuesses(t, answer, 2) {
		if rec := guessDaily(t, h, session.Token, word); rec.Code != http.StatusCreated {
			t.Fatalf("guess %q: status = %d (body: %s)", word, rec.Code, rec.Body)
		}
	}

	rec := guessDaily(t, h, session.Token, answer)
	if rec.Code != http.StatusCreated {
		t.Fatalf("winning guess: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	outcome := decodeBody[submitGuessResponse](t, rec)
	if !outcome.Solved || !outcome.GameOver {
		t.Fatalf("outcome = %+v, want solved and over", outcome)
	}
	if outcome.Word != answer {
		t.Errorf("word = %q, want the answer %q now the day is over", outcome.Word, answer)
	}

	body := getDaily(t, h, session.Token)
	if body.Playable {
		t.Error("a solved day reported itself playable")
	}
	if body.Streak != 1 {
		t.Errorf("streak = %d, want 1", body.Streak)
	}
	if body.Stats.BestGuesses != 3 || body.Stats.AverageGuesses != 3 {
		t.Errorf("stats = %+v, want a best and average of 3", body.Stats)
	}
	if body.Stats.DaysPlayed != 1 || body.Stats.DaysSolved != 1 {
		t.Errorf("stats = %+v, want one day played and solved", body.Stats)
	}
	if today := monthDay(t, body, body.Day); !today.Played || !today.Solved || today.Guesses != 3 {
		t.Errorf("today's calendar entry is %+v, want solved in 3", today)
	}
	if body.Game == nil || body.Game.Rounds[0].Word != answer {
		t.Error("a finished day does not show the answer back")
	}
}

func TestWordOfTheDayTakesNoGuessBeforeItIsStarted(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	rec := guessDaily(t, h, session.Token, "apple")
	if rec.Code != http.StatusNotFound {
		t.Errorf("guess without a game: status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// daysInMonthOf is how many boxes the calendar of a day key's own month holds.
func daysInMonthOf(t *testing.T, day string) int {
	t.Helper()

	parsed, err := time.Parse(lol.DayLayout, day)
	if err != nil {
		t.Fatalf("parse day %q: %v", day, err)
	}
	return time.Date(parsed.Year(), parsed.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

// monthDay is one day's box, which a test that names a day should not have to index by hand.
func monthDay(t *testing.T, body wordOfTheDayResponse, day string) dailyDayResponse {
	t.Helper()

	for _, entry := range body.Month {
		if entry.Day == day {
			return entry
		}
	}
	t.Fatalf("no calendar entry for %q", day)
	return dailyDayResponse{}
}

// backdateDailyGame moves a game whole days into the past, which is how a multi-day history is faked.
func backdateDailyGame(t *testing.T, db *gorm.DB, gameID string, days int) {
	t.Helper()

	day := time.Now().UTC().AddDate(0, 0, days).Format("2006-01-02")
	err := db.Exec(`UPDATE daily_lol_games SET day = ? WHERE id = ?`, day, gameID).Error
	if err != nil {
		t.Fatalf("backdate game: %v", err)
	}
}

func TestAMissedDayBreaksTheStreakButKeepsTheStats(t *testing.T) {
	h, db := newTestServerWithDB(t)
	session := newGuestSession(t, h)

	game := startDaily(t, h, session.Token)
	answer := answerFor(t, db, game.ID, 1)
	if rec := guessDaily(t, h, session.Token, answer); rec.Code != http.StatusCreated {
		t.Fatalf("winning guess: status = %d (body: %s)", rec.Code, rec.Body)
	}
	backdateDailyGame(t, db, game.ID, -3)

	body := getDaily(t, h, session.Token)
	if body.Streak != 0 {
		t.Errorf("streak = %d, want 0 after three days away", body.Streak)
	}
	if body.Stats.DaysPlayed != 1 || body.Stats.BestGuesses != 1 {
		t.Errorf("stats = %+v, want the old day still counted", body.Stats)
	}
	if !body.Playable {
		t.Error("today is not playable even though the game on file is days old")
	}
}

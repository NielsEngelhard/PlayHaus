package quizgen

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"
)

// Week is which week's quiz is being written. It is the whole identity of a weekly quiz: the slug, the title and the date all come out of it.
type Week struct {
	Year int
	Week int
}

var weekFlag = regexp.MustCompile(`^(\d{4})-[wW](\d{1,2})$`)

// ParseWeek reads a week off the command line in the shape a weekly slug is written.
func ParseWeek(s string) (Week, error) {
	parts := weekFlag.FindStringSubmatch(s)
	if parts == nil {
		return Week{}, fmt.Errorf("%q is not a week (try %q)", s, "2026-w40")
	}

	year, _ := strconv.Atoi(parts[1])
	number, _ := strconv.Atoi(parts[2])
	week := Week{Year: year, Week: number}
	if _, err := week.Wednesday(); err != nil {
		return Week{}, err
	}

	return week, nil
}

// ThisWeek is the week the clock is in. The schedule fires on a Wednesday, so that is already the week being published.
func ThisWeek(now time.Time) Week {
	year, number := now.ISOWeek()

	return Week{Year: year, Week: number}
}

// Slug is the file name and the primary key, unpadded the way the corpus writes it.
func (w Week) Slug() string {
	return fmt.Sprintf("%d-w%d", w.Year, w.Week)
}

// Wednesday is the day the quiz goes up, which the loader derives from the slug rather than reading off the file.
func (w Week) Wednesday() (time.Time, error) {
	return pubquizr.WednesdayOfWeek(w.Year, w.Week)
}

func (w Week) Title(locale i18n.Locale) string {
	if locale == i18n.EN {
		return fmt.Sprintf("Weekly quiz %d %d", w.Week, w.Year)
	}

	return fmt.Sprintf("Weekquiz %d %d", w.Week, w.Year)
}

func (w Week) Description(locale i18n.Locale) string {
	day, err := w.Wednesday()
	if err != nil {
		return ""
	}

	if locale == i18n.EN {
		return fmt.Sprintf("The weekly quiz of Wednesday %d %s %d.", day.Day(), day.Month(), day.Year())
	}

	return fmt.Sprintf("De wekelijkse quiz van woensdag %d %s %d.", day.Day(), dutchMonths[day.Month()], day.Year())
}

var dutchMonths = map[time.Month]string{
	time.January:   "januari",
	time.February:  "februari",
	time.March:     "maart",
	time.April:     "april",
	time.May:       "mei",
	time.June:      "juni",
	time.July:      "juli",
	time.August:    "augustus",
	time.September: "september",
	time.October:   "oktober",
	time.November:  "november",
	time.December:  "december",
}

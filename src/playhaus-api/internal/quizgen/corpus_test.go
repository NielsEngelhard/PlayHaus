package quizgen

import (
	"encoding/json"
	"io/fs"
	"path"
	"slices"
	"testing"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"
)

// Dedupe is the whole reason the corpus is loaded, so two wordings of one question
// have to collapse onto each other before anything is compared.
func TestNormalizeMakesOneQuestionOutOfTwoWordings(t *testing.T) {
	for _, pair := range [][2]string{
		{"Wat is de hoofdstad van Australie?", "wat is de hoofdstad van australie"},
		{"Wat is de hoofdstad van Australië?", "Wat is de hoofdstad van Australie?"},
		{"Who wrote 'Nineteen Eighty-Four'?", "Who wrote Nineteen Eighty Four?"},
		{"  spaced   out  ", "spaced out"},
	} {
		if left, right := normalize(pair[0]), normalize(pair[1]); left != right {
			t.Errorf("%q and %q normalise to %q and %q", pair[0], pair[1], left, right)
		}
	}

	if normalize("Who painted the Night Watch?") == normalize("Who painted the Milkmaid?") {
		t.Error("two different questions normalise to the same thing")
	}
}

func TestTheCorpusKnowsEverythingThatHasBeenAsked(t *testing.T) {
	corpus, err := LoadCorpus(i18n.NL)
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	asked := firstPrompt(t, i18n.NL)
	if !corpus.Has(asked) {
		t.Errorf("the corpus does not know it has asked %q", asked)
	}
	if corpus.Has("Hoeveel stoelen staan er in deze kamer?") {
		t.Error("the corpus claims a question nobody has asked")
	}

	if len(corpus.Avoid()) == 0 {
		t.Error("nothing to avoid, so the generator is free to repeat last week")
	}
}

// A repeat inside the round being built counts too: twenty questions asked in one
// call can still ask the same thing twice.
func TestRepeatsCatchesTheRoundAskingItselfTwice(t *testing.T) {
	corpus, err := LoadCorpus(i18n.NL)
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	round := Round{
		Round: pubquizr.RoundOpen,
		Questions: []pubquizr.QuestionFile{
			{Prompt: "Welke kleur heeft de lucht?"},
			{Prompt: "Welke kleur heeft de lucht!"},
		},
	}

	if repeats := corpus.Repeats(round); len(repeats) != 1 {
		t.Errorf("found %d repeats, want 1: %v", len(repeats), repeats)
	}
}

// 2026-w9 is a later week than 2026-w34 by name and an earlier one by date, and the
// avoid list has to be the weeks that were actually played most recently.
func TestTheNewestWeeksAreNotSimplyTheLastOnesByName(t *testing.T) {
	var files []string
	for _, week := range []int{1, 2, 3, 4, 5, 30, 31, 32, 33, 34} {
		files = append(files, "data/nl/weekly/"+Week{Year: 2026, Week: week}.Slug()+".json")
	}
	files = append(files, "data/nl/official/barbie.json")

	recent := newestWeeks(files)
	if len(recent) != RecentFiles {
		t.Fatalf("picked %d files, want %d", len(recent), RecentFiles)
	}

	if _, in := recent["data/nl/weekly/2026-w30.json"]; !in {
		t.Error("week 30 is one of the six newest and was left out")
	}
	if _, in := recent["data/nl/weekly/2026-w4.json"]; in {
		t.Error("week 4 was picked up, which only happens when the names are sorted as text")
	}
	if _, in := recent["data/nl/official/barbie.json"]; in {
		t.Error("an official quiz belongs to no week and cannot be a recent one")
	}
}

func TestASlugReadsBackAsTheWeekItNames(t *testing.T) {
	for _, slug := range []string{"2026-w1", "2026-w40", "2027-w1"} {
		week, err := ParseWeek(slug)
		if err != nil {
			t.Fatalf("parse %q: %v", slug, err)
		}
		if week.Slug() != slug {
			t.Errorf("%q came back as %q", slug, week.Slug())
		}

		day, err := week.Wednesday()
		if err != nil {
			t.Fatalf("wednesday of %q: %v", slug, err)
		}
		if day.Weekday() != time.Wednesday {
			t.Errorf("%q falls on a %s", slug, day.Weekday())
		}
	}

	for _, bad := range []string{"2026w40", "w40", "2026-40", "2026-w0", "2026-w54", ""} {
		if _, err := ParseWeek(bad); err == nil {
			t.Errorf("%q was accepted as a week", bad)
		}
	}
}

// The schedule fires on the Wednesday it is publishing, so the week it reads off the
// clock is the week being written.
func TestThisWeekIsTheWeekTheWednesdayFallsIn(t *testing.T) {
	wednesday := time.Date(2026, time.September, 30, 5, 0, 0, 0, time.UTC)

	if got, want := ThisWeek(wednesday).Slug(), "2026-w40"; got != want {
		t.Errorf("the quiz written on %s is %s, want %s", wednesday.Format(time.DateOnly), got, want)
	}
}

func TestEveryCategoryIsWrittenInBothLanguages(t *testing.T) {
	for _, category := range Categories {
		for _, locale := range i18n.Locales {
			written, err := label(locale, category)
			if err != nil {
				t.Fatalf("%s in %s: %v", category, locale, err)
			}
			if written == "" {
				t.Fatalf("%s has no %s wording", category, locale)
			}

			back, err := canonical(locale, written)
			if err != nil {
				t.Fatalf("%q in %s: %v", written, locale, err)
			}
			if back != category {
				t.Errorf("%s written as %q in %s comes back as %s", category, written, locale, back)
			}
		}
	}

	if _, err := label(i18n.NL, "Astrology"); err == nil {
		t.Error("a category nobody ships was accepted")
	}
}

// The twelve shelves have to be the twelve the weekly quizzes are actually filed
// under, or one misspelt label files a generated question somewhere nothing else is.
func TestEveryCategoryTheGeneratorWritesIsOneTheWeeklyQuizzesUse(t *testing.T) {
	for _, locale := range i18n.Locales {
		used := categoriesUsed(t, locale)

		for _, category := range Categories {
			written, err := label(locale, category)
			if err != nil {
				t.Fatalf("%s in %s: %v", category, locale, err)
			}
			if !slices.Contains(used, written) {
				t.Errorf("no %s weekly question is filed under %q", locale, written)
			}
		}
	}
}

func shippedQuizzes(t *testing.T, locale i18n.Locale, shelf pubquizr.Category) []pubquizr.QuizFile {
	t.Helper()

	shipped := pubquizr.ShippedFiles()

	files, err := fs.Glob(shipped, path.Join(pubquizr.SeedRoot, locale.String(), shelf.String(), "*.json"))
	if err != nil {
		t.Fatalf("glob %s: %v", locale, err)
	}
	if len(files) == 0 {
		t.Fatalf("%s ships no %s quizzes", locale, shelf)
	}

	quizzes := make([]pubquizr.QuizFile, 0, len(files))
	for _, file := range files {
		raw, err := fs.ReadFile(shipped, file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}

		var quiz pubquizr.QuizFile
		if err := json.Unmarshal(raw, &quiz); err != nil {
			t.Fatalf("parse %s: %v", file, err)
		}
		quizzes = append(quizzes, quiz)
	}

	return quizzes
}

func firstPrompt(t *testing.T, locale i18n.Locale) string {
	t.Helper()

	for _, quiz := range shippedQuizzes(t, locale, pubquizr.CategoryWeekly) {
		for _, round := range quiz.Rounds {
			for _, question := range round.Questions {
				if question.Prompt != "" {
					return question.Prompt
				}
			}
		}
	}

	t.Fatalf("%s ships no questions at all", locale)

	return ""
}

func categoriesUsed(t *testing.T, locale i18n.Locale) []string {
	t.Helper()

	var used []string
	for _, quiz := range shippedQuizzes(t, locale, pubquizr.CategoryWeekly) {
		for _, round := range quiz.Rounds {
			for _, question := range round.Questions {
				if question.Category != "" && !slices.Contains(used, question.Category) {
					used = append(used, question.Category)
				}
			}
		}
	}

	return used
}

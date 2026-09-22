package quizgen

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"path"
	"slices"
	"strings"
	"unicode"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"

	"golang.org/x/text/unicode/norm"
)

// normalize is the form two prompts are compared in: no case, no accents, no punctuation, single spaces.
func normalize(prompt string) string {
	var out strings.Builder
	space := false

	for _, r := range norm.NFD.String(strings.ToLower(prompt)) {
		switch {
		case unicode.Is(unicode.Mn, r):
			// A stripped accent leaves the letter it sat on.
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			if space && out.Len() > 0 {
				out.WriteByte(' ')
			}
			space = false
			out.WriteRune(r)
		default:
			space = true
		}
	}

	return out.String()
}

// Corpus is every prompt and word one locale has already asked, so a new week cannot repeat one.
type Corpus struct {
	asked  map[string]struct{}
	recent []string
}

// RecentFiles is how many of the newest quiz files the avoid list is drawn from.
const RecentFiles = 6

// LoadCorpus reads the shipped quizzes of one locale out of the same embed tree the loader seeds from.
func LoadCorpus(locale i18n.Locale) (*Corpus, error) {
	shipped := pubquizr.ShippedFiles()

	files, err := fs.Glob(shipped, path.Join(pubquizr.SeedRoot, locale.String(), "*", "*.json"))
	if err != nil {
		return nil, fmt.Errorf("walk %s quizzes: %w", locale, err)
	}

	recent := newestWeeks(files)

	corpus := &Corpus{asked: map[string]struct{}{}}
	for _, file := range files {
		raw, err := fs.ReadFile(shipped, file)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", file, err)
		}

		var parsed pubquizr.QuizFile
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return nil, fmt.Errorf("parse %s: %w", file, err)
		}

		_, isRecent := recent[file]
		for _, round := range parsed.Rounds {
			for _, question := range round.Questions {
				corpus.add(question.Prompt, isRecent)
			}
			for _, word := range round.Words {
				corpus.add(word, isRecent)
			}
		}
	}

	return corpus, nil
}

// newestWeeks is the last few weekly files, by the week in the name rather than by the name -- 2026-w9 sorts after 2026-w34.
func newestWeeks(files []string) map[string]struct{} {
	type dated struct {
		file string
		week Week
	}

	var weeks []dated
	for _, file := range files {
		week, err := ParseWeek(strings.TrimSuffix(path.Base(file), ".json"))
		if err != nil {
			continue // an official quiz belongs to no week
		}
		weeks = append(weeks, dated{file, week})
	}

	slices.SortFunc(weeks, func(a, b dated) int {
		if a.week.Year != b.week.Year {
			return b.week.Year - a.week.Year
		}
		return b.week.Week - a.week.Week
	})

	recent := make(map[string]struct{}, RecentFiles)
	for _, week := range weeks[:min(len(weeks), RecentFiles)] {
		recent[week.file] = struct{}{}
	}

	return recent
}

func (c *Corpus) add(prompt string, recent bool) {
	key := normalize(prompt)
	if key == "" {
		return
	}

	if _, already := c.asked[key]; !already && recent {
		c.recent = append(c.recent, prompt)
	}
	c.asked[key] = struct{}{}
}

// Has is whether this prompt has been asked before, under any wording that normalises to the same thing.
func (c *Corpus) Has(prompt string) bool {
	_, asked := c.asked[normalize(prompt)]

	return asked
}

// Take claims a prompt, so the quiz being built dedupes against itself as well as against the corpus.
func (c *Corpus) Take(prompt string) {
	c.add(prompt, false)
}

// Repeats is every prompt in a round that has been asked before, or twice inside the round itself.
func (c *Corpus) Repeats(round Round) []string {
	seen := map[string]struct{}{}

	var repeats []string
	for _, prompt := range round.Prompts() {
		key := normalize(prompt)
		_, twice := seen[key]
		if c.Has(prompt) || twice {
			repeats = append(repeats, prompt)
		}
		seen[key] = struct{}{}
	}

	return repeats
}

// Avoid is the sample of recent prompts the generator is told not to ask again.
func (c *Corpus) Avoid() []string {
	return c.recent
}

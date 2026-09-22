// Command quizfmt validates and reformats quiz JSON files without a database.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/quizgen"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: quizfmt <file.json>...")
		os.Exit(2)
	}

	bad := 0
	for _, arg := range os.Args[1:] {
		if err := one(arg); err != nil {
			fmt.Printf("FAIL %s: %v\n", arg, err)
			bad++
			continue
		}
		fmt.Printf("ok   %s\n", arg)
	}

	if bad > 0 {
		fmt.Fprintf(os.Stderr, "\n%d file(s) failed\n", bad)
		os.Exit(1)
	}
}

func one(path string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	locale, category, err := shelfOf(path)
	if err != nil {
		return err
	}

	if _, err := pubquizr.ParseQuizFile(raw, locale, category); err != nil {
		return err
	}

	var quiz pubquizr.QuizFile
	if err := json.Unmarshal(raw, &quiz); err != nil {
		return err
	}

	want := strings.TrimSuffix(filepath.Base(path), ".json")
	if quiz.Slug != want {
		return fmt.Errorf("slug %q does not match filename %q", quiz.Slug, want)
	}
	if category == pubquizr.CategoryOfficial && strings.TrimSpace(quiz.PublishedAt) == "" {
		return fmt.Errorf("an official quiz needs a publishedAt")
	}

	out, err := quizgen.Encode(quiz)
	if err != nil {
		return err
	}
	if _, err := pubquizr.ParseQuizFile(out, locale, category); err != nil {
		return fmt.Errorf("reformatted bytes do not load back: %w", err)
	}

	return os.WriteFile(path, out, 0o644)
}

// shelfOf reads the locale and category off the last four segments of a path.
func shelfOf(path string) (i18n.Locale, pubquizr.Category, error) {
	parts := strings.Split(filepath.ToSlash(filepath.Clean(path)), "/")
	if len(parts) < 4 {
		return "", "", fmt.Errorf("expected data/{locale}/{category}/{slug}.json, got %q", path)
	}

	return pubquizr.ShelfOf(strings.Join(parts[len(parts)-4:], "/"))
}

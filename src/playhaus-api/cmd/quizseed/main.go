// Command quizseed writes quiz files into a database and then exits. It is the
// same seeding path ph-migrate takes, reachable one file at a time, so a quiz
// written today can be played today instead of waiting for the next deploy.
//
// A quiz is stored under the SHA-256 of the exact bytes it was handed, which is
// what makes running this harmless: seeding a file the database already holds is
// a no-op, and a file seeded here is skipped by the next ph-migrate once it
// reaches the embed tree. Replacing a quiz whose content has changed regenerates
// every question id, so it is refused while anybody could be mid-game.
//
// The locale and the category come from the path, which is why the path matters:
//
//	DATABASE_URL=postgres://... go run ./cmd/quizseed internal/pubquizr/data/nl/weekly/2026-w40.json
//	cat quiz.json | DATABASE_URL=... go run ./cmd/quizseed -locale nl -category weekly -
package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"

	"playhaus-api/internal/config"
	"playhaus-api/internal/i18n"
	"playhaus-api/internal/platform/database"
	"playhaus-api/internal/pubquizr"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "quizseed failed: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	locale := flag.String("locale", "", "language of the quiz, when the path does not say")
	category := flag.String("category", "", "shelf to file the quiz under, when the path does not say")
	flag.Parse()

	files := flag.Args()
	if len(files) == 0 {
		return fmt.Errorf("no quiz files given (try %q)", "internal/pubquizr/data/nl/weekly/2026-w40.json")
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	envFile, err := config.LoadDotEnv()
	if err != nil {
		return err
	}
	if envFile != "" {
		logger.Info("loaded environment file", "path", envFile)
	}

	cfg, err := config.LoadDatabase()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := database.Open(cfg.URL, 1)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}()

	store := pubquizr.NewGormStore(db)
	for _, file := range files {
		raw, shelf, shelved, err := read(file, *locale, *category)
		if err != nil {
			return err
		}

		if err := pubquizr.SeedQuiz(ctx, store, raw, shelf, shelved); err != nil {
			return fmt.Errorf("seed %s: %w", file, err)
		}
		logger.Info("quiz seeded", "file", file, "locale", shelf, "category", shelved)
	}

	return nil
}

func read(file string, locale, category string) ([]byte, i18n.Locale, pubquizr.Category, error) {
	shelf, shelved := i18n.Locale(locale), pubquizr.Category(category)

	if file == "-" {
		if !shelf.Valid() || !shelved.Valid() {
			return nil, "", "", fmt.Errorf("stdin has no path to read a shelf off, so -locale and -category are required")
		}

		raw, err := io.ReadAll(os.Stdin)
		if err != nil {
			return nil, "", "", fmt.Errorf("read stdin: %w", err)
		}

		return raw, shelf, shelved, nil
	}

	if !shelf.Valid() || !shelved.Valid() {
		found, filed, err := shelfOf(file)
		if err != nil {
			return nil, "", "", err
		}
		if !shelf.Valid() {
			shelf = found
		}
		if !shelved.Valid() {
			shelved = filed
		}
	}

	raw, err := os.ReadFile(file)
	if err != nil {
		return nil, "", "", fmt.Errorf("read %s: %w", file, err)
	}

	return raw, shelf, shelved, nil
}

// shelfOf hands pubquizr the tail of the path it knows how to read, so a file anywhere under a data tree still names its own shelf.
func shelfOf(file string) (i18n.Locale, pubquizr.Category, error) {
	parts := strings.Split(filepath.ToSlash(filepath.Clean(file)), "/")
	if len(parts) < 4 {
		return "", "", fmt.Errorf("%q does not sit under {locale}/{category}/, so pass -locale and -category", file)
	}

	return pubquizr.ShelfOf(strings.Join(parts[len(parts)-4:], "/"))
}

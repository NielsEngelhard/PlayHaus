// Command migrate brings a database up to date and then exits: it applies every
// goose migration the database has not seen and seeds the quizzes that ship in
// internal/pubquizr/data.
//
// It is the only thing that changes the schema. The deploy runs it (as
// /app/ph-migrate, from the image it is about to start) before the new api
// container replaces the old one, so a failed migration aborts the deploy while
// the old version keeps serving. The API itself only checks that nothing is
// pending and refuses to start otherwise.
//
// Running it twice is a no-op: goose skips applied versions, and the seed skips
// a quiz whose file hash matches what the database already holds.
//
//	DATABASE_URL=postgres://... go run ./cmd/migrate
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"playhaus-api/internal/config"
	"playhaus-api/internal/platform/database"
	"playhaus-api/internal/pubquizr"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "migrate failed: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
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

	// Cancelled on SIGTERM so an interrupted deploy rolls back the migration it
	// was in the middle of rather than being killed half way through a file.
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

	applied, err := database.MigrateUp(ctx, db)
	if err != nil {
		return err
	}
	if len(applied) == 0 {
		logger.Info("schema already up to date")
	} else {
		logger.Info("migrations applied", "versions", applied)
	}

	if err := pubquizr.Seed(ctx, pubquizr.NewGormStore(db)); err != nil {
		return fmt.Errorf("seed quizzes: %w", err)
	}
	logger.Info("quizzes seeded")

	return nil
}

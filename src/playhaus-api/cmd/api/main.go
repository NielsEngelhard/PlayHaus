package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"playhaus-api/internal/api"
	"playhaus-api/internal/auth"
	"playhaus-api/internal/config"
	league_of_letters "playhaus-api/internal/league-of-letters"
	"playhaus-api/internal/platform/database"
	"playhaus-api/internal/user"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "startup failed: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// --- config -------------------------------------------------------
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("error loading config: %w", err)
	}

	// --- logging ------------------------------------------------------
	level := slog.LevelInfo
	if cfg.Debug {
		level = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	}))
	slog.SetDefault(logger)

	// --- database -----------------------------------------------------
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o755); err != nil {
		return fmt.Errorf("create data dir: %w", err)
	}

	db, err := database.Open(cfg.DBPath)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}()

	models := append([]any{&user.User{}, &auth.Session{}}, league_of_letters.Models()...)
	if err := database.Migrate(db, models[0], models[1:]...); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}
	logger.Info("database ready", "path", cfg.DBPath)

	// --- wiring -------------------------------------------------------
	userService := user.NewService(user.NewGormStore(db))
	authService := auth.NewService(auth.NewGormStore(db), userService)
	lolService := league_of_letters.NewService(league_of_letters.NewGormStore(db))

	handler := api.NewServer(userService, authService, lolService, logger, cfg.AllowedOrigins)
	logger.Info("cors configured", "allowed_origins", cfg.AllowedOrigins)

	// --- http server --------------------------------------------------
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	// Listen for SIGINT/SIGTERM; ctx is cancelled on the first one.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Expired sessions are already rejected on every request; this only keeps
	// the table from growing forever. It stops when ctx is cancelled.
	go authService.SweepExpired(ctx, time.Hour, logger)

	// Buffered so the goroutine can exit even if nobody is receiving.
	// Never closed: a closed channel would make the select below fire with a
	// nil error and report a clean shutdown as a failure.
	serverErr := make(chan error, 1)
	go func() {
		logger.Info("server listening", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	// --- wait for shutdown or a fatal server error ----------------------
	select {
	case err := <-serverErr:
		return fmt.Errorf("server failed: %w", err)

	case <-ctx.Done():
		logger.Info("shutdown signal received")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			// Deadline hit — force the remaining connections closed.
			_ = srv.Close()
			return fmt.Errorf("graceful shutdown: %w", err)
		}
		logger.Info("shutdown complete")
		return nil
	}
}

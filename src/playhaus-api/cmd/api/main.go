package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"playhausapi/internal/auth"
	"playhausapi/internal/config"
	"playhausapi/internal/database"
	"playhausapi/internal/leagueofletters"
	"playhausapi/internal/migrate"
	"playhausapi/internal/user"
)

// How long in-flight requests are given to finish once shutdown starts. Longer
// than the write timeout below, so a request that is allowed to still be
// running is allowed to finish.
const shutdownGrace = 20 * time.Second

func main() {
	if err := run(); err != nil {
		slog.Error("startup failed", "error", err)
		os.Exit(1)
	}
}

// run is where the program actually lives, so that every failure is a returned
// error with one exit point. main() calling log.Fatal from six places means no
// deferred close ever runs and none of it can be tested.
func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	setupLogging()

	// The defaults are the development ones, so production has to say what it
	// is and be checked, rather than silently inheriting a laptop's settings.
	if config.IsProduction() {
		if err := cfg.Validate(); err != nil {
			return err
		}
	}

	db, err := database.Open(cfg.DatabasePath)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			slog.Error("close database", "error", err)
		}
	}()

	if err := migrate.Run(db); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	// Cancelled on SIGINT/SIGTERM. Everything that should stop when the process
	// is asked to stop hangs off this.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	authHandler := auth.New(db, cfg.SecureCookies)
	go authHandler.SweepExpiredSessions(ctx, time.Hour)

	srv := &http.Server{
		Addr: cfg.Addr,
		Handler: withCORS(cfg.AllowedOrigins, routes(
			authHandler,
			user.New(db),
			leagueofletters.New(db),
		)),

		// Without these the zero-value server waits forever for a client that
		// has stopped sending, and a handful of stalled connections is enough to
		// hold every SQLite writer slot in the process.
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", cfg.Addr, "production", config.IsProduction())
		err := srv.ListenAndServe()
		if errors.Is(err, http.ErrServerClosed) {
			// The expected way to stop; Shutdown below reports the real outcome.
			err = nil
		}
		serverErr <- err
	}()

	select {
	case err := <-serverErr:
		return err
	case <-ctx.Done():
		slog.Info("shutdown signal received")
	}

	// A fresh context: the one above is already cancelled, and Shutdown needs a
	// live deadline of its own to wait out the requests still running.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownGrace)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	slog.Info("stopped cleanly")
	return nil
}

// setupLogging picks a handler for slog's default logger: JSON where something
// is going to be collecting it, plain text where a person is reading it.
func setupLogging() {
	var handler slog.Handler
	if config.IsProduction() {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
	}
	slog.SetDefault(slog.New(handler))
}

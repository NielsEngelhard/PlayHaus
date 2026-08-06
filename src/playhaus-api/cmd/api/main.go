package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"

	"playhaus-api/internal/database"
	"playhaus-api/internal/server"
)

// defaultDatabasePath is used when DATABASE_PATH is unset.
const defaultDatabasePath = "playhaus.db"

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	path := os.Getenv("DATABASE_PATH")
	if path == "" {
		path = defaultDatabasePath
	}

	db, err := database.Open(path)
	if err != nil {
		logger.Error("open database", "err", err)
		os.Exit(1)
	}

	// Migrate before listening: serving traffic against a stale schema is
	// worse than not starting at all.
	if err := database.Migrate(db); err != nil {
		logger.Error("migrate database", "err", err)
		os.Exit(1)
	}

	logger.Info("database ready", "path", path)

	srv := server.New(logger, db)

	const addr = ":8080"
	logger.Info("listening", "addr", addr)
	log.Fatal(http.ListenAndServe(addr, srv.Handler()))
}

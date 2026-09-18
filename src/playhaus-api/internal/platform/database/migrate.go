package database

import (
	"context"
	"embed"
	"fmt"
	"io/fs"

	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/lock"
	"gorm.io/gorm"
)

// The schema, as numbered goose files: NNNNN_what_it_does.sql, each with a
// "-- +goose Up" and a "-- +goose Down" section. A change to a GORM model needs
// a new file here too -- TestMigrationsMatchTheModels in internal/api fails
// until the two agree. Never edit a file that has already been deployed: goose
// records the version as applied and will not run it again.
//
//go:embed migrations/*.sql
var migrationFiles embed.FS

func provider(db *gorm.DB) (*goose.Provider, error) {
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}

	migrations, err := fs.Sub(migrationFiles, "migrations")
	if err != nil {
		return nil, fmt.Errorf("open migrations: %w", err)
	}

	// A Postgres advisory lock, held for the whole run, so two deploys that
	// overlap wait for each other instead of applying the same file twice.
	locker, err := lock.NewPostgresSessionLocker()
	if err != nil {
		return nil, fmt.Errorf("create migration lock: %w", err)
	}

	p, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations, goose.WithSessionLocker(locker))
	if err != nil {
		return nil, fmt.Errorf("create migration provider: %w", err)
	}
	return p, nil
}

// MigrateUp applies every migration the database has not seen yet, each in its
// own transaction, and returns the versions it applied.
func MigrateUp(ctx context.Context, db *gorm.DB) ([]int64, error) {
	p, err := provider(db)
	if err != nil {
		return nil, err
	}

	results, err := p.Up(ctx)
	if err != nil {
		return nil, fmt.Errorf("migrate up: %w", err)
	}

	applied := make([]int64, 0, len(results))
	for _, r := range results {
		applied = append(applied, r.Source.Version)
	}
	return applied, nil
}

// Pending reports whether migrations exist that the database has not applied.
// The API refuses to start on one that is behind rather than failing later on
// a missing column. A database that is ahead -- after rolling the code back --
// is let through: whether the old code copes with the new schema is the call
// of whoever rolled back, not of this check.
func Pending(ctx context.Context, db *gorm.DB) (bool, error) {
	p, err := provider(db)
	if err != nil {
		return false, err
	}

	pending, err := p.HasPending(ctx)
	if err != nil {
		return false, fmt.Errorf("check migrations: %w", err)
	}
	return pending, nil
}

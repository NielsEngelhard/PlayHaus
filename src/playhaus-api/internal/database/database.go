package database

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"playhaus-api/internal/user"
)

// Open connects to the sqlite file at path, creating it if it is missing.
//
// The pragmas are not optional extras: sqlite leaves foreign keys off by
// default, the busy timeout turns "database is locked" into a short wait
// instead of an error, and WAL lets reads run while a write is in flight.
func Open(path string) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"%s?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)",
		path,
	)

	// Silence gorm's own logger: it writes colour-coded plain text to stderr,
	// which would break the app's JSON log stream. Callers log failures
	// themselves via slog.
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),

		// Turn driver-specific constraint failures into gorm's own sentinels,
		// so services can test for gorm.ErrDuplicatedKey instead of matching
		// sqlite error strings.
		TranslateError: true,
	})
	if err != nil {
		return nil, fmt.Errorf("open sqlite at %s: %w", path, err)
	}

	return db, nil
}

// Migrate brings the schema up to date. Every new model gets appended here.
func Migrate(db *gorm.DB) error {
	if err := db.AutoMigrate(&user.User{}); err != nil {
		return fmt.Errorf("automigrate: %w", err)
	}

	return nil
}

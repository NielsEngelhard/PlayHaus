package database

import (
	"fmt"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(path string) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"file:%s?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=synchronous(NORMAL)",
		path,
	)

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		TranslateError: true, // maps driver errors onto gorm.ErrDuplicatedKey etc.
		Logger:         logger.Default.LogMode(logger.Warn),
		NowFunc:        func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}

	// SQLite allows exactly one writer. A single connection removes lock
	// contention entirely and is plenty for a small API.
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(0) // connections never expire; the file is local

	return db, nil
}

// Migrate brings the schema up to date for the given models. The models are
// passed in rather than imported so this package stays free of domain types.
//
// The first model is a separate parameter on purpose: it makes Migrate(db) a
// compile error instead of a silent no-op that leaves you with no tables.
func Migrate(db *gorm.DB, model any, more ...any) error {
	if err := db.AutoMigrate(append([]any{model}, more...)...); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}
	return nil
}

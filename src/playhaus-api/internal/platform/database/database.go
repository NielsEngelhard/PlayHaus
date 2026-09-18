package database

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Open connects to Postgres. It never touches the schema: that is MigrateUp's job,
// and only cmd/migrate calls it.
func Open(dsn string, maxConns int) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		TranslateError: true, // maps driver errors onto gorm.ErrDuplicatedKey etc.
		Logger:         logger.Default.LogMode(logger.Warn),
		// timestamptz keeps microseconds. A nanosecond-precise value written here
		// would read back as a different instant and fail every equality check.
		NowFunc: func() time.Time { return time.Now().UTC().Truncate(time.Microsecond) },
	})
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB: %w", err)
	}

	// One connection by default, and that is load-bearing rather than frugal. The
	// stores were written against SQLite's single writer, and several of their
	// transactions read a row and then write based on what they read (taking a
	// seat, joining a lobby). One connection runs those one at a time, exactly as
	// before. Raise DB_MAX_CONNS only after those transactions take row locks
	// (SELECT ... FOR UPDATE); without them two requests can both see the same
	// free seat.
	if maxConns < 1 {
		maxConns = 1
	}
	sqlDB.SetMaxOpenConns(maxConns)
	sqlDB.SetMaxIdleConns(maxConns)
	// Recycled now and then so a managed database's failover or proxy restart
	// cannot leave a connection that is dead but still pooled.
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	return db, nil
}

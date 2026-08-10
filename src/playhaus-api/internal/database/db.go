package database

import (
	"errors"
	"fmt"
	"runtime"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the application's handle on SQLite, split into two connection pools.
//
// SQLite in WAL mode allows one writer at a time alongside any number of
// concurrent readers. A single shared pool cannot express that: sized at one it
// serializes reads behind writes, and sized higher it lets several connections
// race for the write lock and collect SQLITE_BUSY. Two pools give each side what
// it needs — the writer is a queue of one by construction, and readers never
// queue behind it at all.
//
// Which pool a query belongs to is a decision the caller has to make, so it is
// deliberately visible at every call site rather than hidden behind a method.
type DB struct {
	// Read serves every query that only reads. Its connections are opened
	// query_only, so an accidental write through this handle fails loudly
	// instead of contending for the write lock.
	Read *gorm.DB

	// Write serves every mutation, and every read that has to be consistent with
	// one — anything inside a transaction. Capped at a single connection,
	// because SQLite has a single write lock and queueing in Go is cheaper than
	// colliding in the driver.
	Write *gorm.DB
}

// Open connects to the SQLite database at path, creating it if it does not
// exist, and returns both pools.
func Open(path string) (*DB, error) {
	// busy_timeout makes a connection wait for the write lock rather than
	// failing instantly; foreign_keys is per-connection and off by default in
	// SQLite, so it has to be asked for on every pool.
	const commonPragmas = "_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)"

	// The write pool is opened first and its journal mode set here. journal_mode
	// is a property of the file rather than the connection, so it survives for
	// every reader opened afterwards — which matters, because a query_only
	// connection could not set it.
	write, err := open(path+"?"+commonPragmas+"&_pragma=journal_mode(WAL)", 1)
	if err != nil {
		return nil, fmt.Errorf("open write pool: %w", err)
	}

	readers := max(runtime.NumCPU(), 4)
	read, err := open(path+"?"+commonPragmas+"&_pragma=query_only(1)", readers)
	if err != nil {
		return nil, fmt.Errorf("open read pool: %w", err)
	}

	return &DB{Read: read, Write: write}, nil
}

func open(dsn string, maxConns int) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
		// Without this, driver errors arrive as raw SQLite strings and
		// errors.Is(err, gorm.ErrDuplicatedKey) never matches.
		TranslateError: true,
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(maxConns)
	sqlDB.SetMaxIdleConns(maxConns)

	// Opening is lazy, so without this the first real query is where a bad path
	// or an unreadable file would surface — long after startup reported success.
	if err := sqlDB.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

// Close releases both pools.
func (db *DB) Close() error {
	var errs []error
	for _, handle := range []*gorm.DB{db.Read, db.Write} {
		if handle == nil {
			continue
		}
		sqlDB, err := handle.DB()
		if err != nil {
			errs = append(errs, err)
			continue
		}
		if err := sqlDB.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

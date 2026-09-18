// Package databasetest hands each test a Postgres schema of its own.
//
// Tests need TEST_DATABASE_URL pointing at a database they may create and drop
// schemas in -- a dedicated one such as playhausdb_test, never the one you play
// against locally:
//
//	TEST_DATABASE_URL=postgres://postgres:<password>@localhost:5432/playhausdb_test?sslmode=disable
//
// Every call creates schema t_<random>, points the connection's search_path at
// it, and drops it again in t.Cleanup. Tests therefore never see each other's
// rows, a failed run leaves nothing behind that a later run trips over, and the
// schema is built by the real migrations rather than by AutoMigrate -- so the
// tests exercise the exact SQL a deploy applies.
package databasetest

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/url"
	"os"
	"testing"

	"playhaus-api/internal/platform/database"

	"gorm.io/gorm"
)

// Open returns a connection to a fresh schema with every migration applied.
func Open(t *testing.T) *gorm.DB {
	t.Helper()

	db := OpenEmpty(t)
	if _, err := database.MigrateUp(context.Background(), db); err != nil {
		t.Fatalf("migrate test schema: %v", err)
	}
	return db
}

// OpenEmpty returns a connection to a fresh schema with nothing in it.
func OpenEmpty(t *testing.T) *gorm.DB {
	t.Helper()

	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Fatal("TEST_DATABASE_URL is not set; point it at a scratch Postgres database, " +
			"e.g. postgres://postgres:<password>@localhost:5432/playhausdb_test?sslmode=disable")
	}

	suffix := make([]byte, 8)
	_, _ = rand.Read(suffix)
	schema := "t_" + hex.EncodeToString(suffix)

	admin, err := database.Open(base, 1)
	if err != nil {
		t.Fatalf("connect to TEST_DATABASE_URL: %v", err)
	}
	closeDB(t, admin)
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema %s: %v", schema, err)
	}
	// Registered before the test's own connection is, so it runs after that one
	// is closed: cleanups run last in, first out.
	t.Cleanup(func() {
		if err := admin.Exec("DROP SCHEMA " + schema + " CASCADE").Error; err != nil {
			t.Errorf("drop schema %s: %v", schema, err)
		}
	})

	dsn, err := withSearchPath(base, schema)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	db, err := database.Open(dsn, 1)
	if err != nil {
		t.Fatalf("open test schema: %v", err)
	}
	closeDB(t, db)

	return db
}

// withSearchPath adds search_path as a connection parameter, so that it holds
// on every connection the pool ever opens rather than only on the first.
func withSearchPath(dsn, schema string) (string, error) {
	u, err := url.Parse(dsn)
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("search_path", schema)
	// A test schema is thrown away anyway, so no commit has to wait for the disk.
	q.Set("synchronous_commit", "off")
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func closeDB(t *testing.T, db *gorm.DB) {
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
}

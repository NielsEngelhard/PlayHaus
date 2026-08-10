// Package migrate brings the database schema up to date.
//
// It lives outside internal/database on purpose. The schema is the union of
// every package's models, so this has to import them all — and they, in turn,
// import internal/database for their stores. Keeping the model list here leaves
// internal/database depending on nothing of ours, which is what stops that from
// being an import cycle.
package migrate

import (
	"playhausapi/internal/auth"
	"playhausapi/internal/database"
	"playhausapi/internal/leagueofletters"
	"playhausapi/internal/user"
)

// Run applies the schema.
//
// TODO: AutoMigrate adds tables, columns and indexes but never drops or renames
// one, and it cannot move data. That is fine while the only databases are
// disposable; before this holds anything worth keeping it should be replaced
// with versioned migration files (goose or atlas), so that a rollback is a real
// operation rather than a restore from backup.
//
// Foreign keys are emitted only when a table is first created — SQLite cannot
// ALTER TABLE ADD CONSTRAINT — so a database created before the relations were
// declared keeps its unconstrained columns until it is recreated.
func Run(db *database.DB) error {
	return db.Write.AutoMigrate(
		&user.AppUser{},
		&auth.Session{},
		&leagueofletters.Game{},
		&leagueofletters.Player{},
		&leagueofletters.Round{},
		&leagueofletters.Guess{},
		// add each new model here
	)
}

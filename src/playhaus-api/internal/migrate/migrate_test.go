package migrate_test

import (
	"path/filepath"
	"strings"
	"testing"

	"playhausapi/internal/database"
	"playhausapi/internal/leagueofletters"
	"playhausapi/internal/migrate"
)

func openMigrated(t *testing.T) *database.DB {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close database: %v", err)
		}
	})

	if err := migrate.Run(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func tableSQL(t *testing.T, db *database.DB, table string) string {
	t.Helper()

	var sql string
	err := db.Read.Raw("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?", table).
		Scan(&sql).Error
	if err != nil {
		t.Fatalf("read schema for %s: %v", table, err)
	}
	if sql == "" {
		t.Fatalf("table %s does not exist", table)
	}
	return sql
}

// The connections ask for foreign_keys(1), which does nothing unless the tables
// actually carry constraints — and GORM only emits those where a model declares
// a relation. Before the relation fields were added this pragma was guarding
// nothing at all.
func TestChildTablesHaveForeignKeys(t *testing.T) {
	db := openMigrated(t)

	for table, parent := range map[string]string{
		"lol_players": "lol_games",
		"lol_rounds":  "lol_games",
		"lol_guesses": "lol_rounds",
	} {
		t.Run(table, func(t *testing.T) {
			sql := tableSQL(t, db, table)

			if !strings.Contains(sql, "REFERENCES `"+parent+"`") {
				t.Errorf("%s has no foreign key to %s:\n%s", table, parent, sql)
			}
			if !strings.Contains(sql, "ON DELETE CASCADE") {
				t.Errorf("%s does not cascade on delete:\n%s", table, sql)
			}
		})
	}
}

func TestForeignKeysAreEnforced(t *testing.T) {
	db := openMigrated(t)

	// A round belonging to a game that does not exist.
	err := db.Write.Create(&leagueofletters.Round{
		GameID: "no-such-game",
		Number: 1,
		Word:   "regen",
	}).Error

	if err == nil {
		t.Fatal("inserted a round for a game that does not exist; the foreign key is not being enforced")
	}
}

// The service refuses a seventh guess from rows it read moments earlier. This
// index is what makes the rule true even if two requests read at the same time.
func TestGuessSlotIsUnique(t *testing.T) {
	db := openMigrated(t)

	var count int64
	err := db.Read.Raw(
		"SELECT count(*) FROM sqlite_master WHERE type = 'index' AND name = ?",
		"idx_lol_guess_slot",
	).Scan(&count).Error
	if err != nil {
		t.Fatalf("read indexes: %v", err)
	}

	if count != 1 {
		t.Error("the unique index on (round_id, user_id, number) is missing")
	}
}

// The read pool is opened query_only so that a write sent down it fails loudly
// rather than quietly competing for SQLite's single write lock.
func TestReadPoolRefusesWrites(t *testing.T) {
	db := openMigrated(t)

	err := db.Read.Exec("INSERT INTO lol_games (id, host_user_id, mode, status, language, word_length, version) " +
		"VALUES ('x', 'y', 'solo', 'active', 'en', 5, 1)").Error

	if err == nil {
		t.Fatal("the read pool accepted a write; query_only is not in effect")
	}
}

package api

import (
	"slices"
	"testing"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/friend"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/oneofus"
	"playhaus-api/internal/platform/database/databasetest"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/push"
	"playhaus-api/internal/user"

	"gorm.io/gorm"
)

// Every model the API persists. A new one belongs here and in a migration.
func allModels() []any {
	models := append([]any{&user.User{}, &auth.Session{}}, lol.Models()...)
	models = append(models, pubquizr.Models()...)
	models = append(models, oneofus.Models()...)
	models = append(models, fakefiller.Models()...)
	models = append(models, friend.Models()...)
	models = append(models, push.Models()...)
	return models
}

// Fails when a model changed without a new file in internal/platform/database/migrations to match.
func TestMigrationsMatchTheModels(t *testing.T) {
	migrated := databasetest.Open(t)

	modelled := databasetest.OpenEmpty(t)
	if err := modelled.AutoMigrate(allModels()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	for _, part := range []struct {
		name  string
		query string
	}{
		{"columns", `SELECT table_name || '.' || column_name || ' ' || data_type || ' null=' || is_nullable || ' default=' || COALESCE(column_default, '-')
			FROM information_schema.columns WHERE table_schema = current_schema() AND table_name <> 'goose_db_version'`},
		{"indexes", `SELECT regexp_replace(indexdef, ' ON \S+\.', ' ON ')
			FROM pg_indexes WHERE schemaname = current_schema() AND tablename <> 'goose_db_version'`},
		{"constraints", `SELECT conrelid::regclass::text || ' ' || conname || ' ' || pg_get_constraintdef(oid)
			FROM pg_constraint WHERE connamespace = current_schema()::regnamespace AND conrelid::regclass::text <> 'goose_db_version'`},
	} {
		want := schemaLines(t, modelled, part.query)
		got := schemaLines(t, migrated, part.query)

		for _, line := range want {
			if !slices.Contains(got, line) {
				t.Errorf("%s: the models have %q and the migrations do not", part.name, line)
			}
		}
		for _, line := range got {
			if !slices.Contains(want, line) {
				t.Errorf("%s: the migrations have %q and the models do not", part.name, line)
			}
		}
	}
}

func schemaLines(t *testing.T, db *gorm.DB, query string) []string {
	t.Helper()

	var lines []string
	if err := db.Raw(query).Scan(&lines).Error; err != nil {
		t.Fatalf("read schema: %v", err)
	}
	slices.Sort(lines)
	return lines
}

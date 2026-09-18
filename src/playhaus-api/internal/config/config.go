package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr                   string
	Database               Database
	ShutdownTimeout        time.Duration
	Debug                  bool
	AllowedOrigins         []string
	LeagueOfLettersDevMode bool // Always pick the first word of the list for all rounds (easy testing)

	PushEnabled bool // Off until a build ships with expo-notifications and store credentials behind it

	// DailyResetLocation is the one zone the word of the day turns over in, for
	// everybody. A per-device midnight would give a traveller two words in a day
	// and make one player's streak mean something different from another's.
	DailyResetLocation *time.Location
}

func Load() (Config, error) {
	// Fail loudly at startup rather than mysteriously at 3am.

	shutdownTimeout, err := envDuration("SHUTDOWN_TIMEOUT", 10*time.Second)
	if err != nil {
		return Config{}, err
	}

	database, err := LoadDatabase()
	if err != nil {
		return Config{}, err
	}

	resetLocation, err := envLocation("DAILY_RESET_TZ", "Europe/Amsterdam")
	if err != nil {
		return Config{}, err
	}

	return Config{
		Addr:                   env("ADDR", ":8080"),
		Database:               database,
		ShutdownTimeout:        shutdownTimeout,
		Debug:                  envBool("DEBUG", false),
		AllowedOrigins:         envList("ALLOWED_ORIGINS", defaultAllowedOrigins),
		LeagueOfLettersDevMode: envBool("LOL_DEV_MODE", true), // Same word every round
		PushEnabled:            envBool("PUSH_ENABLED", false),
		DailyResetLocation:     resetLocation,
	}, nil
}

var defaultAllowedOrigins = []string{
	"http://localhost:8081",
	"http://127.0.0.1:8081",
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}

	fmt.Println("Missing environment variable: " + key)
	return fallback
}

// envList reads a comma-separated variable. Setting it to an empty string is
// how you ask for none at all -- the fallback applies only when it is unset,
// so "no origins, on purpose" stays expressible.
func envList(key string, fallback []string) []string {
	raw, ok := os.LookupEnv(key)
	if !ok {
		fmt.Println("Missing environment variable: " + key)
		return fallback
	}

	var values []string
	for part := range strings.SplitSeq(raw, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}

// envBool and envDuration fall back only when the variable is unset. A value
// that is set but unparseable is a typo in someone's deploy config, so it is
// reported rather than quietly ignored.
func envBool(key string, fallback bool) bool {
	raw := os.Getenv(key)
	v, err := strconv.ParseBool(raw)
	if err != nil {
		fmt.Println("Missing environment variable: " + key)
		return fallback
	}
	return v
}

// envLocation resolves a zone name. The runtime image carries no tzdata of its
// own, so this only works because cmd/api imports time/tzdata -- see the note
// there before removing that import.
func envLocation(key, fallback string) (*time.Location, error) {
	name := fallback
	if raw := os.Getenv(key); raw != "" {
		name = raw
	} else {
		fmt.Println("Missing environment variable: " + key)
	}

	loc, err := time.LoadLocation(name)
	if err != nil {
		return nil, fmt.Errorf("%s=%q is not a known time zone: %w", key, name, err)
	}
	return loc, nil
}

func envDuration(key string, fallback time.Duration) (time.Duration, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	v, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("%s=%q is not a duration (try %q): %w", key, raw, "30s", err)
	}
	return v, nil
}

// Database is the part of Config that cmd/migrate needs too.
type Database struct {
	URL      string // DATABASE_URL, e.g. postgres://user:pass@host:5432/playhausdb?sslmode=require
	MaxConns int    // DB_MAX_CONNS; see database.Open before raising it above 1
}

// LoadDatabase has no fallback for the URL. A default would point a production
// container at a database that does not exist and fail on the first request
// instead of at boot.
func LoadDatabase() (Database, error) {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		return Database{}, fmt.Errorf("DATABASE_URL is not set (try %q)",
			"postgres://postgres:<password>@localhost:5432/playhausdb?sslmode=disable")
	}

	maxConns := 1
	if raw := os.Getenv("DB_MAX_CONNS"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil || v < 1 {
			return Database{}, fmt.Errorf("DB_MAX_CONNS=%q is not a positive whole number", raw)
		}
		maxConns = v
	}

	return Database{URL: url, MaxConns: maxConns}, nil
}

package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr                   string
	DBPath                 string
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

	// Resolved here rather than left relative. The default is relative to the working
	// directory, so `go run ./cmd/api` from the module root and the same binary run
	// from cmd/api are two different databases -- which looks like a server that
	// forgot everything rather than one reading a different file. Absolute means the
	// path main logs at startup is the file actually opened.
	dbPath, err := filepath.Abs(env("DB_PATH", "data/app.db"))
	if err != nil {
		return Config{}, fmt.Errorf("resolve DB_PATH: %w", err)
	}

	resetLocation, err := envLocation("DAILY_RESET_TZ", "Europe/Amsterdam")
	if err != nil {
		return Config{}, err
	}

	return Config{
		Addr:                   env("ADDR", ":8080"),
		DBPath:                 dbPath,
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

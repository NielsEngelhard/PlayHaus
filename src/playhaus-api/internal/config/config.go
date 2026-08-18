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
	DBPath                 string
	ShutdownTimeout        time.Duration
	Debug                  bool
	AllowedOrigins         []string
	LeagueOfLettersDevMode bool // Always pick the first word of the list for all rounds (easy testing)
}

func Load() (Config, error) {
	// Fail loudly at startup rather than mysteriously at 3am.

	shutdownTimeout, err := envDuration("SHUTDOWN_TIMEOUT", 10*time.Second)
	if err != nil {
		return Config{}, err
	}

	return Config{
		Addr:                   env("ADDR", ":8080"),
		DBPath:                 env("DB_PATH", "data/app.db"),
		ShutdownTimeout:        shutdownTimeout,
		Debug:                  envBool("DEBUG", false),
		AllowedOrigins:         envList("ALLOWED_ORIGINS", defaultAllowedOrigins),
		LeagueOfLettersDevMode: envBool("LOL_DEV_MODE", false), // Same word every round
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

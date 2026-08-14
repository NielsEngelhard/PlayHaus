package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Addr            string
	DBPath          string
	ShutdownTimeout time.Duration
	Debug           bool
}

func Load() (Config, error) {
	// Fail loudly at startup rather than mysteriously at 3am.

	shutdownTimeout, err := envDuration("SHUTDOWN_TIMEOUT", 10*time.Second)
	if err != nil {
		return Config{}, err
	}

	debug, err := envBool("DEBUG", false)
	if err != nil {
		return Config{}, err
	}

	return Config{
		Addr:            env("ADDR", ":8080"),
		DBPath:          env("DB_PATH", "data/app.db"),
		ShutdownTimeout: shutdownTimeout,
		Debug:           debug,
	}, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// envBool and envDuration fall back only when the variable is unset. A value
// that is set but unparseable is a typo in someone's deploy config, so it is
// reported rather than quietly ignored.
func envBool(key string, fallback bool) (bool, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s=%q is not a boolean: %w", key, raw, err)
	}
	return v, nil
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

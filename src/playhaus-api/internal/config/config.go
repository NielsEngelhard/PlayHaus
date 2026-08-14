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
	cfg := Config{
		Addr:            env("ADDR", ":8080"),
		DBPath:          env("DB_PATH", "data/app.db"),
		ShutdownTimeout: envDuration("SHUTDOWN_TIMEOUT", 10*time.Second),
		Debug:           envBool("DEBUG", false),
	}

	// Fail loudly at startup rather than mysteriously at 3am.
	if secret := os.Getenv("JWT_SECRET"); secret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET is required")
	}
	return cfg, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v, err := strconv.ParseBool(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return v
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v, err := time.ParseDuration(os.Getenv(key))
	if err != nil {
		return fallback
	}
	return v
}

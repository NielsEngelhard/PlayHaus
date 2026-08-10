// Package config gathers every environment-dependent setting in one place.
//
// It exists so that "is this production?" is answered once, at startup, instead
// of being rediscovered by each package that cares. Anything that must differ
// between a laptop and a real deployment belongs here.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	// Addr is the listen address, e.g. ":8080".
	Addr string

	// DatabasePath is the SQLite file. Its directory must already exist.
	DatabasePath string

	// SecureCookies marks session cookies HTTPS-only. It must be true anywhere
	// the API is reachable over the network; false is only for plain-HTTP local
	// development, where a Secure cookie would never be stored at all.
	SecureCookies bool

	// AllowedOrigins is the CORS allowlist. Empty means development mode, where
	// any origin is reflected — see cmd/api/cors.go for why that is survivable
	// there and not anywhere else.
	AllowedOrigins []string
}

// Load reads configuration from the environment.
//
// Every value has a development default, so `go run ./cmd/api` works with no
// setup. The defaults are the *insecure* ones — a missing variable in
// production must fail loudly rather than quietly running as if it were a
// laptop, which is what Validate is for.
func Load() (Config, error) {
	cfg := Config{
		Addr:         ":" + envOr("PORT", "8080"),
		DatabasePath: envOr("DATABASE_PATH", "playhaus.db"),
	}

	secure, err := boolEnv("SECURE_COOKIES", false)
	if err != nil {
		return Config{}, err
	}
	cfg.SecureCookies = secure

	if origins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); origins != "" {
		for origin := range strings.SplitSeq(origins, ",") {
			if origin = strings.TrimSpace(origin); origin != "" {
				cfg.AllowedOrigins = append(cfg.AllowedOrigins, origin)
			}
		}
	}

	return cfg, nil
}

// Validate reports the settings that are survivable on a laptop and not in
// production. Call it when APP_ENV says this is production.
func (c Config) Validate() error {
	var problems []string

	if !c.SecureCookies {
		problems = append(problems, "SECURE_COOKIES must be true")
	}
	if len(c.AllowedOrigins) == 0 {
		problems = append(problems, "ALLOWED_ORIGINS must list the web origins")
	}

	if len(problems) > 0 {
		return fmt.Errorf("unsafe production config: %s", strings.Join(problems, "; "))
	}
	return nil
}

// IsProduction reports whether this process believes it is serving real users.
func IsProduction() bool {
	return strings.EqualFold(os.Getenv("APP_ENV"), "production")
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func boolEnv(key string, fallback bool) (bool, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}

	v, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("config: %s must be a boolean, got %q", key, raw)
	}
	return v, nil
}

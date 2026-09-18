package config

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// LoadDotEnv reads the nearest .env, searching from the working directory up to
// the module root, so `go run main.go` inside cmd/migrate finds the same file as
// `go run ./cmd/api` from the root. A variable already in the environment always
// wins over the file, which keeps a container's real configuration authoritative;
// images never contain a .env anyway (.dockerignore). No file is not an error.
func LoadDotEnv() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("find .env: %w", err)
	}

	for {
		path := filepath.Join(dir, ".env")
		if _, err := os.Stat(path); err == nil {
			if err := godotenv.Load(path); err != nil {
				return "", fmt.Errorf("read %s: %w", path, err)
			}
			return path, nil
		} else if !errors.Is(err, fs.ErrNotExist) {
			return "", fmt.Errorf("find .env: %w", err)
		}

		// The module root is as far as it goes: a .env above it belongs to something else.
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return "", nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", nil
		}
		dir = parent
	}
}

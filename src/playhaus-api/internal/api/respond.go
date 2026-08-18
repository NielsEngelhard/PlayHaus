package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type GameType string

const (
	LeagueOfLettersSolo        GameType = "lol_solo"
	LeagueOfLettersMultiplayer GameType = "lol_multiplayer"
)

// timeFormat is the one wire format for timestamps: RFC 3339 with UTC written
// as "Z", which is what JavaScript's Date parses without surprises.
const timeFormat = time.RFC3339

type Validator interface {
	Validate() map[string]string
}

func decode[T Validator](r *http.Request) (T, map[string]string, error) {
	var v T
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v); err != nil {
		return v, nil, fmt.Errorf("decode json: %w", err)
	}
	return v, v.Validate(), nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// The status line is already on the wire, so there is no way to turn
		// this into an error response. Log it and move on.
		slog.Error("write json response", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// writeErrorCode is writeError plus a stable machine-readable tag.
func writeErrorCode(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, map[string]string{"error": msg, "code": code})
}

func Deref[T any](p *T, fallback T) T {
	if p == nil {
		return fallback
	}
	return *p
}

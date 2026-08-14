package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
)

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

func Deref[T any](p *T, fallback T) T {
	if p == nil {
		return fallback
	}
	return *p
}

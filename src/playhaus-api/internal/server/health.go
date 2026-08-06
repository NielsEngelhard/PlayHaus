package server

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// healthzTimeout caps how long a wedged database can hang the probe.
const healthzTimeout = 2 * time.Second

// handleHealthz reports whether the app can actually serve traffic. An empty
// users table returns no rows and no error -- that is a pass, since the query
// still proves the file is open and the schema is migrated.
func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), healthzTimeout)
	defer cancel()

	var one int
	if err := s.db.WithContext(ctx).Raw("SELECT 1 FROM users LIMIT 1").Scan(&one).Error; err != nil {
		s.logger.Error("healthz database probe failed", "err", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"title": "database unavailable"})

		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// writeJSON sends body as JSON. Errors use a "title" field, which is the shape
// the app's api client reads them from.
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

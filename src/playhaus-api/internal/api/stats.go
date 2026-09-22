package api

import (
	"crypto/subtle"
	"net/http"
	"runtime"
	"time"
)

// statsHeader carries the shared secret. Not Authorization, which requireAuth owns.
const statsHeader = "X-Stats-Token"

type statsResponse struct {
	UptimeSeconds  int64          `json:"uptimeSeconds"`
	Goroutines     int            `json:"goroutines"`
	HeapInUseBytes uint64         `json:"heapInUseBytes"`
	HeapSysBytes   uint64         `json:"heapSysBytes"`
	NumGC          uint32         `json:"numGC"`
	GCPauseTotalMs float64        `json:"gcPauseTotalMs"`
	Rooms          map[string]int `json:"rooms"`
	Connections    int64          `json:"connections"`
}

// AddStatsHandlers registers the operator route, and only when a token is configured -- an
// unset STATS_TOKEN means the route 404s because it was never added.
func (s *Server) AddStatsHandlers() {
	if s.statsToken == "" {
		return
	}
	s.mux.HandleFunc("GET /api/v1/admin/stats", s.requireStatsToken(s.handleStats))
}

// requireStatsToken is deliberately not requireAuth: requireAuth proves only that some session
// is valid, and POST /api/v1/user/guest hands one of those to anyone who asks.
func (s *Server) requireStatsToken(next http.HandlerFunc) http.HandlerFunc {
	want := []byte(s.statsToken)

	return func(w http.ResponseWriter, r *http.Request) {
		got := []byte(r.Header.Get(statsHeader))
		if subtle.ConstantTimeCompare(got, want) != 1 {
			writeError(w, http.StatusUnauthorized, "invalid stats token")
			return
		}
		next(w, r)
	}
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	hub := s.rt.Stats()

	writeJSON(w, http.StatusOK, statsResponse{
		UptimeSeconds:  int64(time.Since(s.startedAt).Seconds()),
		Goroutines:     runtime.NumGoroutine(),
		HeapInUseBytes: mem.HeapInuse,
		HeapSysBytes:   mem.HeapSys,
		NumGC:          mem.NumGC,
		GCPauseTotalMs: float64(mem.PauseTotalNs) / float64(time.Millisecond),
		Rooms:          hub.Rooms,
		Connections:    hub.Connections,
	})
}

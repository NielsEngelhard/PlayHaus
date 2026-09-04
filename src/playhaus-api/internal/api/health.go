package api

import "net/http"

// The liveness route.
//
// This is the only handler with no token in front of it, and the only one that
// touches nothing. That is deliberate: a container healthcheck and an uptime
// monitor both need an answer that means "the process is up and serving", and
// nothing more. Reaching into SQLite here would fold a second question into the
// first -- the database has one writer and a busy_timeout, so a probe that ran a
// query would occasionally time out behind a write and hand Docker a reason to
// restart a server that was working perfectly.
//
// Everything else in this package is registered behind s.requireAuth. The
// alternative to this route, before it existed, was POST /api/v1/user/guest,
// which answers 200 and writes a user row every single time it is asked.

type healthResponse struct {
	Status string `json:"status"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}

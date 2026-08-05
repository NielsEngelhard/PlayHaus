package server

import (
	"log/slog"
	"net/http"
	"strings"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/leagueofletters"
	"playhaus-api/internal/pubquizr"
)

type Server struct {
	logger *slog.Logger
}

func New(logger *slog.Logger) *Server {
	return &Server{logger: logger}
}

// Handler wires every domain onto one mux. This is the only file that
// changes when a new domain is added.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mount(mux, "/api/v1/auth/", (&auth.Handlers{}).Routes())
	mount(mux, "/api/v1/league-of-letters/", (&leagueofletters.Handlers{}).Routes())
	mount(mux, "/api/v1/pubquizr/", (&pubquizr.Handlers{}).Routes())

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	return s.withMiddleware(mux)
}

// mount attaches a domain's routes at prefix, stripping it so the domain's
// own patterns stay relative. The trailing slash makes it a subtree match.
func mount(mux *http.ServeMux, prefix string, h http.Handler) {
	mux.Handle(prefix, http.StripPrefix(strings.TrimSuffix(prefix, "/"), h))
}

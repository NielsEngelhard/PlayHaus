package server

import (
	"log/slog"
	"net/http"
	"strings"

	"gorm.io/gorm"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/leagueofletters"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/user"
)

type Server struct {
	logger *slog.Logger
	db     *gorm.DB
}

func New(logger *slog.Logger, db *gorm.DB) *Server {
	return &Server{logger: logger, db: db}
}

// Handler wires every domain onto one mux.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mount(mux, "/api/v1/auth/", (&auth.Handlers{}).Routes())
	mount(mux, "/api/v1/users/", auth.RequireUser(user.NewHandlers(s.db, s.logger).Routes()))
	mount(mux, "/api/v1/league-of-letters/", (&leagueofletters.Handlers{}).Routes())
	mount(mux, "/api/v1/pubquizr/", (&pubquizr.Handlers{}).Routes())

	mux.HandleFunc("GET /healthz", s.handleHealthz)

	return s.withMiddleware(mux)
}

// mount attaches a domain's routes at prefix, stripping it so the domain's
// own patterns stay relative. The trailing slash makes it a subtree match.
func mount(mux *http.ServeMux, prefix string, h http.Handler) {
	mux.Handle(prefix, http.StripPrefix(strings.TrimSuffix(prefix, "/"), h))
}

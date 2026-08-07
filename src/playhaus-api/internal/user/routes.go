package user

import (
	"log/slog"
	"net/http"

	"gorm.io/gorm"
)

// Handlers carries whatever every endpoint in this domain needs --
// add fields as they appear (token signer, config).
type Handlers struct {
	svc    *Service
	logger *slog.Logger
}

func NewHandlers(db *gorm.DB, logger *slog.Logger) *Handlers {
	return &Handlers{svc: NewService(db), logger: logger}
}

// Routes returns this domain's endpoints. Patterns are relative to the
// prefix the server mounts them under, so nothing here hardcodes /api/v1.
func (h *Handlers) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("PUT /me/username", h.updateUsername)

	return mux
}

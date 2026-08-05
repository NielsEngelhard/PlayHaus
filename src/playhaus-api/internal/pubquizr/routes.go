package pubquizr

import "net/http"

// Handlers carries whatever every endpoint in this domain needs --
// add fields as they appear (db, logger, config).
type Handlers struct{}

// Routes returns this domain's endpoints. Patterns are relative to the
// prefix the server mounts them under, so nothing here hardcodes /api/v1.
func (h *Handlers) Routes() http.Handler {
	mux := http.NewServeMux()

	// endpoints land here, one line each

	return mux
}

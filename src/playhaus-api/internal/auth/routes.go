package auth

import "net/http"

// Handlers carries whatever every endpoint in this domain needs --
// add fields as they appear (db, token signer, config).
type Handlers struct{}

// Routes returns auth's own endpoints. The middleware other domains wrap
// themselves in lives in middleware.go, not here.
func (h *Handlers) Routes() http.Handler {
	mux := http.NewServeMux()

	// endpoints land here, one line each -- POST /login, POST /refresh, ...

	return mux
}

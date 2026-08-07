package user

import (
	"errors"
	"net/http"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/httpx"
)

type updateUsernameRequest struct {
	Username string `json:"username"`
}

// updateUsername handles PUT /me/username. The name is taken from the body,
// the user from the request's identity -- never from the body, or one player
// could rename another.
func (h *Handlers) updateUsername(w http.ResponseWriter, r *http.Request) {
	id, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "not signed in")

		return
	}

	var req updateUsernameRequest
	if err := httpx.Decode(w, r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, err.Error())

		return
	}

	u, err := h.svc.UpdateUsername(r.Context(), id, req.Username)
	if err != nil {
		h.writeServiceError(w, r, err)

		return
	}

	httpx.WriteJSON(w, http.StatusOK, u)
}

// writeServiceError maps the service's sentinel errors onto status codes.
// Anything unrecognised is a bug or an outage: it gets logged in full and
// answered with a generic message.
func (h *Handlers) writeServiceError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrInvalidUsername):
		httpx.WriteError(w, http.StatusBadRequest, err.Error())

	case errors.Is(err, ErrUsernameTaken):
		httpx.WriteError(w, http.StatusConflict, err.Error())

	case errors.Is(err, ErrNotFound):
		httpx.WriteError(w, http.StatusNotFound, err.Error())

	default:
		h.logger.Error("user request failed", "err", err, "path", r.URL.Path)
		httpx.WriteError(w, http.StatusInternalServerError, "something went wrong")
	}
}

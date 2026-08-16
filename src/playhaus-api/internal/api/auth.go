package api

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/user"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Validate only checks that something was supplied. Whether the credentials are
// correct is Login's job, and the answer is always the same 401 either way.
func (r loginRequest) Validate() map[string]string {
	problems := map[string]string{}
	if strings.TrimSpace(r.Email) == "" {
		problems["email"] = "is required"
	}
	if r.Password == "" {
		problems["password"] = "is required"
	}
	return problems
}

// sessionResponse is what every route that starts a session returns. The token
// is the session: store it, send it as a bearer token, drop it on logout.
type sessionResponse struct {
	Token     string       `json:"token"`
	ExpiresAt time.Time    `json:"expiresAt"`
	User      userResponse `json:"user"`
}

func newSessionResponse(u *user.User, s *auth.Session, token string) sessionResponse {
	return sessionResponse{Token: token, ExpiresAt: s.ExpiresAt, User: newUserResponse(u)}
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	req, problems, err := decode[loginRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	u, session, token, err := s.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		s.log.Error("login", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, newSessionResponse(u, session, token))
}

// handleLogout revokes the caller's token. It is deliberately not behind
// requireAuth: logging out with a token that is already invalid should succeed
// quietly rather than hand the client a 401 it cannot act on.
func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if err := s.auth.Logout(r.Context(), auth.BearerToken(r)); err != nil {
		s.log.Error("logout", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleMe resolves a stored token back into its user, which is how the app
// restores a session at launch.
func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		// Unreachable behind requireAuth; a 500 here means a routing mistake.
		s.log.Error("handleMe reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	u, err := s.users.ByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			// The account went away but the session did not.
			writeError(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}
		s.log.Error("load current user", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, newUserResponse(u))
}

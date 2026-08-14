package api

import (
	"errors"
	"net/http"
	"strings"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/user"
)

type createUserRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Locale   string `json:"locale"`
}

// A guest supplies nothing but an optional locale.
type createGuestUserRequest struct {
	Locale *string `json:"locale"`
}

func (createGuestUserRequest) Validate() map[string]string { return nil }

type userResponse struct {
	ID     string      `json:"id"`
	Email  string      `json:"email"`
	Name   string      `json:"name"`
	Locale i18n.Locale `json:"locale"`
}

// localeFrom prefers an explicit locale in the request body and falls back to
// the Accept-Language header. i18n.Parse turns anything unusable into Default.
func localeFrom(body string, r *http.Request) i18n.Locale {
	if strings.TrimSpace(body) != "" {
		return i18n.Parse(body)
	}
	return i18n.Parse(r.Header.Get("Accept-Language"))
}

func (r createUserRequest) Validate() map[string]string {
	problems := map[string]string{}
	if !strings.Contains(r.Email, "@") {
		problems["email"] = "must be a valid email address"
	}
	if len(r.Password) < 8 {
		problems["password"] = "must be at least 8 characters"
	}
	if strings.TrimSpace(r.Name) == "" {
		problems["name"] = "is required"
	}
	return problems
}

func (s *Server) handleCreateGuestUser(w http.ResponseWriter, r *http.Request) {
	// Nothing is required of a guest, so an empty body is allowed.
	req, _, err := decode[createGuestUserRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	locale := Deref(req.Locale, "")

	parsedLocale := i18n.Parse(locale)

	u, err := s.users.CreateGuestUser(r.Context(), &user.CreateGuestUserInput{
		Locale: parsedLocale,
	})
	if err != nil {
		s.log.Error("create guest user", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusCreated, userResponse{ID: u.ID, Email: u.Email, Name: u.Name, Locale: u.Locale})
}

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	req, problems, err := decode[createUserRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	u, err := s.users.CreateUser(r.Context(), &user.CreateUserInput{
		Email: req.Email, Name: req.Name, Password: req.Password,
		Locale: localeFrom(req.Locale, r),
	})
	if err != nil {
		switch {
		case errors.Is(err, user.ErrEmailTaken):
			writeError(w, http.StatusConflict, "email already in use")
		default:
			s.log.Error("create user", "err", err)
			writeError(w, http.StatusInternalServerError, "something went wrong")
		}
		return
	}

	writeJSON(w, http.StatusCreated, userResponse{ID: u.ID, Email: u.Email, Name: u.Name, Locale: u.Locale})
}

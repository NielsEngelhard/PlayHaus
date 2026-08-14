package api

import (
	"errors"
	"net/http"
	"playhaus-api/internal/user"
	"strings"
)

type createUserRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

type userResponse struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
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

	writeJSON(w, http.StatusCreated, userResponse{ID: u.ID, Email: u.Email, Name: u.Name})
}

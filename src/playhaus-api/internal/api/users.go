package api

import (
	"context"
	"errors"
	"fmt"
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

type upgradeGuestUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r *upgradeGuestUserRequest) Validate() map[string]string {
	problems := map[string]string{}

	if !strings.Contains(r.Email, "@") {
		problems["email"] = "must be a valid email address"
	}
	if len(r.Password) < 8 {
		problems["password"] = "must be at least 8 characters"
	}

	return problems
}

// NameMinLength and NameMaxLength bound a display name. The app enforces the
// same numbers in features/settings/profile.ts -- keep the two in step.
const (
	NameMinLength = 4
	NameMaxLength = 16
)

type updateUserUsernameRequest struct {
	Username string `json:"username"`
}

func (r updateUserUsernameRequest) Validate() map[string]string {
	problems := map[string]string{}

	// Measured on the trimmed name, since that is what gets stored: padding is
	// not length, and " " is not a three character name.
	name := strings.TrimSpace(r.Username)

	switch {
	case len([]rune(name)) < NameMinLength:
		problems["username"] = fmt.Sprintf("must be at least %d characters", NameMinLength)
	case len([]rune(name)) > NameMaxLength:
		problems["username"] = fmt.Sprintf("must be at most %d characters", NameMaxLength)
	}

	return problems
}

type updateUserColorRequest struct {
	Color string `json:"color"`
}

func (r updateUserColorRequest) Validate() map[string]string {
	if !user.ValidColor(r.Color) {
		return map[string]string{
			"color": fmt.Sprintf("must be one of: %s", strings.Join(user.Colors, ", ")),
		}
	}
	return nil
}

type updateUserLocaleRequest struct {
	Locale i18n.Locale `json:"locale"`
}

func (r updateUserLocaleRequest) Validate() map[string]string {
	if !r.Locale.Valid() {
		return map[string]string{
			"locale": fmt.Sprintf("must be one of: %s", strings.Join(i18n.Names(), ", ")),
		}
	}
	return nil
}

// The three toggles take a pointer so a body that leaves the field out is a
// complaint rather than a silent "off" -- the two are easy to confuse on the
// wire, and only one of them is what the player asked for.
type updateUserEnableSoundsRequest struct {
	EnableSounds *bool `json:"enableSounds"`
}

func (r updateUserEnableSoundsRequest) Validate() map[string]string {
	return required("enableSounds", r.EnableSounds)
}

type updateUserEnableMusicRequest struct {
	EnableMusic *bool `json:"enableMusic"`
}

func (r updateUserEnableMusicRequest) Validate() map[string]string {
	return required("enableMusic", r.EnableMusic)
}

type updateUserEnableVibrationRequest struct {
	EnableVibration *bool `json:"enableVibration"`
}

func (r updateUserEnableVibrationRequest) Validate() map[string]string {
	return required("enableVibration", r.EnableVibration)
}

func required[T any](field string, value *T) map[string]string {
	if value == nil {
		return map[string]string{field: "is required"}
	}
	return nil
}

type userResponse struct {
	ID              string      `json:"id"`
	Email           string      `json:"email"`
	Name            string      `json:"name"`
	IsGuest         bool        `json:"isGuest"`
	Locale          i18n.Locale `json:"locale"`
	Color           string      `json:"color"`
	EnableSounds    bool        `json:"enableSounds"`
	EnableMusic     bool        `json:"enableMusic"`
	EnableVibration bool        `json:"enableVibration"`
	CreatedAt       string      `json:"createdAt"`
}

func newUserResponse(u *user.User) userResponse {
	return userResponse{
		ID:              u.ID,
		Email:           u.Email,
		Name:            u.Name,
		IsGuest:         u.IsGuest,
		Locale:          u.Locale,
		Color:           u.Color,
		EnableSounds:    u.EnableSounds,
		EnableMusic:     u.EnableMusic,
		EnableVibration: u.EnableVibration,
		CreatedAt:       u.CreatedAt.Format(timeFormat),
	}
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

func updateUserField[T Validator](
	s *Server,
	w http.ResponseWriter,
	r *http.Request,
	what string,
	apply func(ctx context.Context, req T, userID string) error,
) {
	userID, ok := UserIDFrom(r.Context())
	if ok == false {
		writeError(w, http.StatusUnauthorized, "could not determine user id")
		return
	}

	req, problems, err := decode[T](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	if err := apply(r.Context(), req, userID); err != nil {
		if errors.Is(err, user.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}
		s.log.Error(what, "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	// Nothing to say back: the client already knows the value it sent, and /me is
	// where it re-reads the account.
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleUpdateUserUsername(w http.ResponseWriter, r *http.Request) {
	updateUserField(s, w, r, "update username",
		func(ctx context.Context, req updateUserUsernameRequest, userID string) error {
			return s.users.UpdateUsername(ctx, req.Username, userID)
		})
}

func (s *Server) handleUpdateUserColor(w http.ResponseWriter, r *http.Request) {
	updateUserField(s, w, r, "update color",
		func(ctx context.Context, req updateUserColorRequest, userID string) error {
			return s.users.UpdateColor(ctx, req.Color, userID)
		})
}

func (s *Server) handleUpdateUserLocale(w http.ResponseWriter, r *http.Request) {
	updateUserField(s, w, r, "update locale",
		func(ctx context.Context, req updateUserLocaleRequest, userID string) error {
			return s.users.UpdateLocale(ctx, req.Locale, userID)
		})
}

func (s *Server) handleUpdateUserEnableSounds(w http.ResponseWriter, r *http.Request) {
	updateUserField(s, w, r, "update enable sounds",
		func(ctx context.Context, req updateUserEnableSoundsRequest, userID string) error {
			return s.users.UpdateEnableSounds(ctx, *req.EnableSounds, userID)
		})
}

func (s *Server) handleUpdateUserEnableMusic(w http.ResponseWriter, r *http.Request) {
	updateUserField(s, w, r, "update enable music",
		func(ctx context.Context, req updateUserEnableMusicRequest, userID string) error {
			return s.users.UpdateEnableMusic(ctx, *req.EnableMusic, userID)
		})
}

func (s *Server) handleUpdateUserEnableVibration(w http.ResponseWriter, r *http.Request) {
	updateUserField(s, w, r, "update enable vibration",
		func(ctx context.Context, req updateUserEnableVibrationRequest, userID string) error {
			return s.users.UpdateEnableVibration(ctx, *req.EnableVibration, userID)
		})
}

func (s *Server) handleUpgradeGuestUser(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if ok == false {
		writeError(w, http.StatusUnauthorized, "could not determine user id")
	}

	req, problems, err := decode[upgradeGuestUserRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
	}

	err = s.users.UpgradeGuestAccount(r.Context(), userID, req.Email, req.Password)
	if err != nil {
		s.log.Error("create guest user", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusCreated, nil)
}

func (s *Server) handleCreateGuestUser(w http.ResponseWriter, r *http.Request) {
	// Nothing is required of a guest, so an empty body is allowed.
	req, _, err := decode[createGuestUserRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	locale := localeFrom(Deref(req.Locale, ""), r)

	u, err := s.users.CreateGuestUser(r.Context(), &user.CreateGuestUserInput{
		Locale: locale,
	})
	if err != nil {
		s.log.Error("create guest user", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	// A guest has no password, so Login could never let them back in. The token
	// minted here is the only way into the account -- lose it and the account
	// is gone.
	session, token, err := s.auth.StartSession(r.Context(), u.ID)
	if err != nil {
		s.log.Error("start guest session", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusCreated, newSessionResponse(u, session, token))
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

	// Signing up logs you in, so the client does not have to immediately replay
	// the password it just sent.
	session, token, err := s.auth.StartSession(r.Context(), u.ID)
	if err != nil {
		s.log.Error("start session after signup", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusCreated, newSessionResponse(u, session, token))
}

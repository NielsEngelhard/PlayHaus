package app_user

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"playhausapi/internal/authctx"
	hash_utils "playhausapi/internal/util/hash"
	json_utils "playhausapi/internal/util/json"

	"gorm.io/gorm"
)

type Handler struct {
	DB *gorm.DB
}

func New(db *gorm.DB) *Handler { return &Handler{DB: db} }

func (h *Handler) CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	user := AppUser{
		Name:           req.Name,
		Email:          req.Email,
		IsGuestAccount: req.IsGuest,
	}

	// Guest accounts have no password, so PasswordHash stays nil for them.
	if !req.IsGuest {
		hashedPassword, err := hash_utils.HashPassword(req.Password)
		if err != nil {
			http.Error(w, "Error trying to hash the password", http.StatusInternalServerError)
			return
		}
		user.PasswordHash = &hashedPassword
	}

	if err := h.DB.WithContext(r.Context()).Create(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			http.Error(w, "Email already in use", http.StatusConflict)
			return
		}
		http.Error(w, "Could not create user", http.StatusInternalServerError)
		return
	}

	json_utils.WriteJSON(w, http.StatusCreated, NewUserResponse(user))
}

// Changes the signed-in account's profile: name, avatar colour, preferences.
//
// Every field is optional — the app saves a single toggle far more often than it
// saves the whole page — so the request uses pointers and only what was sent is
// written. Whose profile it is comes from the session, never from the body: an
// id in the body would let anyone edit anyone.
func (h *Handler) UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	// A map rather than a struct: `Updates` with a struct skips zero values, so
	// switching a preference off would silently do nothing.
	changes := map[string]any{}

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			http.Error(w, "Name cannot be empty", http.StatusBadRequest)
			return
		}
		if utf8.RuneCountInString(name) > NameMaxLength {
			http.Error(w, "Name is too long", http.StatusBadRequest)
			return
		}
		changes["name"] = name
	}

	if req.AvatarColorID != nil {
		if !IsAvatarColorID(*req.AvatarColorID) {
			http.Error(w, "Unknown avatar colour", http.StatusBadRequest)
			return
		}
		changes["avatar_color_id"] = *req.AvatarColorID
	}

	if req.SoundEnabled != nil {
		changes["sound_enabled"] = *req.SoundEnabled
	}
	if req.VibrationEnabled != nil {
		changes["vibration_enabled"] = *req.VibrationEnabled
	}

	// An empty body is not an error, it just has nothing to write. Skipping the
	// update keeps GORM from refusing it and still returns the current profile.
	if len(changes) > 0 {
		if err := h.DB.WithContext(r.Context()).
			Model(&AppUser{}).
			Where("id = ?", userID).
			Updates(changes).Error; err != nil {
			http.Error(w, "Could not update profile", http.StatusInternalServerError)
			return
		}
	}

	// Read back rather than echoing the request: the response is the profile as
	// it now stands, which is what the app replaces its state with.
	var user AppUser
	err := h.DB.WithContext(r.Context()).Where("id = ?", userID).First(&user).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	case err != nil:
		http.Error(w, "Could not load user", http.StatusInternalServerError)
		return
	}

	json_utils.WriteJSON(w, http.StatusOK, NewUserResponse(user))
}

func (h *Handler) GetUsersHandler(w http.ResponseWriter, r *http.Request) {
	users := []AppUser{}

	if err := h.DB.WithContext(r.Context()).Find(&users).Error; err != nil {
		http.Error(w, "Error executing get users query", http.StatusInternalServerError)
		return
	}

	out := make([]UserResponse, 0, len(users))
	for _, u := range users {
		out = append(out, NewUserResponse(u))
	}

	json_utils.WriteJSON(w, http.StatusOK, listResponse[UserResponse]{Data: out})
}

func NewUserResponse(u AppUser) UserResponse {
	return UserResponse{
		ID:               u.ID,
		Name:             u.Name,
		Email:            u.Email,
		IsGuestAccount:   u.IsGuestAccount,
		AvatarColorID:    u.AvatarColorID,
		SoundEnabled:     u.SoundEnabled,
		VibrationEnabled: u.VibrationEnabled,
		CreatedAt:        u.CreatedAt,
	}
}

type UserResponse struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Email            *string   `json:"email,omitempty"`
	IsGuestAccount   bool      `json:"isGuestAccount"`
	AvatarColorID    string    `json:"avatarColorId"`
	SoundEnabled     bool      `json:"soundEnabled"`
	VibrationEnabled bool      `json:"vibrationEnabled"`
	CreatedAt        time.Time `json:"createdAt"`
}

type listResponse[T any] struct {
	Data []T `json:"data"`
}

// Request data
type createUserRequest struct {
	Name     string  `json:"name"`
	Email    *string `json:"email"`
	IsGuest  bool    `json:"isGuestAccount"`
	Password string  `json:"password"`
}

// Pointers, so a field that was left out reads as "leave it alone" rather than
// as "set it to empty/false".
type updateProfileRequest struct {
	Name             *string `json:"name"`
	AvatarColorID    *string `json:"avatarColorId"`
	SoundEnabled     *bool   `json:"soundEnabled"`
	VibrationEnabled *bool   `json:"vibrationEnabled"`
}

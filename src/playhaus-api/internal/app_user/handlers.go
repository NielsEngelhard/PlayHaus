package app_user

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

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

func (h *Handler) UpdateUsernameHandler(w http.ResponseWriter, r *http.Request) {
	var req updateUsernameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
	}

	res := h.DB.WithContext(r.Context()).
		Model(&AppUser{}).
		Where("id == ?", req.UserID).
		Update("username", req.NewUsername)

	if res.Error != nil {
		http.Error(w, "Error updating user", http.StatusInternalServerError)
	}
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
		ID:             u.ID,
		Name:           u.Name,
		Email:          u.Email,
		IsGuestAccount: u.IsGuestAccount,
		CreatedAt:      u.CreatedAt,
	}
}

type UserResponse struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Email          *string   `json:"email,omitempty"`
	IsGuestAccount bool      `json:"isGuestAccount"`
	CreatedAt      time.Time `json:"createdAt"`
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

type updateUsernameRequest struct {
	UserID      string `json:"user_id"`
	NewUsername string `json:"new_username"`
}

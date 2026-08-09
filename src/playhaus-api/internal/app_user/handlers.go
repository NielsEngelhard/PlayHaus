package app_user

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

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

	if err := h.DB.WithContext(r.Context()).Create(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			http.Error(w, "Email already in use", http.StatusConflict)
			return
		}
		http.Error(w, "Could not create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
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

func (h *Handler) GetUsersHandler(w http.ResponseWriter, r *http.Request) []userResponse {
	var users []AppUser

	dbRes := h.DB.WithContext(r.Context()).Find(&users)
	if dbRes.Error != nil {
		http.Error(w, "Error executing get users query", http.StatusInternalServerError)
		return []
	}

	return newUserResponse()
}

func newUserResponse(u AppUser) userResponse {
      return userResponse{
              ID:             u.ID,
              Name:           u.Name,
              Email:          u.Email,
              IsGuestAccount: u.IsGuestAccount,
              CreatedAt:      u.CreatedAt,
      }
}

type userResponse struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Email          *string   `json:"email,omitempty"`
	IsGuestAccount bool      `json:"isGuestAccount"`
	CreatedAt      time.Time `json:"createdAt"`
}

// Request data
type createUserRequest struct {
	Name    string  `json:"name"`
	Email   *string `json:"email"`
	IsGuest bool    `json:"isGuestAccount"`
}

type updateUsernameRequest struct {
	UserID      string `json:"user_id"`
	NewUsername string `json:"new_username"`
}

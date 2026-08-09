package app_user

import (
	"encoding/json"
	"errors"
	"log"
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

func (h *Handler) GetUsersHandler(w http.ResponseWriter, r *http.Request) {
	users := []AppUser{}

	if err := h.DB.WithContext(r.Context()).Find(&users).Error; err != nil {
		http.Error(w, "Error executing get users query", http.StatusInternalServerError)
		return
	}

	out := make([]userResponse, 0, len(users))
	for _, u := range users {
		out = append(out, newUserResponse(u))
	}

	writeJSON(w, http.StatusOK, listResponse[userResponse]{Data: out})
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

type listResponse[T any] struct {
	Data []T `json:"data"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write json: %v", err)
	}
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

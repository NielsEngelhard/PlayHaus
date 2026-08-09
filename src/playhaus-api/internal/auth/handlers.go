package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	app_user "playhausapi/internal/app_user"
	hash_utils "playhausapi/internal/util/hash"
	json_utils "playhausapi/internal/util/json"

	"gorm.io/gorm"
)

const (
	sessionCookieName = "playhaus_session"
	sessionTTL        = 7 * 24 * time.Hour
)

// dummyHash is compared against when no account matches, so a wrong email
// costs the same time as a wrong password. Without it, response timing
// reveals which email addresses are registered.
var dummyHash string

func init() {
	h, err := hash_utils.HashPassword("not-a-real-password")
	if err != nil {
		panic("auth: could not build dummy hash: " + err.Error())
	}
	dummyHash = h
}

type Handler struct {
	DB *gorm.DB

	// SecureCookies marks session cookies HTTPS-only. Leave false for local
	// development over plain HTTP; set it to true in production.
	SecureCookies bool
}

func New(db *gorm.DB) *Handler { return &Handler{DB: db} }

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		unauthorized(w)
		return
	}

	var user app_user.AppUser
	err := h.DB.WithContext(r.Context()).
		Where("email = ?", req.Email).
		First(&user).Error

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		hash_utils.VerifyPassword(req.Password, dummyHash)
		unauthorized(w)
		return
	case err != nil:
		http.Error(w, "Could not log in", http.StatusInternalServerError)
		return
	}

	// Guest accounts have no password and so can never log in.
	if user.PasswordHash == nil || !hash_utils.VerifyPassword(req.Password, *user.PasswordHash) {
		unauthorized(w)
		return
	}

	token, err := newSessionToken()
	if err != nil {
		http.Error(w, "Could not log in", http.StatusInternalServerError)
		return
	}

	session := Session{
		UserID:    user.ID,
		TokenHash: hashToken(token),
		ExpiresAt: time.Now().Add(sessionTTL),
	}
	if err := h.DB.WithContext(r.Context()).Create(&session).Error; err != nil {
		http.Error(w, "Could not log in", http.StatusInternalServerError)
		return
	}

	h.setSessionCookie(w, token, session.ExpiresAt)
	json_utils.WriteJSON(w, http.StatusOK, loginResponse{ID: user.ID, Name: user.Name})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err == nil && cookie.Value != "" {
		// Hard delete: Session has no DeletedAt, so the row is really gone.
		if err := h.DB.WithContext(r.Context()).
			Where("token_hash = ?", hashToken(cookie.Value)).
			Delete(&Session{}).Error; err != nil {
			http.Error(w, "Could not log out", http.StatusInternalServerError)
			return
		}
	}

	// Always clear the cookie, even if there was no session to delete, so
	// logging out twice is harmless.
	h.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) setSessionCookie(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		Secure:   h.SecureCookies,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *Handler) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.SecureCookies,
		SameSite: http.SameSiteLaxMode,
	})
}

// newSessionToken returns 256 bits of cryptographically random data. This is
// the value handed to the client; it is never stored as-is.
func newSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// hashToken is plain SHA-256 rather than bcrypt: the token is already high
// entropy, so it needs no stretching, and lookups must stay indexable.
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// unauthorized keeps the message identical for every failure reason so the
// response body cannot be used to tell which emails exist.
func unauthorized(w http.ResponseWriter) {
	http.Error(w, "Invalid email or password", http.StatusUnauthorized)
}

// Request data
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

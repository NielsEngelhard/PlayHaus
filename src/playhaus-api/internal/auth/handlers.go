package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	app_user "playhausapi/internal/app_user"
	"playhausapi/internal/authctx"
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

	session, token, err := h.issueSession(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Could not log in", http.StatusInternalServerError)
		return
	}

	h.setSessionCookie(w, token, session.ExpiresAt)
	json_utils.WriteJSON(w, http.StatusOK, authResponse{
		Token:     token,
		ExpiresAt: session.ExpiresAt,
		User:      app_user.NewUserResponse(user),
	})
}

// Guest creates a throwaway account and logs it straight in.
//
// It exists because signup plus login cannot express this: a guest has no
// password, and Login rejects passwordless accounts by design. Without a
// handler that mints the session itself, a guest could be created but never
// authenticate as anyone.
func (h *Handler) Guest(w http.ResponseWriter, r *http.Request) {
	var req guestRequest
	// An empty body is allowed — the name is optional — so only a malformed one
	// is an error.
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		generated, err := randomGuestName()
		if err != nil {
			http.Error(w, "Could not create guest", http.StatusInternalServerError)
			return
		}
		name = generated
	}

	// Email and PasswordHash stay nil: there is no second way into this account.
	// It lives exactly as long as the token we hand back.
	user := app_user.AppUser{Name: name, IsGuestAccount: true}
	if err := h.DB.WithContext(r.Context()).Create(&user).Error; err != nil {
		http.Error(w, "Could not create guest", http.StatusInternalServerError)
		return
	}

	session, token, err := h.issueSession(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Could not create guest", http.StatusInternalServerError)
		return
	}

	h.setSessionCookie(w, token, session.ExpiresAt)
	json_utils.WriteJSON(w, http.StatusCreated, authResponse{
		Token:     token,
		ExpiresAt: session.ExpiresAt,
		User:      app_user.NewUserResponse(user),
	})
}

// Me returns the account behind the caller's session. Clients hold a token
// across restarts but cannot see who it belongs to, so this is what turns a
// stored token back into a logged-in user — or a 401 telling them to discard it.
//
// Must be wrapped in RequireAuth.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		unauthenticated(w)
		return
	}

	var user app_user.AppUser
	err := h.DB.WithContext(r.Context()).
		Where("id = ?", userID).
		First(&user).Error

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		// The session outlived the account it points at. Treat it as signed out
		// rather than as a server fault.
		unauthenticated(w)
		return
	case err != nil:
		http.Error(w, "Could not load user", http.StatusInternalServerError)
		return
	}

	json_utils.WriteJSON(w, http.StatusOK, app_user.NewUserResponse(user))
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if token := sessionToken(r); token != "" {
		// Hard delete: Session has no DeletedAt, so the row is really gone.
		if err := h.DB.WithContext(r.Context()).
			Where("token_hash = ?", hashToken(token)).
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

// issueSession mints a token and stores its hash. The returned token is the
// only copy that is ever readable; everything after this compares hashes.
func (h *Handler) issueSession(ctx context.Context, userID string) (Session, string, error) {
	token, err := newSessionToken()
	if err != nil {
		return Session{}, "", err
	}

	session := Session{
		UserID:    userID,
		TokenHash: hashToken(token),
		ExpiresAt: time.Now().Add(sessionTTL),
	}
	if err := h.DB.WithContext(ctx).Create(&session).Error; err != nil {
		return Session{}, "", err
	}

	return session, token, nil
}

// sessionToken pulls the caller's session token out of the request, preferring
// the Authorization header over the cookie.
//
// Both are supported because the two clients differ: a browser gets the cookie
// set for it and cannot read it back, while the React Native app stores the
// token itself — it has no shared cookie jar with the web build, and on Expo
// web the API is a different origin, where a cookie would need CORS
// credentials to travel at all.
func sessionToken(r *http.Request) string {
	const prefix = "Bearer "

	if header := r.Header.Get("Authorization"); len(header) > len(prefix) &&
		strings.EqualFold(header[:len(prefix)], prefix) {
		return strings.TrimSpace(header[len(prefix):])
	}

	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		return cookie.Value
	}

	return ""
}

// randomGuestName labels a guest with something a person can recognise in a
// player list. The suffix is random rather than sequential so it doesn't leak
// how many accounts exist.
func randomGuestName() (string, error) {
	b := make([]byte, 2)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "Guest-" + strings.ToUpper(hex.EncodeToString(b)), nil
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

// guestRequest carries the name a guest picked for themselves. Optional — an
// empty body gets a generated name.
type guestRequest struct {
	Name string `json:"name"`
}

// authResponse is what every route that starts a session returns, so a client
// can treat login and guest sign-in through one code path.
type authResponse struct {
	Token     string                `json:"token"`
	ExpiresAt time.Time             `json:"expiresAt"`
	User      app_user.UserResponse `json:"user"`
}

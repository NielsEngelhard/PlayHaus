package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"net/http"
	"strings"
	"time"
)

const (
	sessionCookieName = "playhaus_session"
	sessionTTL        = 7 * 24 * time.Hour
)

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
	if err := h.sessions.Create(ctx, &session); err != nil {
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
		Secure:   h.secureCookies,
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
		Secure:   h.secureCookies,
		SameSite: http.SameSiteLaxMode,
	})
}

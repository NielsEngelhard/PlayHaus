package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strings"
)

// newToken returns 256 bits of cryptographically random data. This is the only
// readable copy of the token -- it is handed to the client and never stored.
func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// hashToken is plain SHA-256 rather than bcrypt: the token is already 256 bits
// of entropy, so it needs no stretching, and a fast deterministic hash is what
// lets the lookup use an index.
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// BearerToken pulls the session token out of an Authorization header, or
// returns "" if there isn't a well-formed one.
//
// Bearer rather than a cookie because the client is a React Native app: it has
// no shared cookie jar, and it already stores the token itself in the device
// keychain via expo-secure-store.
func BearerToken(r *http.Request) string {
	const prefix = "Bearer "

	header := r.Header.Get("Authorization")
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return ""
	}
	return strings.TrimSpace(header[len(prefix):])
}

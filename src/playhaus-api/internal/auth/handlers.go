// Package auth turns credentials into sessions, and sessions back into a user
// ID on the request context.
package auth

import (
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"playhausapi/internal/authctx"
	"playhausapi/internal/database"
	"playhausapi/internal/httpjson"
	"playhausapi/internal/password"
	"playhausapi/internal/user"
)

// dummyHash is compared against when no account matches, so a wrong email
// costs the same time as a wrong password. Without it, response timing
// reveals which email addresses are registered.
//
// Computed on first use rather than in an init(): bcrypt at cost 12 takes about
// a quarter of a second, and a package that spends that before main() has even
// started is a surprise nobody needs. sync.OnceValue also keeps the failure
// where it can be handled instead of panicking at load time.
var dummyHash = sync.OnceValue(func() string {
	h, err := password.Hash("not-a-real-password-just-for-timing")
	if err != nil {
		// Only reachable if the password rules above reject a literal this file
		// controls, which is a programming error rather than a runtime one.
		panic("auth: could not build dummy hash: " + err.Error())
	}
	return h
})

type Handler struct {
	sessions *Store
	users    *user.Store

	// secureCookies marks session cookies HTTPS-only. False only for local
	// development over plain HTTP, where a Secure cookie would never be stored.
	secureCookies bool
}

func NewHandler(sessions *Store, users *user.Store, secureCookies bool) *Handler {
	return &Handler{sessions: sessions, users: users, secureCookies: secureCookies}
}

func New(db *database.DB, secureCookies bool) *Handler {
	return NewHandler(NewStore(db), user.NewStore(db), secureCookies)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpjson.Decode(w, r, &req); err != nil {
		httpjson.WriteDecodeError(w, err)
		return
	}

	// Normalized the same way signup stored it, so the address someone typed
	// with a capital letter still finds their account.
	email, err := user.NormalizeEmail(req.Email)
	if err != nil || req.Password == "" {
		password.Verify(req.Password, dummyHash())
		writeInvalidCredentials(w)
		return
	}

	account, err := h.users.ByEmail(r.Context(), email)
	switch {
	case errors.Is(err, user.ErrNotFound):
		password.Verify(req.Password, dummyHash())
		writeInvalidCredentials(w)
		return
	case err != nil:
		httpjson.WriteInternal(w, r, err, "Could not log in")
		return
	}

	// Guest accounts have no password and so can never log in.
	if account.PasswordHash == nil || !password.Verify(req.Password, *account.PasswordHash) {
		writeInvalidCredentials(w)
		return
	}

	session, token, err := h.issueSession(r.Context(), account.ID)
	if err != nil {
		httpjson.WriteInternal(w, r, err, "Could not log in")
		return
	}

	h.setSessionCookie(w, token, session.ExpiresAt)
	httpjson.Write(w, http.StatusOK, authResponse{
		Token:     token,
		ExpiresAt: session.ExpiresAt,
		User:      user.NewSelfResponse(account),
	})
}

// Guest creates a throwaway account and logs it straight in.
//
// It exists because signup plus login cannot express this: a guest has no
// password, and Login rejects passwordless accounts by design. Without a
// handler that mints the session itself, a guest could be created but never
// authenticate as anyone. It is also the only way a guest account is ever
// made — the signup endpoint deliberately cannot produce one.
func (h *Handler) Guest(w http.ResponseWriter, r *http.Request) {
	var req guestRequest
	// An empty body is allowed — the name is optional — so only a malformed one
	// is an error.
	if err := httpjson.DecodeOptional(w, r, &req); err != nil {
		httpjson.WriteDecodeError(w, err)
		return
	}

	var name string
	if strings.TrimSpace(req.Name) == "" {
		generated, err := randomGuestName()
		if err != nil {
			httpjson.WriteInternal(w, r, err, "Could not create guest")
			return
		}
		name = generated
	} else {
		validated, err := user.ValidateName(req.Name)
		if err != nil {
			httpjson.WriteError(w, http.StatusBadRequest, "INVALID_NAME", "Name is not valid")
			return
		}
		name = validated
	}

	// Email and PasswordHash stay nil: there is no second way into this account.
	// It lives exactly as long as the token we hand back.
	account := user.AppUser{Name: name, IsGuestAccount: true}
	if err := h.users.Create(r.Context(), &account); err != nil {
		httpjson.WriteInternal(w, r, err, "Could not create guest")
		return
	}

	session, token, err := h.issueSession(r.Context(), account.ID)
	if err != nil {
		httpjson.WriteInternal(w, r, err, "Could not create guest")
		return
	}

	h.setSessionCookie(w, token, session.ExpiresAt)
	httpjson.Write(w, http.StatusCreated, authResponse{
		Token:     token,
		ExpiresAt: session.ExpiresAt,
		User:      user.NewSelfResponse(account),
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
		httpjson.WriteUnauthorized(w)
		return
	}

	account, err := h.users.ByID(r.Context(), userID)
	switch {
	case errors.Is(err, user.ErrNotFound):
		// The session outlived the account it points at. Treat it as signed out
		// rather than as a server fault.
		httpjson.WriteUnauthorized(w)
		return
	case err != nil:
		httpjson.WriteInternal(w, r, err, "Could not load user")
		return
	}

	httpjson.Write(w, http.StatusOK, user.NewSelfResponse(account))
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if token := sessionToken(r); token != "" {
		if err := h.sessions.DeleteByTokenHash(r.Context(), hashToken(token)); err != nil {
			httpjson.WriteInternal(w, r, err, "Could not log out")
			return
		}
	}

	// Always clear the cookie, even if there was no session to delete, so
	// logging out twice is harmless.
	h.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

// writeInvalidCredentials keeps the response identical for every failure reason
// so neither the body nor the status can be used to tell which emails exist.
func writeInvalidCredentials(w http.ResponseWriter) {
	httpjson.WriteError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password")
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
	Token     string            `json:"token"`
	ExpiresAt time.Time         `json:"expiresAt"`
	User      user.SelfResponse `json:"user"`
}

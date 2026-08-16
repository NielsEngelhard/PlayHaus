package api

import (
	"net/http"
	"testing"
)

const signupBody = `{"email":"a@b.com","name":"A","password":"supersecret"}`

// Signing up hands back a working session, so the client never has to replay
// the password it just sent.
func TestSignupReturnsUsableSession(t *testing.T) {
	srv := newTestServer(t)

	rec := post(t, srv, "/api/v1/user", signupBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("signup status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}

	session := decodeBody[sessionResponse](t, rec)
	if session.Token == "" {
		t.Fatal("signup returned an empty token")
	}
	if session.User.IsGuest {
		t.Error("signup produced a guest account")
	}
	if session.ExpiresAt.IsZero() {
		t.Error("signup returned no expiry")
	}

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	if me.Code != http.StatusOK {
		t.Fatalf("me status = %d, want %d (body: %s)", me.Code, http.StatusOK, me.Body)
	}
	if got := decodeBody[userResponse](t, me); got.ID != session.User.ID {
		t.Errorf("me returned user %q, want %q", got.ID, session.User.ID)
	}
}

func TestGuestGetsASessionAndIsMarkedGuest(t *testing.T) {
	srv := newTestServer(t)

	session := newGuestSession(t, srv)
	if !session.User.IsGuest {
		t.Error("guest account not marked as a guest")
	}

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	if me.Code != http.StatusOK {
		t.Fatalf("me status = %d, want %d (body: %s)", me.Code, http.StatusOK, me.Body)
	}
}

func TestLogin(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"correct credentials", `{"email":"a@b.com","password":"supersecret"}`, http.StatusOK},
		{"email is case insensitive", `{"email":"A@B.CoM","password":"supersecret"}`, http.StatusOK},
		{"wrong password", `{"email":"a@b.com","password":"wrongpassword"}`, http.StatusUnauthorized},
		{"unknown email", `{"email":"nobody@b.com","password":"supersecret"}`, http.StatusUnauthorized},
		{"missing password", `{"email":"a@b.com"}`, http.StatusUnprocessableEntity},
		{"missing email", `{"password":"supersecret"}`, http.StatusUnprocessableEntity},
		{"malformed json", `{"email":`, http.StatusBadRequest},
		{"unknown field", `{"email":"a@b.com","password":"supersecret","admin":true}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t) // fresh db per subtest
			if rec := post(t, srv, "/api/v1/user", signupBody); rec.Code != http.StatusCreated {
				t.Fatalf("seed signup: status = %d (body: %s)", rec.Code, rec.Body)
			}

			rec := post(t, srv, "/api/v1/auth/login", tt.body)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// A guest has no password, so no password can ever log into one -- including
// the empty string, which is the shape a nil hash would take if it leaked.
func TestGuestCannotLogIn(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	for _, password := range []string{"", "cheese", "supersecret"} {
		body := `{"email":"` + session.User.Email + `","password":"` + password + `"}`
		rec := post(t, srv, "/api/v1/auth/login", body)
		if rec.Code == http.StatusOK {
			t.Errorf("logged into a guest account with password %q", password)
		}
	}
}

// Logging in twice is two independent sessions: revoking one must not revoke
// the other, which is what makes "log out on this device" possible.
func TestLogoutRevokesOnlyThatToken(t *testing.T) {
	srv := newTestServer(t)
	first := decodeBody[sessionResponse](t, post(t, srv, "/api/v1/user", signupBody))

	rec := post(t, srv, "/api/v1/auth/login", `{"email":"a@b.com","password":"supersecret"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("second login: status = %d (body: %s)", rec.Code, rec.Body)
	}
	second := decodeBody[sessionResponse](t, rec)

	if first.Token == second.Token {
		t.Fatal("two logins produced the same token")
	}

	out := do(t, srv, http.MethodPost, "/api/v1/auth/logout", "", first.Token)
	if out.Code != http.StatusNoContent {
		t.Fatalf("logout status = %d, want %d (body: %s)", out.Code, http.StatusNoContent, out.Body)
	}

	if got := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", first.Token); got.Code != http.StatusUnauthorized {
		t.Errorf("revoked token: status = %d, want %d", got.Code, http.StatusUnauthorized)
	}
	if got := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", second.Token); got.Code != http.StatusOK {
		t.Errorf("other session: status = %d, want %d (body: %s)", got.Code, http.StatusOK, got.Body)
	}
}

// Logout is not behind requireAuth: a client holding a dead token should be
// able to clear it without first being told 401.
func TestLogoutIsIdempotent(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	for i := range 2 {
		rec := do(t, srv, http.MethodPost, "/api/v1/auth/logout", "", session.Token)
		if rec.Code != http.StatusNoContent {
			t.Errorf("logout %d: status = %d, want %d (body: %s)", i+1, rec.Code, http.StatusNoContent, rec.Body)
		}
	}
	if rec := do(t, srv, http.MethodPost, "/api/v1/auth/logout", "", ""); rec.Code != http.StatusNoContent {
		t.Errorf("logout without a token: status = %d, want %d", rec.Code, http.StatusNoContent)
	}
}

func TestProtectedRoutesRejectBadTokens(t *testing.T) {
	srv := newTestServer(t)
	valid := newGuestSession(t, srv).Token

	tests := map[string]struct {
		header string
		want   int
	}{
		"no header":        {"", http.StatusUnauthorized},
		"empty bearer":     {"Bearer ", http.StatusUnauthorized},
		"not a token":      {"Bearer nonsense", http.StatusUnauthorized},
		"wrong scheme":     {"Basic " + valid, http.StatusUnauthorized},
		"raw token":        {valid, http.StatusUnauthorized},
		"valid":            {"Bearer " + valid, http.StatusOK},
		"lowercase bearer": {"bearer " + valid, http.StatusOK},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			req := newRequest(t, http.MethodGet, "/api/v1/auth/me", "")
			if tt.header != "" {
				req.Header.Set("Authorization", tt.header)
			}
			rec := serve(srv, req)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// The token is a bearer credential, so the database must not hold a copy that
// could be replayed straight out of a dump.
func TestRawTokenIsNotStored(t *testing.T) {
	srv, db := newTestServerWithDB(t)
	session := newGuestSession(t, srv)

	var count int64
	if err := db.Raw(`SELECT count(*) FROM sessions WHERE token_hash = ?`, session.Token).Scan(&count).Error; err != nil {
		t.Fatalf("query sessions: %v", err)
	}
	if count != 0 {
		t.Error("the raw token was stored in the sessions table")
	}
}

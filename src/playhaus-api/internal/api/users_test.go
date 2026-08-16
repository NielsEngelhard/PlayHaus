package api

import (
	"net/http"
	"testing"
)

// The whole rename: send a new name, and /me -- which is what the app re-reads
// the account with -- reports it.
func TestUpdateUsername(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodPut, "/api/v1/user/username", `{"username":"SnelleVos12"}`, session.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("update status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	if me.Code != http.StatusOK {
		t.Fatalf("me status = %d, want %d (body: %s)", me.Code, http.StatusOK, me.Body)
	}
	if got := decodeBody[userResponse](t, me).Name; got != "SnelleVos12" {
		t.Errorf("name = %q, want %q", got, "SnelleVos12")
	}
}

// Without a token there is no user to rename, so the route must not be reachable.
func TestUpdateUsernameRequiresAuth(t *testing.T) {
	srv := newTestServer(t)

	rec := do(t, srv, http.MethodPut, "/api/v1/user/username", `{"username":"SnelleVos12"}`, "")
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestUpdateUsername_Validation(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"valid", `{"username":"Bobby"}`, http.StatusNoContent},
		{"exactly the minimum", `{"username":"Bobs"}`, http.StatusNoContent},
		{"too short", `{"username":"Bob"}`, http.StatusUnprocessableEntity},
		{"whitespace padding is not length", `{"username":" Bob "}`, http.StatusUnprocessableEntity},
		{"too long", `{"username":"AbsurdlyLongPlayerName"}`, http.StatusUnprocessableEntity},
		{"malformed json", `{"username":`, http.StatusBadRequest},
		{"unknown field", `{"username":"Bobby","admin":true}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t) // fresh db per subtest
			session := newGuestSession(t, srv)

			rec := do(t, srv, http.MethodPut, "/api/v1/user/username", tt.body, session.Token)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// A name arrives from a mobile keyboard with padding more often than not, and
// the padding is not part of what other players see.
func TestUpdateUsernameStoresTrimmed(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodPut, "/api/v1/user/username", `{"username":"  Bobby  "}`, session.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("update status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	if got := decodeBody[userResponse](t, me).Name; got != "Bobby" {
		t.Errorf("name = %q, want %q", got, "Bobby")
	}
}

func TestCreateUser_Validation(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"valid", `{"email":"a@b.com","name":"A","password":"supersecret"}`, http.StatusCreated},
		{"bad email", `{"email":"nope","name":"A","password":"supersecret"}`, http.StatusUnprocessableEntity},
		{"short password", `{"email":"a@b.com","name":"A","password":"x"}`, http.StatusUnprocessableEntity},
		{"empty name", `{"email":"a@b.com","name":"  ","password":"supersecret"}`, http.StatusUnprocessableEntity},
		{"malformed json", `{"email":`, http.StatusBadRequest},
		{"unknown field", `{"email":"a@b.com","name":"A","password":"supersecret","admin":true}`, http.StatusBadRequest},
		{"empty body", ``, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t) // fresh db per subtest
			rec := post(t, srv, "/api/v1/user", tt.body)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

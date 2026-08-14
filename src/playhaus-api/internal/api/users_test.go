package api

import (
	"encoding/json"
	"net/http"
	"testing"
)

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
			rec := post(t, srv, "/v1/users", tt.body)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

func TestCreateUser(t *testing.T) {
	srv := newTestServer(t)

	rec := post(t, srv, "/v1/users",
		`{"email":"niels@example.com","name":"Niels","password":"supersecret"}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body: %s)", rec.Code, rec.Body)
	}

	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if got["email"] != "niels@example.com" {
		t.Errorf("email = %v", got["email"])
	}
	if id, ok := got["id"].(float64); !ok || id == 0 {
		t.Errorf("id = %v, want non-zero", got["id"])
	}

	// The response must never leak the hash.
	if _, leaked := got["password_hash"]; leaked {
		t.Error("response contains password_hash")
	}
	if _, leaked := got["password"]; leaked {
		t.Error("response contains password")
	}
}

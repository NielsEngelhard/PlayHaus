package api

import (
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
			rec := post(t, srv, "/api/v1/user", tt.body)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

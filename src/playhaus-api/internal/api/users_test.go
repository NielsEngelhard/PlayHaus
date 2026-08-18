package api

import (
	"fmt"
	"net/http"
	"testing"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/user"
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

// A swatch is picked, and /me reports it back.
func TestUpdateColor(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodPut, "/api/v1/user/color", `{"color":"cobalt"}`, session.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("update status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	if got := decodeBody[userResponse](t, me).Color; got != "cobalt" {
		t.Errorf("color = %q, want %q", got, "cobalt")
	}
}

func TestUpdateColor_Validation(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"valid", `{"color":"fire"}`, http.StatusNoContent},
		{"unknown swatch", `{"color":"chartreuse"}`, http.StatusUnprocessableEntity},
		{"empty", `{"color":""}`, http.StatusUnprocessableEntity},
		{"a hex value is not an id", `{"color":"#ff0000"}`, http.StatusUnprocessableEntity},
		{"missing field", `{}`, http.StatusUnprocessableEntity},
		{"malformed json", `{"color":`, http.StatusBadRequest},
		{"unknown field", `{"color":"fire","admin":true}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t) // fresh db per subtest
			session := newGuestSession(t, srv)

			rec := do(t, srv, http.MethodPut, "/api/v1/user/color", tt.body, session.Token)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// Every swatch the app offers has to be one the backend takes, or the picker
// has a dead square in it.
func TestUpdateColorAcceptsEverySwatch(t *testing.T) {
	for _, color := range user.Colors {
		t.Run(color, func(t *testing.T) {
			srv := newTestServer(t)
			session := newGuestSession(t, srv)

			rec := do(t, srv, http.MethodPut, "/api/v1/user/color", `{"color":"`+color+`"}`, session.Token)
			if rec.Code != http.StatusNoContent {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
			}
		})
	}
}

// A guest starts in i18n.Default, so switching away from it is the only change
// that proves anything: a new locale has to survive the round trip and come back
// out of /me, which is where the app re-reads the flag in its header from.
func TestUpdateLocale(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	rec := do(t, srv, http.MethodPut, "/api/v1/user/locale", `{"locale":"en"}`, session.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("update status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	if got := decodeBody[userResponse](t, me).Locale; got != i18n.EN {
		t.Errorf("locale = %q, want %q", got, i18n.EN)
	}
}

// Unlike the game routes, this one does not run its input through i18n.Parse:
// an account setting that quietly stored Dutch when English was picked would
// leave the picker and the account disagreeing. So a region tag and an
// unsupported language are both refused rather than coerced.
func TestUpdateLocale_Validation(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"valid", `{"locale":"en"}`, http.StatusNoContent},
		{"the default is still a choice", `{"locale":"nl"}`, http.StatusNoContent},
		{"unsupported language", `{"locale":"fr"}`, http.StatusUnprocessableEntity},
		{"region tags are not parsed here", `{"locale":"nl-NL"}`, http.StatusUnprocessableEntity},
		{"uppercase", `{"locale":"EN"}`, http.StatusUnprocessableEntity},
		{"empty", `{"locale":""}`, http.StatusUnprocessableEntity},
		{"missing field", `{}`, http.StatusUnprocessableEntity},
		{"not a string", `{"locale":5}`, http.StatusBadRequest},
		{"malformed json", `{"locale":`, http.StatusBadRequest},
		{"unknown field", `{"locale":"en","admin":true}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t) // fresh db per subtest
			session := newGuestSession(t, srv)

			rec := do(t, srv, http.MethodPut, "/api/v1/user/locale", tt.body, session.Token)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// Every language the app offers has to be one the backend takes, or the picker
// has a dead row in it.
func TestUpdateLocaleAcceptsEveryLanguage(t *testing.T) {
	for _, locale := range i18n.Locales {
		t.Run(locale.String(), func(t *testing.T) {
			srv := newTestServer(t)
			session := newGuestSession(t, srv)

			body := fmt.Sprintf(`{"locale":%q}`, locale)
			rec := do(t, srv, http.MethodPut, "/api/v1/user/locale", body, session.Token)
			if rec.Code != http.StatusNoContent {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
			}

			me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
			if got := decodeBody[userResponse](t, me).Locale; got != locale {
				t.Errorf("locale = %q, want %q", got, locale)
			}
		})
	}
}

// The three toggles behave alike, so they are tested alike: turning one off has
// to survive the round trip, which is the case a default of "on" could mask.
func TestUpdateToggles(t *testing.T) {
	tests := []struct {
		name  string
		path  string
		field string
		read  func(userResponse) bool
	}{
		{"sounds", "/api/v1/user/enable-sounds", "enableSounds", func(u userResponse) bool { return u.EnableSounds }},
		{"music", "/api/v1/user/enable-music", "enableMusic", func(u userResponse) bool { return u.EnableMusic }},
		{"vibration", "/api/v1/user/enable-vibration", "enableVibration", func(u userResponse) bool { return u.EnableVibration }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, want := range []bool{false, true} {
				srv := newTestServer(t)
				session := newGuestSession(t, srv)

				// A fresh account starts with every toggle on, so setting one to
				// true only proves anything once it has been off first.
				seed := fmt.Sprintf(`{"%s":%t}`, tt.field, !want)
				if rec := do(t, srv, http.MethodPut, tt.path, seed, session.Token); rec.Code != http.StatusNoContent {
					t.Fatalf("seed status = %d (body: %s)", rec.Code, rec.Body)
				}

				body := fmt.Sprintf(`{"%s":%t}`, tt.field, want)
				rec := do(t, srv, http.MethodPut, tt.path, body, session.Token)
				if rec.Code != http.StatusNoContent {
					t.Fatalf("update status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
				}

				me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
				if got := tt.read(decodeBody[userResponse](t, me)); got != want {
					t.Errorf("%s = %t, want %t", tt.field, got, want)
				}
			}
		})
	}
}

// A toggle only ever means what the caller sent, so a body that says nothing is
// a complaint rather than an "off".
func TestUpdateToggle_Validation(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"on", `{"enableSounds":true}`, http.StatusNoContent},
		{"off", `{"enableSounds":false}`, http.StatusNoContent},
		{"missing field", `{}`, http.StatusUnprocessableEntity},
		{"null", `{"enableSounds":null}`, http.StatusUnprocessableEntity},
		{"not a bool", `{"enableSounds":"yes"}`, http.StatusBadRequest},
		{"malformed json", `{"enableSounds":`, http.StatusBadRequest},
		{"unknown field", `{"enableSounds":true,"admin":true}`, http.StatusBadRequest},
		{"the wrong toggle's field", `{"enableMusic":true}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := newTestServer(t) // fresh db per subtest
			session := newGuestSession(t, srv)

			rec := do(t, srv, http.MethodPut, "/api/v1/user/enable-sounds", tt.body, session.Token)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}

// None of these routes may be reachable without a session: each one edits an
// account, and the only account it may edit is the caller's.
func TestUpdateUserFieldsRequireAuth(t *testing.T) {
	tests := map[string]string{
		"/api/v1/user/color":            `{"color":"fire"}`,
		"/api/v1/user/locale":           `{"locale":"en"}`,
		"/api/v1/user/enable-sounds":    `{"enableSounds":false}`,
		"/api/v1/user/enable-music":     `{"enableMusic":false}`,
		"/api/v1/user/enable-vibration": `{"enableVibration":false}`,
	}

	for path, body := range tests {
		t.Run(path, func(t *testing.T) {
			srv := newTestServer(t)

			rec := do(t, srv, http.MethodPut, path, body, "")
			if rec.Code != http.StatusUnauthorized {
				t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
			}
		})
	}
}

// A new account has to arrive usable: a swatch the picker can highlight, and
// sound on rather than a game that seems broken.
func TestNewUserDefaults(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	got := decodeBody[userResponse](t, me)

	if got.Color != user.DefaultColor {
		t.Errorf("color = %q, want %q", got.Color, user.DefaultColor)
	}
	if !got.EnableSounds || !got.EnableMusic || !got.EnableVibration {
		t.Errorf("toggles = sounds:%t music:%t vibration:%t, want all true",
			got.EnableSounds, got.EnableMusic, got.EnableVibration)
	}
}

// One field per route, so editing one must leave the others where they were.
func TestUpdateUserFieldsAreIndependent(t *testing.T) {
	srv := newTestServer(t)
	session := newGuestSession(t, srv)

	if rec := do(t, srv, http.MethodPut, "/api/v1/user/enable-music", `{"enableMusic":false}`, session.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("update music status = %d (body: %s)", rec.Code, rec.Body)
	}
	if rec := do(t, srv, http.MethodPut, "/api/v1/user/color", `{"color":"ink"}`, session.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("update color status = %d (body: %s)", rec.Code, rec.Body)
	}
	if rec := do(t, srv, http.MethodPut, "/api/v1/user/locale", `{"locale":"en"}`, session.Token); rec.Code != http.StatusNoContent {
		t.Fatalf("update locale status = %d (body: %s)", rec.Code, rec.Body)
	}

	me := do(t, srv, http.MethodGet, "/api/v1/auth/me", "", session.Token)
	got := decodeBody[userResponse](t, me)

	if got.Color != "ink" {
		t.Errorf("color = %q, want %q", got.Color, "ink")
	}
	if got.Locale != i18n.EN {
		t.Errorf("locale = %q, want %q", got.Locale, i18n.EN)
	}
	if got.EnableMusic {
		t.Error("music came back on after being turned off")
	}
	if !got.EnableSounds || !got.EnableVibration {
		t.Errorf("untouched toggles changed: sounds:%t vibration:%t, want both true",
			got.EnableSounds, got.EnableVibration)
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

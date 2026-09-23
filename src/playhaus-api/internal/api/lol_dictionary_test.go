package api

import (
	"fmt"
	"net/http"
	"testing"

	"playhaus-api/internal/lol"
)

func dictionaryPath(locale string, length int) string {
	return fmt.Sprintf("/api/v1/league-of-letters/dictionary/%s/%d", locale, length)
}

func TestDictionaryNeedsASession(t *testing.T) {
	h := newTestServer(t)

	rec := do(t, h, http.MethodGet, dictionaryPath("nl", 5), "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestDictionaryAnswersEveryLocaleAndLength(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	for _, locale := range []string{"nl", "en"} {
		for length := lol.MinWordLength; length <= lol.MaxWordLength; length++ {
			rec := do(t, h, http.MethodGet, dictionaryPath(locale, length), "", session.Token)
			if rec.Code != http.StatusOK {
				t.Fatalf("%s/%d: status = %d, want %d (body: %s)", locale, length, rec.Code, http.StatusOK, rec.Body)
			}

			body := decodeBody[dictionaryResponse](t, rec)
			if body.Locale.String() != locale || body.WordLength != length {
				t.Fatalf("%s/%d: answered %s/%d", locale, length, body.Locale, body.WordLength)
			}

			if len(body.Words) == 0 {
				t.Fatalf("%s/%d: no words", locale, length)
			}

			for _, word := range body.Words {
				if len(word) != length {
					t.Fatalf("%s/%d: %q is not %d letters", locale, length, word, length)
				}
			}
		}
	}
}

// The list the client checks a guess against has to be the one the server judges it by,
// or the app refuses a word the API would have taken.
func TestDictionaryHoldsEveryWordTheServerAccepts(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	rec := do(t, h, http.MethodGet, dictionaryPath("nl", 5), "", session.Token)
	body := decodeBody[dictionaryResponse](t, rec)

	for _, word := range body.Words {
		if !lol.IsAllowedWord(body.Locale, 5, word) {
			t.Fatalf("%q is in the list the app trusts but the server refuses it", word)
		}
	}
}

func TestDictionaryRefusesAnUnknownLocaleOrLength(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	// "de" parses to the default rather than failing, so the handler compares the
	// round trip -- otherwise every unknown language would quietly serve Dutch.
	for _, path := range []string{
		dictionaryPath("de", 5),
		dictionaryPath("nl", lol.MinWordLength-1),
		dictionaryPath("nl", lol.MaxWordLength+1),
		dictionaryPath("nl", 0),
		"/api/v1/league-of-letters/dictionary/nl/five",
	} {
		rec := do(t, h, http.MethodGet, path, "", session.Token)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("%s: status = %d, want %d (body: %s)", path, rec.Code, http.StatusNotFound, rec.Body)
		}
	}
}

func TestDictionaryRevalidatesWithItsEtag(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	first := do(t, h, http.MethodGet, dictionaryPath("en", 6), "", session.Token)
	etag := first.Header().Get("ETag")
	if etag == "" {
		t.Fatal("no ETag, so the client has nothing to revalidate with")
	}

	if cache := first.Header().Get("Cache-Control"); cache != "private, max-age=86400" {
		t.Fatalf("Cache-Control = %q, which a shared cache may keep", cache)
	}

	again := do(t, h, http.MethodGet, dictionaryPath("en", 6), "", session.Token)
	if again.Header().Get("ETag") != etag {
		t.Fatal("the same list answered a different ETag, so the client refetches it forever")
	}

	req := newRequest(t, http.MethodGet, dictionaryPath("en", 6), "")
	req.Header.Set("Authorization", "Bearer "+session.Token)
	req.Header.Set("If-None-Match", etag)

	rec := serve(h, req)
	if rec.Code != http.StatusNotModified {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotModified, rec.Body)
	}

	if rec.Body.Len() != 0 {
		t.Fatalf("304 carried a body: %s", rec.Body)
	}
}

// Two lists that differ have to differ in their etag, or a client keeps the wrong one.
func TestDictionaryEtagIsPerLocaleAndLength(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	seen := map[string]string{}
	for _, locale := range []string{"nl", "en"} {
		for length := lol.MinWordLength; length <= lol.MaxWordLength; length++ {
			rec := do(t, h, http.MethodGet, dictionaryPath(locale, length), "", session.Token)
			etag := rec.Header().Get("ETag")

			if other, clash := seen[etag]; clash {
				t.Fatalf("%s/%d shares an ETag with %s", locale, length, other)
			}
			seen[etag] = fmt.Sprintf("%s/%d", locale, length)
		}
	}
}

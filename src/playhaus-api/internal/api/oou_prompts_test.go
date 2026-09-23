package api

import (
	"fmt"
	"net/http"
	"testing"

	"playhaus-api/internal/oneofus"
)

func promptsPath(locale string, mode oneofus.GameMode) string {
	return fmt.Sprintf("/api/v1/one-of-us/prompts/%s/%s", locale, mode)
}

func TestPromptPackNeedsASession(t *testing.T) {
	h := newTestServer(t)

	rec := do(t, h, http.MethodGet, promptsPath("nl", oneofus.Sentence), "", "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestPromptPackAnswersEveryLocaleAndMode(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	for _, locale := range []string{"nl", "en"} {
		for _, mode := range []oneofus.GameMode{oneofus.Word, oneofus.Sentence} {
			rec := do(t, h, http.MethodGet, promptsPath(locale, mode), "", session.Token)
			if rec.Code != http.StatusOK {
				t.Fatalf("%s/%s: status = %d, want %d (body: %s)", locale, mode, rec.Code, http.StatusOK, rec.Body)
			}

			body := decodeBody[promptPackResponse](t, rec)
			if body.Locale.String() != locale || body.Mode != mode {
				t.Fatalf("%s/%s: answered %s/%s", locale, mode, body.Locale, body.Mode)
			}

			if len(body.Pairs) != MaxPromptPack {
				t.Fatalf("%s/%s: %d pairs, want %d", locale, mode, len(body.Pairs), MaxPromptPack)
			}

			// A pack with a half-empty pair in it deals a table a game it cannot play.
			for _, pair := range body.Pairs {
				if pair.Actual == "" || pair.Imposter == "" {
					t.Fatalf("%s/%s: incomplete pair %+v", locale, mode, pair)
				}
			}
		}
	}
}

func TestPromptPackHonoursCountUpToItsCeiling(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	for count, want := range map[int]int{1: 1, 12: 12, MaxPromptPack: MaxPromptPack, MaxPromptPack + 500: MaxPromptPack} {
		path := fmt.Sprintf("%s?count=%d", promptsPath("en", oneofus.Word), count)

		rec := do(t, h, http.MethodGet, path, "", session.Token)
		if rec.Code != http.StatusOK {
			t.Fatalf("count=%d: status = %d, want %d (body: %s)", count, rec.Code, http.StatusOK, rec.Body)
		}

		if pairs := decodeBody[promptPackResponse](t, rec).Pairs; len(pairs) != want {
			t.Fatalf("count=%d: %d pairs, want %d", count, len(pairs), want)
		}
	}
}

func TestPromptPackRefusesACountThatIsNotOne(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	for _, count := range []string{"0", "-3", "many", "1.5"} {
		path := fmt.Sprintf("%s?count=%s", promptsPath("nl", oneofus.Sentence), count)

		rec := do(t, h, http.MethodGet, path, "", session.Token)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Fatalf("count=%s: status = %d, want %d (body: %s)", count, rec.Code, http.StatusUnprocessableEntity, rec.Body)
		}
	}
}

func TestPromptPackRefusesAnUnknownLocaleOrMode(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	// "de" parses to the default rather than failing, so the handler compares the
	// round trip -- otherwise every unknown language would quietly serve Dutch.
	for _, path := range []string{
		promptsPath("de", oneofus.Sentence),
		promptsPath("nl", "paragraph"),
		promptsPath("nl", "Word"),
	} {
		rec := do(t, h, http.MethodGet, path, "", session.Token)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("%s: status = %d, want %d (body: %s)", path, rec.Code, http.StatusNotFound, rec.Body)
		}
	}
}

// The pack is what a phone plays off away from the network, so two of them running out
// the same order would deal every table the same evening.
func TestPromptPacksAreNotAllTheSamePack(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	first := decodeBody[promptPackResponse](t, do(t, h, http.MethodGet, promptsPath("nl", oneofus.Sentence), "", session.Token))
	for range 10 {
		second := decodeBody[promptPackResponse](t, do(t, h, http.MethodGet, promptsPath("nl", oneofus.Sentence), "", session.Token))
		if first.Pairs[0] != second.Pairs[0] {
			return
		}
	}

	t.Fatal("eleven packs all opened on the same pair")
}

// The single-device create route hands over both lines of the pair it deals, so a pack
// of them is not a leak -- this pins that, because the day it stops being true the pack
// route is giving away the game.
func TestPromptPackGivesAwayNoMoreThanStartingAGameDoes(t *testing.T) {
	h := newTestServer(t)
	session := newGuestSession(t, h)

	rec := do(t, h, http.MethodPost, oouSingleDevicePath, oouCreateBody(t, "nl", false, "Ann", "Bo", "Cas", "Dee"), session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	created := decodeBody[oouCreatedResponse](t, rec)
	game := decodeBody[oouSingleDeviceGameResponse](t, do(t, h, http.MethodGet, oouSingleDevicePath+"/"+created.GameID, "", session.Token))

	if game.ActualQuestion == "" || game.ImposterQuestion == "" {
		t.Fatal("a started game no longer carries both lines, so the prompt pack now discloses something it did not")
	}
}

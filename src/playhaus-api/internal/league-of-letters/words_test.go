package league_of_letters

import (
	"playhaus-api/internal/i18n"
	league_of_letters "playhaus-api/internal/league-of-letters"
	"testing"
)

func TestIsAllowedWord_BatchTests(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		lang     i18n.Locale
		expected bool
	}{
		{"existing in all EN", `abbey`, i18n.EN, true},
		{"does not care about casing", `AbBeY`, i18n.EN, true},
		{"not existing in all EN", `kloks`, i18n.EN, true},
		{"all te same letters EN", `yyyyyy`, i18n.EN, false},
		{"existing in all NL", `klok`, i18n.NL, true},
		{"not existing in all NL", `fier`, i18n.NL, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := league_of_letters.IsAllowedWord(tt.lang, len(tt.input), tt.input)
			if res != tt.expected {
				t.Errorf("input = %d, lang %d (expected: %s)", tt.input, tt.lang, tt.expected)
			}
		})
	}
}

package league_of_letters

import (
	"playhaus-api/internal/i18n"
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
		// A Dutch word, asked of the English list -- the lists are per language,
		// so it is not a word here.
		{"not existing in all EN", `kloks`, i18n.EN, false},
		{"all te same letters EN", `yyyyyy`, i18n.EN, false},
		{"existing in all NL", `klok`, i18n.NL, true},
		{"existing in all NL, four letters", `fier`, i18n.NL, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := IsAllowedWord(tt.lang, len(tt.input), tt.input)
			if res != tt.expected {
				t.Errorf("IsAllowedWord(%s, %q) = %t, want %t", tt.lang, tt.input, res, tt.expected)
			}
		})
	}
}

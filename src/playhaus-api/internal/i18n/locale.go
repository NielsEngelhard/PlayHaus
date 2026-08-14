package i18n

import "strings"

type Locale string

const (
	EN      Locale = "en"
	NL      Locale = "nl"
	Default        = EN
)

var supported = map[Locale]bool{EN: true, NL: true}

func (l Locale) Valid() bool    { return supported[l] }
func (l Locale) String() string { return string(l) }

// Parse normalises a locale string. "nl-NL", "NL", "nl" all yield NL.
// Unsupported or empty input yields Default.
func Parse(s string) Locale {
	s = strings.ToLower(strings.TrimSpace(s))
	if i := strings.IndexAny(s, "-_"); i > 0 {
		s = s[:i]
	}
	if l := Locale(s); l.Valid() {
		return l
	}
	return Default
}

package i18n

import (
	"database/sql/driver"
	"fmt"
	"slices"
	"strings"
)

type Locale string

const (
	EN      Locale = "en"
	NL      Locale = "nl"
	Default        = NL
)

// Every language/locale the API accepts
var Locales = []Locale{NL, EN}

func (l Locale) Valid() bool    { return slices.Contains(Locales, l) }
func (l Locale) String() string { return string(l) }

// Names lists the supported locales as plain strings, for a validation message
// that has to spell out the alternatives.
func Names() []string {
	names := make([]string, len(Locales))
	for i, l := range Locales {
		names[i] = l.String()
	}
	return names
}

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

// Locale implements driver.Valuer and sql.Scanner so it can be used directly
// as a struct field type. GORM picks both up automatically, so a Locale field
// needs no converter and no `gorm:"type:..."` tag.

// Value stores the locale as plain text. An unsupported locale is rejected
// rather than written, so an invalid value can never reach the database --
// including the zero value, which catches a User built without a locale.
func (l Locale) Value() (driver.Value, error) {
	if !l.Valid() {
		return nil, fmt.Errorf("i18n: refusing to store unsupported locale %q", string(l))
	}
	return string(l), nil
}

// Scan reads the locale back. The driver hands us a string or, depending on
// the column type, a []byte -- both are accepted.
func (l *Locale) Scan(src any) error {
	switch v := src.(type) {
	case nil:
		return fmt.Errorf("i18n: cannot scan NULL into Locale")
	case string:
		*l = Locale(v)
	case []byte:
		*l = Locale(v)
	default:
		return fmt.Errorf("i18n: cannot scan %T into Locale", src)
	}
	if !l.Valid() {
		return fmt.Errorf("i18n: unsupported locale %q found in database", string(*l))
	}
	return nil
}

// GormDataType tells GORM to give the column a plain string type when it
// builds the DDL. Without it GORM has to guess from the Valuer.
func (Locale) GormDataType() string { return "string" }

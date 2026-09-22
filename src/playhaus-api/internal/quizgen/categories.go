package quizgen

import (
	"fmt"

	"playhaus-api/internal/i18n"
)

// Categories are round 1's shelves, canonically in English. They travel through generation unlocalised so the same question is filed the same way in every language.
var Categories = []string{
	"History",
	"Geography",
	"Science",
	"Sport",
	"Nature",
	"Film",
	"Music",
	"The Netherlands",
	"Art",
	"Language",
	"Food",
	"Technology",
}

var categoryLabels = map[i18n.Locale]map[string]string{
	i18n.NL: {
		"History":         "Geschiedenis",
		"Geography":       "Aardrijkskunde",
		"Science":         "Wetenschap",
		"Sport":           "Sport",
		"Nature":          "Natuur",
		"Film":            "Film",
		"Music":           "Muziek",
		"The Netherlands": "Nederland",
		"Art":             "Kunst",
		"Language":        "Taal",
		"Food":            "Eten",
		"Technology":      "Techniek",
	},
}

// label is how one locale writes a category. English is canonical, so it is its own label.
func label(locale i18n.Locale, category string) (string, error) {
	if locale == i18n.EN {
		if _, known := categoryLabels[i18n.NL][category]; !known {
			return "", fmt.Errorf("%q is not a category (try one of %v)", category, Categories)
		}
		return category, nil
	}

	written, known := categoryLabels[locale][category]
	if !known {
		return "", fmt.Errorf("%q is not a category (try one of %v)", category, Categories)
	}

	return written, nil
}

// canonical reads a category back off a file that was written in one language.
func canonical(locale i18n.Locale, written string) (string, error) {
	for _, category := range Categories {
		found, err := label(locale, category)
		if err != nil {
			return "", err
		}
		if found == written {
			return category, nil
		}
	}

	return "", fmt.Errorf("%q is not a category in %s (try one of %v)", written, locale, Categories)
}

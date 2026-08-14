package user

import (
	"fmt"
	"math/rand/v2"
	"playhaus-api/internal/i18n"
)

var enAdjectives = []string{
	"brave", "clever", "swift", "quiet", "lucky", "bold", "sly", "keen",
	"calm", "mighty", "gentle", "wild", "proud", "cunning", "fresh",
	"bright", "sturdy", "noble", "merry", "steady", "sharp", "nimble",
	"handy", "sunny", "dreamy", "playful", "kind", "honest", "golden",
	"silent",
}

var enNouns = []string{
	"otter", "falcon", "badger", "heron", "lynx", "marten", "raven",
	"pike", "fox", "hare", "owl", "beaver", "hedgehog", "stag", "finch",
	"starling", "buzzard", "seal", "polecat", "weasel", "frog", "newt",
	"swan", "goose", "crow", "blackbird", "sparrow", "woodpecker",
	"stoat", "boar",
}

// --- Dutch -----------------------------------------------------------

var nlAdjectives = []string{
	"dapper", "slim", "snel", "stil", "vrolijk", "stoer", "wijs", "fel",
	"kalm", "sterk", "zacht", "wild", "trots", "listig", "fris", "licht",
	"stevig", "koen", "blij", "rustig", "scherp", "vlug", "handig",
	"nobel", "zonnig", "dromerig", "speels", "gul", "eerlijk", "gouden",
}

var nlNouns = []string{
	"otter", "valk", "das", "reiger", "lynx", "marter", "raaf", "snoek",
	"vos", "haas", "uil", "bever", "egel", "hert", "mees", "spreeuw",
	"buizerd", "zeehond", "bunzing", "wezel", "kikker", "salamander",
	"zwaan", "gans", "kraai", "merel", "vink", "specht", "hermelijn",
	"steenmarter",
}

var wordLists = map[i18n.Locale]struct{ adjectives, nouns []string }{
	i18n.EN: {enAdjectives, enNouns},
	i18n.NL: {nlAdjectives, nlNouns},
}

// generateUsername returns a random display name like "swiftotter42".
// It makes no uniqueness guarantee — the caller handles collisions.
func generateUsername(locale i18n.Locale) string {
	words := wordLists[locale]

	return fmt.Sprintf("%s%s%d",
		words.adjectives[rand.IntN(len(words.adjectives))],
		words.nouns[rand.IntN(len(words.nouns))],
		rand.IntN(100),
	)
}

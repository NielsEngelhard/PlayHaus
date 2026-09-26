package user

import (
	"fmt"
	"math/rand/v2"
	"playhaus-api/internal/i18n"
)

var enAdjectives = []string{
	"Red", "Blue", "Green", "Orange", "Pink", "Yellow", "Gray", "Orange", "Brown", "Black",
}

var enNouns = []string{
	"Banana", "Potato", "Pancake", "Goofball", "Dumpling",
	"Cheese", "Noodle", "Meatball", "Pickle", "Shoe",
}

// --- Dutch -----------------------------------------------------------

var nlAdjectives = []string{
	"Rode", "Blauwe", "Groene", "Oranje", "Roze", "Gele", "Grijze",
	"Bruine", "Zwarte", "Paarse",
	"Boze", "Knappe", "Krokante",
	"Smerige", "Snelle", "Trage", "Natte", "Droge", "Harige", "Kale",
}

var nlNouns = []string{
	"Banaan", "Aardappel", "Pannenkoek", "Snotneus", "Aardbei",
	"Kaas", "Boterham", "Knakworst", "Kipnugget", "Schoen",
	"Frikandel", "Stofzuiger", "Badeend", "Tosti", "Kroket",
	"Fietsbel", "Sok",
}

var wordLists = map[i18n.Locale]struct{ adjectives, nouns []string }{
	i18n.EN: {enAdjectives, enNouns},
	i18n.NL: {nlAdjectives, nlNouns},
}

func generateUsername(locale i18n.Locale) string {
	words := wordLists[locale]

	return fmt.Sprintf("%s%s",
		words.adjectives[rand.IntN(len(words.adjectives))],
		words.nouns[rand.IntN(len(words.nouns))],
	)
}

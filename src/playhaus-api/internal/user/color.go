package user

import "slices"

// Colors are the avatar swatches an account can pick from.
var Colors = []string{"lemon", "fire", "cobalt", "mint", "blush", "ink"}

// DefaultColor is what a fresh account gets, matching the first swatch the app shows so a new player and their picker agree before anything is picked.
const DefaultColor = "lemon"

func ValidColor(color string) bool {
	return slices.Contains(Colors, color)
}

package user

import "slices"

// Colors are the avatar swatches an account can pick from. They are ids, not
// hex: what "lemon" looks like is the app's business, and it keeps the matching
// list in features/settings/profile.ts -- adding one means adding it there too.
var Colors = []string{"lemon", "fire", "cobalt", "mint", "blush", "ink"}

// DefaultColor is what a fresh account gets, matching the first swatch the app
// shows so a new player and their picker agree before anything is picked.
const DefaultColor = "lemon"

func ValidColor(color string) bool {
	return slices.Contains(Colors, color)
}

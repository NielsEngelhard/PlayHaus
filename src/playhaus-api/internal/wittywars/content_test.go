package wittywars

import (
	"testing"

	"playhaus-api/internal/i18n"
)

// Every file has to deal the biggest table the game allows, or that table cannot start at all.
func TestEveryLocaleAndModeHoldsEnoughPromptsForAFullTable(t *testing.T) {
	need := RoundsFor(MaxLobbyPlayers, MaxAnswersPerPlayer)

	for _, locale := range i18n.Locales {
		for _, mode := range GameModes {
			lines, err := GetContentLines(locale, mode, need)
			if err != nil {
				t.Errorf("GetContentLines(%s, %s, %d): %v", locale, mode, need, err)
				continue
			}
			if len(lines) != need {
				t.Errorf("GetContentLines(%s, %s) returned %d lines, want %d", locale, mode, len(lines), need)
			}
		}
	}
}

// Half of every file names a player, so a game is dealt some of both.
func TestHalfOfEveryFileNamesAPlayer(t *testing.T) {
	for _, locale := range i18n.Locales {
		for _, mode := range GameModes {
			lines, err := contentLines(locale, mode)
			if err != nil {
				t.Fatalf("contentLines(%s, %s): %v", locale, mode, err)
			}
			named := 0
			for _, line := range lines {
				if HasPlaceholder(line) {
					named++
				}
			}
			if named*2 != len(lines) {
				t.Errorf("%s-%s: %d of %d prompts name a player, want half", locale, mode, named, len(lines))
			}
		}
	}
}

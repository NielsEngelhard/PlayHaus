package fakefiller

import (
	"errors"
	"strings"
	"testing"

	"playhaus-api/internal/i18n"
)

// The path template was borrowed from a package whose modes are singular against plural
// files, and the trailing "s" it came with asked for en-factss.txt -- a file that has
// never existed, which made GetContentLines fail for every locale and every mode. Written
// as a loop over both axes rather than as one call, because the bug was in the template
// and a template is wrong for all of its inputs at once.
func TestEveryLocaleAndModeNamesAFileThatExists(t *testing.T) {
	for _, locale := range i18n.Locales {
		for _, mode := range []FFGameMode{GameModeFacts, GameModeCreative} {
			lines, err := GetContentLines(locale, mode, 1)
			if err != nil {
				t.Errorf("GetContentLines(%s, %s): %v", locale, mode, err)
				continue
			}
			if len(lines) != 1 {
				t.Errorf("GetContentLines(%s, %s) returned %d lines, want 1", locale, mode, len(lines))
			}
		}
	}
}

// Every prompt has to be playable by the biggest table the game allows, because the round
// count is the player count and a short file is a game that cannot be dealt at all.
func TestEveryFileHoldsEnoughPromptsForAFullTable(t *testing.T) {
	for _, locale := range i18n.Locales {
		for _, mode := range []FFGameMode{GameModeFacts, GameModeCreative} {
			lines, err := GetContentLines(locale, mode, RoundsFor(MaxLobbyPlayers))
			if err != nil {
				t.Errorf("GetContentLines(%s, %s) for a full table: %v", locale, mode, err)
				continue
			}
			if len(lines) != RoundsFor(MaxLobbyPlayers) {
				t.Errorf("GetContentLines(%s, %s) returned %d lines, want %d",
					locale, mode, len(lines), RoundsFor(MaxLobbyPlayers))
			}
		}
	}
}

func TestFactsPromptsCarryOneAnswerPerBlank(t *testing.T) {
	for _, locale := range i18n.Locales {
		lines, err := GetContentLines(locale, GameModeFacts, RoundsFor(MaxLobbyPlayers))
		if err != nil {
			t.Fatalf("GetContentLines(%s, facts): %v", locale, err)
		}

		for _, line := range lines {
			if line.Blanks == 0 {
				t.Errorf("%s: %q has no blanks", locale, line.Line)
			}
			if line.Blanks != strings.Count(line.Line, Placeholder) {
				t.Errorf("%s: %q reports %d blanks but has %d",
					locale, line.Line, line.Blanks, strings.Count(line.Line, Placeholder))
			}
			if len(line.Answers) != line.Blanks {
				t.Errorf("%s: %q has %d blanks and %d answers",
					locale, line.Line, line.Blanks, len(line.Answers))
			}
		}
	}
}

// Creative prompts have no truth to carry, which is the whole of what makes that mode two
// options instead of three.
func TestCreativePromptsHaveNoAnswers(t *testing.T) {
	for _, locale := range i18n.Locales {
		lines, err := GetContentLines(locale, GameModeCreative, RoundsFor(MaxLobbyPlayers))
		if err != nil {
			t.Fatalf("GetContentLines(%s, creative): %v", locale, err)
		}

		for _, line := range lines {
			if line.Blanks == 0 {
				t.Errorf("%s: %q has no blanks", locale, line.Line)
			}
			if len(line.Answers) != 0 {
				t.Errorf("%s: %q carries answers %v, want none", locale, line.Line, line.Answers)
			}
		}
	}
}

// Asking for more than the file holds is loud rather than short. Quietly returning four
// prompts for a six-player table would not deal a smaller game -- it would deal a broken
// one, with two players holding prompts that do not exist.
func TestAskingForMorePromptsThanTheFileHoldsIsAnError(t *testing.T) {
	_, err := GetContentLines(i18n.EN, GameModeFacts, 1000)
	if !errors.Is(err, ErrNotEnoughContent) {
		t.Fatalf("GetContentLines for 1000 prompts: err = %v, want ErrNotEnoughContent", err)
	}
}

func TestAskingForNoPromptsIsNotAnError(t *testing.T) {
	lines, err := GetContentLines(i18n.EN, GameModeFacts, 0)
	if err != nil {
		t.Fatalf("GetContentLines for 0 prompts: %v", err)
	}
	if len(lines) != 0 {
		t.Errorf("GetContentLines for 0 prompts returned %d", len(lines))
	}
}

// The parser reads the constant, so a file that spells the blank some other way has no
// blanks at all as far as this package is concerned -- which is what the old "[]" spelling
// in en-creative.txt amounted to.
func TestALineWithNoPlaceholderIsRejected(t *testing.T) {
	if _, err := parseCreativeLine("nothing to fill in here"); err == nil {
		t.Error("a creative line with no placeholder was accepted")
	}
	if _, err := parseAnswerLine("nothing to fill in here --- something"); err == nil {
		t.Error("an answer line with no placeholder was accepted")
	}
}

func TestAnAnswerLineWhoseAnswersDoNotMatchItsBlanksIsRejected(t *testing.T) {
	line := "In " + Placeholder + " the winner was " + Placeholder + " --- 2011"

	if _, err := parseAnswerLine(line); err == nil {
		t.Error("an answer line with two blanks and one answer was accepted")
	}
}

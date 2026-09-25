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
		for _, mode := range allModes {
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
// count rises with the table and a short file is a game that cannot be dealt at all.
func TestEveryFileHoldsEnoughPromptsForAFullTable(t *testing.T) {
	for _, locale := range i18n.Locales {
		for _, mode := range allModes {
			lines, err := GetContentLines(locale, mode, RoundsFor(mode, MaxLobbyPlayers, DefaultAnswersPerPlayer))
			if err != nil {
				t.Errorf("GetContentLines(%s, %s) for a full table: %v", locale, mode, err)
				continue
			}
			if len(lines) != RoundsFor(mode, MaxLobbyPlayers, DefaultAnswersPerPlayer) {
				t.Errorf("GetContentLines(%s, %s) returned %d lines, want %d",
					locale, mode, len(lines), RoundsFor(mode, MaxLobbyPlayers, DefaultAnswersPerPlayer))
			}
		}
	}
}

func TestFactsPromptsCarryOneAnswerPerBlank(t *testing.T) {
	for _, locale := range i18n.Locales {
		lines, err := GetContentLines(locale, GameModeFacts, RoundsFor(GameModeFacts, MaxLobbyPlayers, DefaultAnswersPerPlayer))
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

// A definition is dealt as the word and one blank, with the real meaning as the only answer.
func TestDefinitionPromptsAreAWordAndOneMeaning(t *testing.T) {
	for _, locale := range i18n.Locales {
		lines, err := GetContentLines(locale, GameModeDefinitions, RoundsFor(GameModeDefinitions, MaxLobbyPlayers, DefaultAnswersPerPlayer))
		if err != nil {
			t.Fatalf("GetContentLines(%s, definitions): %v", locale, err)
		}

		for _, line := range lines {
			if line.Blanks != 1 || strings.Count(line.Line, Placeholder) != 1 {
				t.Errorf("%s: %q should have exactly one blank", locale, line.Line)
			}
			if !strings.HasSuffix(line.Line, ": "+Placeholder) {
				t.Errorf("%s: %q does not end on its blank", locale, line.Line)
			}
			if len(line.Answers) != 1 || line.Answers[0] == "" {
				t.Errorf("%s: %q carries answers %v, want one meaning", locale, line.Line, line.Answers)
			}
		}
	}
}

func TestAMalformedDefinitionLineIsRejected(t *testing.T) {
	for _, line := range []string{
		"no divider at all",
		"word ---",
		"--- a meaning with no word",
		"word --- one meaning --- and another",
		"word --- a meaning with a " + Placeholder,
	} {
		if _, err := parseDefinitionLine(line); err == nil {
			t.Errorf("parseDefinitionLine(%q) was accepted", line)
		}
	}
}

func TestADefinitionLineBecomesTheWordAndABlank(t *testing.T) {
	got, err := parseDefinitionLine("  snollygoster  ---  a clever person with no morals ")
	if err != nil {
		t.Fatalf("parseDefinitionLine: %v", err)
	}
	if got.Line != "snollygoster: "+Placeholder {
		t.Errorf("Line = %q", got.Line)
	}
	if len(got.Answers) != 1 || got.Answers[0] != "a clever person with no morals" {
		t.Errorf("Answers = %v", got.Answers)
	}
}

// Asking for more than the file holds is loud rather than short. Quietly returning four
// prompts for a six-player table would not deal a smaller game -- it would deal a broken
// one, with two players holding prompts that do not exist.
func TestAskingForMorePromptsThanTheFileHoldsIsAnError(t *testing.T) {
	_, err := GetContentLines(i18n.EN, GameModeFacts, 1_000_000)
	if !errors.Is(err, ErrNotEnoughContent) {
		t.Fatalf("GetContentLines for a million prompts: err = %v, want ErrNotEnoughContent", err)
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
// blanks at all as far as this package is concerned.
func TestALineWithNoPlaceholderIsRejected(t *testing.T) {
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

// Distinctness is positional, so a prompt written twice is simply twice as likely to be
// dealt -- nothing downstream notices, which is how the placeholder files got away with
// holding one line ten times.
func TestNoPromptAppearsTwice(t *testing.T) {
	for _, locale := range i18n.Locales {
		for _, mode := range allModes {
			data, err := contentFiles.ReadFile(buildDataFilePath(locale, mode))
			if err != nil {
				t.Fatalf("read %s %s: %v", locale, mode, err)
			}

			seen := make(map[string]bool)

			for line := range strings.SplitSeq(string(data), "\n") {
				line = strings.TrimSpace(line)
				if line == "" {
					continue
				}

				parsed, err := parseLine(line, mode)
				if err != nil {
					t.Fatalf("%s %s: %v", locale, mode, err)
				}

				key := strings.ToLower(parsed.Line)
				if seen[key] {
					t.Errorf("%s %s: prompt appears more than once: %q", locale, mode, parsed.Line)
				}
				seen[key] = true
			}
		}
	}
}

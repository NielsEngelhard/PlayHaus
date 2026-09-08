package fakefiller

import (
	"embed"
	"fmt"
	"math/rand/v2"
	"strings"

	"playhaus-api/internal/i18n"
)

// ContentDivider separates a prompt from its answers, and the answers from each other.
const ContentDivider = "---"

// Placeholder is the blank, and it is the single source of truth for the spelling.
const Placeholder = "[FILL]"

// GameInputLine is one prompt as it comes off disk.
type GameInputLine struct {
	Line    string
	Answers []string
	Blanks  int
}

//go:embed data
var contentFiles embed.FS

// GetContentLines draws `amount` distinct prompts for a locale and mode.
func GetContentLines(locale i18n.Locale, mode FFGameMode, amount int) ([]GameInputLine, error) {
	filePath := buildDataFilePath(locale, mode)

	data, err := contentFiles.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("read fake filler content %s: %w", filePath, err)
	}

	var lines []GameInputLine

	for line := range strings.SplitSeq(string(data), "\n") {
		line = strings.TrimSpace(line)

		if line == "" {
			continue
		}

		parsedLine, err := parseLine(line, mode)
		if err != nil {
			return nil, err
		}

		lines = append(lines, parsedLine)
	}

	if amount <= 0 {
		return []GameInputLine{}, nil
	}

	if amount > len(lines) {
		return nil, fmt.Errorf(
			"%w: %s holds %d prompts, need %d",
			ErrNotEnoughContent, filePath, len(lines), amount,
		)
	}

	rand.Shuffle(len(lines), func(i, j int) {
		lines[i], lines[j] = lines[j], lines[i]
	})

	return lines[:amount], nil
}

func parseLine(line string, mode FFGameMode) (GameInputLine, error) {
	if mode == GameModeCreative {
		return parseCreativeLine(line)
	}

	return parseAnswerLine(line)
}

// parseCreativeLine reads a prompt that has no truth: blanks, and nothing after them.
func parseCreativeLine(line string) (GameInputLine, error) {
	blanks := strings.Count(line, Placeholder)

	if blanks == 0 {
		return GameInputLine{}, fmt.Errorf(
			"creative line must contain at least one %q placeholder: %s",
			Placeholder,
			line,
		)
	}

	return GameInputLine{
		Line:    line,
		Answers: []string{},
		Blanks:  blanks,
	}, nil
}

// parseAnswerLine reads a prompt that carries its real answer, one value per blank.
func parseAnswerLine(line string) (GameInputLine, error) {
	parts := strings.SplitN(line, ContentDivider, 2)

	if len(parts) != 2 {
		return GameInputLine{}, fmt.Errorf(
			"answer line must contain %q: %s",
			ContentDivider,
			line,
		)
	}

	text := strings.TrimSpace(parts[0])
	answerText := strings.TrimSpace(parts[1])

	if text == "" {
		return GameInputLine{}, fmt.Errorf(
			"answer line has empty text: %s",
			line,
		)
	}

	if answerText == "" {
		return GameInputLine{}, fmt.Errorf(
			"answer line has no answers: %s",
			line,
		)
	}

	answers := splitAnswers(answerText)

	blanks := strings.Count(text, Placeholder)

	if blanks == 0 {
		return GameInputLine{}, fmt.Errorf(
			"answer line must contain at least one %q placeholder: %s",
			Placeholder,
			line,
		)
	}

	// The answers are positional -- the nth answer fills the nth blank -- so a count that does not line up is a data file that would silently render the wrong sentence.
	if blanks != len(answers) {
		return GameInputLine{}, fmt.Errorf(
			"answer line has %d placeholders but %d answers: %s",
			blanks,
			len(answers),
			line,
		)
	}

	return GameInputLine{
		Line:    text,
		Answers: answers,
		Blanks:  blanks,
	}, nil
}

func splitAnswers(answerText string) []string {
	parts := strings.Split(answerText, ContentDivider)

	answers := make([]string, 0, len(parts))

	for _, answer := range parts {
		answer = strings.TrimSpace(answer)

		if answer != "" {
			answers = append(answers, answer)
		}
	}

	return answers
}

// buildDataFilePath names the file a locale and mode are read out of.
func buildDataFilePath(lang i18n.Locale, mode FFGameMode) string {
	const base = "data/[LANGUAGE]/[LANGUAGE]-[LIST_TYPE].txt"

	path := strings.ReplaceAll(base, "[LANGUAGE]", string(lang))
	path = strings.ReplaceAll(path, "[LIST_TYPE]", string(mode))

	return path
}

package fakefiller

import (
	"embed"
	"fmt"
	"math/rand/v2"
	"playhaus-api/internal/i18n"
	"strings"
)

const ContentDivider = "---"
const Placeholder = "[]"

type GameInputLine struct {
	Line    string
	Answers []string
}

//go:embed data
var contentFiles embed.FS

func GetContentLines(locale i18n.Locale, mode FFGameMode, amount int) ([]GameInputLine, error) {
	filePath := buildDataFilePath(locale, mode)

	data, err := contentFiles.ReadFile(filePath)
	if err != nil {
		return nil, err
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

	if amount <= 0 || len(lines) == 0 {
		return []GameInputLine{}, nil
	}

	if amount > len(lines) {
		amount = len(lines)
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

func parseCreativeLine(line string) (GameInputLine, error) {
	if !strings.Contains(line, Placeholder) {
		return GameInputLine{}, fmt.Errorf(
			"creative line must contain at least one %q placeholder: %s",
			Placeholder,
			line,
		)
	}

	return GameInputLine{
		Line:    line,
		Answers: []string{},
	}, nil
}

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

	placeholderCount := strings.Count(text, Placeholder)

	if placeholderCount == 0 {
		return GameInputLine{}, fmt.Errorf(
			"answer line must contain at least one %q placeholder: %s",
			Placeholder,
			line,
		)
	}

	if placeholderCount != len(answers) {
		return GameInputLine{}, fmt.Errorf(
			"answer line has %d placeholders but %d answers: %s",
			placeholderCount,
			len(answers),
			line,
		)
	}

	return GameInputLine{
		Line:    text,
		Answers: answers,
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

func buildDataFilePath(lang i18n.Locale, mode FFGameMode) string {
	const base = "data/[LANGUAGE]/[LANGUAGE]-[LIST_TYPE]s.txt"

	path := strings.ReplaceAll(base, "[LANGUAGE]", string(lang))
	path = strings.ReplaceAll(path, "[LIST_TYPE]", string(mode))

	return path
}

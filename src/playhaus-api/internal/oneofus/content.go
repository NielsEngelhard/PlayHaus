package oneofus

import (
	"embed"
	"fmt"
	"math/rand"
	"playhaus-api/internal/i18n"
	"strings"
)

//go:embed data
var contentFiles embed.FS

func GetContentLines(locale i18n.Locale, mode GameMode, amount int) ([]GameInputLine, error) {
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

		parts := strings.SplitN(line, "---", 2)
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid line does not consist of 2 parts to split on: %s", line)
		}

		lines = append(lines, GameInputLine{
			RealLine:     strings.TrimSpace(parts[0]),
			ImposterLine: strings.TrimSpace(parts[1]),
		})
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

func buildDataFilePath(lang i18n.Locale, mode GameMode) string {
	const base = "data/[LANGUAGE]/[LANGUAGE]-[SIZE]-[LIST_TYPE].txt"

	path := strings.ReplaceAll(base, "[LANGUAGE]", string(lang))
	path = strings.ReplaceAll(path, "[LIST_TYPE]", string(mode))

	return path
}

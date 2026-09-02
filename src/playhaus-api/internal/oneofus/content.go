package oneofus

import (
	"embed"
	"fmt"
	"math/rand"
	"playhaus-api/internal/i18n"
	"strings"
)

const ContentDivider = "---"

type GameInputLine struct {
	RealLine     string
	ImposterLine string
}

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

		parts := strings.SplitN(line, ContentDivider, 2)
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

// buildDataFilePath names the embedded list for a locale and mode, e.g.
// "data/en/en-sentences.txt".
//
// The mode is singular ("word", "sentence") and the files are plural, so the "s" is
// part of the template rather than the value. The template also used to carry a [SIZE]
// placeholder that nothing ever substituted, which meant every lookup asked for a file
// called "en-[SIZE]-sentence.txt" and every game failed to start.
func buildDataFilePath(lang i18n.Locale, mode GameMode) string {
	const base = "data/[LANGUAGE]/[LANGUAGE]-[LIST_TYPE]s.txt"

	path := strings.ReplaceAll(base, "[LANGUAGE]", string(lang))
	path = strings.ReplaceAll(path, "[LIST_TYPE]", string(mode))

	return path
}

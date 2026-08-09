package wordlists

import (
	"embed"
	"math/rand"
	"strconv"
	"strings"
	"time"
)

// The word lists are embedded so callers can live in any directory --
// otherwise the file paths would only resolve when run from the repo root.
//
//go:embed data
var wordFiles embed.FS

func GetRandomWord(lang WordLanguage, size WordLength) (string, error) {
	lines, err := readFileAndGetLines(lang, size)
	if err != nil {
		return "", err
	}

	randomLine := getRandomLine(lines)
	return randomLine, nil
}

func readFileAndGetLines(lang WordLanguage, size WordLength) ([]string, error) {
	filePath := buildWordFilePath(lang, size)

	data, err := wordFiles.ReadFile(filePath)
	if err != nil {
		return []string{}, err
	}

	var lines []string
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			lines = append(lines, line)
		}
	}

	return lines, nil
}

func buildWordFilePath(lang WordLanguage, size WordLength) string {
	const base = "data/[LANGUAGE]/[LANGUAGE]-[SIZE].txt"

	path := strings.ReplaceAll(base, "[LANGUAGE]", string(lang))
	path = strings.ReplaceAll(path, "[SIZE]", strconv.Itoa(int(size)))

	return path
}

func getRandomLine(lines []string) string {
	nLines := len(lines)
	if nLines == 0 {
		return ""
	}

	var rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	rngIndex := rng.Intn(nLines)

	return lines[rngIndex]
}

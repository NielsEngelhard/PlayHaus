package wittywars

import (
	"embed"
	"fmt"
	"math/rand/v2"
	"strings"

	"playhaus-api/internal/i18n"
)

//go:embed data
var contentFiles embed.FS

// GetContentLines draws `amount` distinct prompts for a locale and mode, one prompt to a line of the file.
func GetContentLines(locale i18n.Locale, mode WWGameMode, amount int) ([]string, error) {
	lines, err := contentLines(locale, mode)
	if err != nil {
		return nil, err
	}

	if amount <= 0 {
		return []string{}, nil
	}
	if amount > len(lines) {
		return nil, fmt.Errorf("%w: %s holds %d prompts, need %d", ErrNotEnoughContent, dataFilePath(locale, mode), len(lines), amount)
	}

	rand.Shuffle(len(lines), func(i, j int) { lines[i], lines[j] = lines[j], lines[i] })

	return lines[:amount], nil
}

// contentLines is every prompt in a file, in file order.
func contentLines(locale i18n.Locale, mode WWGameMode) ([]string, error) {
	path := dataFilePath(locale, mode)

	data, err := contentFiles.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read witty wars content %s: %w", path, err)
	}

	var lines []string
	for line := range strings.SplitSeq(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			lines = append(lines, line)
		}
	}
	return lines, nil
}

// dataFilePath names the file a locale and mode are read out of.
func dataFilePath(locale i18n.Locale, mode WWGameMode) string {
	return fmt.Sprintf("data/%s/%s-%s.txt", locale, locale, mode)
}

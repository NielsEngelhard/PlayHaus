package league_of_letters

import (
	"embed"
	"fmt"
	"math/rand"
	"playhaus-api/internal/i18n"
	"strconv"
	"strings"
)

var wordFiles embed.FS

func GetRandomWord(lang i18n.Locale, size int) (string, error) {
	words, err := GetRandomWords(lang, size, 1)
	if err != nil {
		return "", err
	}
	return words[0], nil
}

func GetRandomWords(lang i18n.Locale, size int, amount int) ([]string, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("wordlists: amount must be positive, got %d", amount)
	}

	lines, err := readFileAndGetLines(lang, size)
	if err != nil {
		return nil, err
	}

	if amount > len(lines) {
		return nil, fmt.Errorf("wordlists: requested %d words but %s-%d holds only %d",
			amount, lang, int(size), len(lines))
	}

	indices := pickDistinctIndices(len(lines), amount)

	words := make([]string, amount)
	for i, idx := range indices {
		words[i] = lines[idx]
	}

	return words, nil
}

func readFileAndGetLines(lang i18n.Locale, size int) ([]string, error) {
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

func buildWordFilePath(lang i18n.Locale, size int) string {
	const base = "data/[LANGUAGE]/[LANGUAGE]-[SIZE].txt"

	path := strings.ReplaceAll(base, "[LANGUAGE]", string(lang))
	path = strings.ReplaceAll(path, "[SIZE]", strconv.Itoa(int(size)))

	return path
}

// pickDistinctIndices returns count distinct indices in [0, n) using Floyd's
// algorithm: O(count) time and memory regardless of how large n is, and it
// never rejects/retries, so it stays fast even when count is close to n.
func pickDistinctIndices(n, count int) []int {
	chosen := make(map[int]struct{}, count)
	indices := make([]int, 0, count)

	for j := n - count; j < n; j++ {
		t := rand.Intn(j + 1)
		if _, taken := chosen[t]; taken {
			t = j // j is guaranteed unused at this point
		}
		chosen[t] = struct{}{}
		indices = append(indices, t)
	}

	// Floyd's yields a uniformly random *set*, but the order it emits them in
	// is not uniform -- shuffle so round 1 isn't biased toward the file's tail.
	rand.Shuffle(len(indices), func(a, b int) {
		indices[a], indices[b] = indices[b], indices[a]
	})

	return indices
}

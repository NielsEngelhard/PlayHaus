package lol

import (
	"embed"
	"fmt"
	"math/rand"
	"playhaus-api/internal/i18n"
	"strconv"
	"strings"
	"sync"
)

type WordListType string

const (
	All    WordListType = "all"
	Common WordListType = "common"
)

//go:embed data
var wordFiles embed.FS

// allowedLists caches each parsed guessable list. Splitting a full dictionary
// on every guess would be waste, and the files never change under a running
// process -- they are compiled in.
var allowedLists sync.Map // string -> map[string]struct{}

// IsAllowedWord reports whether a word appears in the word list for that language
func IsAllowedWord(lang i18n.Locale, size int, word string) bool {
	allowed := allowedWords(lang, size)
	if len(allowed) == 0 {
		return true
	}

	_, ok := allowed[strings.ToLower(word)]
	return ok
}

func allowedWords(lang i18n.Locale, size int) map[string]struct{} {
	key := buildWordFilePath(lang, size, All)

	if cached, ok := allowedLists.Load(key); ok {
		return cached.(map[string]struct{})
	}

	// A missing file is not an error -- it is the "no list yet" case, and it
	// caches as an empty set so the read is not retried on every guess.
	words := map[string]struct{}{}
	if data, err := wordFiles.ReadFile(key); err == nil {
		for line := range strings.SplitSeq(string(data), "\n") {
			if line = strings.ToLower(strings.TrimSpace(line)); line != "" {
				words[line] = struct{}{}
			}
		}
	}

	allowedLists.Store(key, words)
	return words
}

func GetRandomWord(lang i18n.Locale, size int, onlyPickCommonWords bool) (string, error) {
	words, err := GetRandomWords(lang, size, 1, onlyPickCommonWords)
	if err != nil {
		return "", err
	}
	return words[0], nil
}

func GetRandomWords(lang i18n.Locale, size int, amount int, onlyPickCommonWords bool) ([]string, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("wordlists: amount must be positive, got %d", amount)
	}

	wordListType := Common
	if !onlyPickCommonWords {
		wordListType = All
	}

	lines, err := readFileAndGetLines(lang, size, wordListType)
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

func readFileAndGetLines(lang i18n.Locale, size int, wlt WordListType) ([]string, error) {
	filePath := buildWordFilePath(lang, size, wlt)

	data, err := wordFiles.ReadFile(filePath)
	if err != nil {
		return []string{}, err
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

func buildWordFilePath(lang i18n.Locale, size int, wlt WordListType) string {
	const base = "data/[LANGUAGE]/[LANGUAGE]-[SIZE]-[LIST_TYPE].txt"

	path := strings.ReplaceAll(base, "[LANGUAGE]", string(lang))
	path = strings.ReplaceAll(path, "[LIST_TYPE]", string(wlt))
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

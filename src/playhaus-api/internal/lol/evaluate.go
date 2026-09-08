package lol

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

// Evaluate scores a guess against the round's word.
func Evaluate(guess, target string) []LetterStatus {
	g := []rune(strings.ToLower(guess))
	t := []rune(strings.ToLower(target))

	marks := make([]LetterStatus, len(g))

	remaining := make(map[rune]int, len(t))
	for _, r := range t {
		remaining[r]++
	}

	for i := range g {
		if i < len(t) && g[i] == t[i] {
			marks[i] = LetterCorrect
			remaining[g[i]]--
		}
	}

	for i := range g {
		if marks[i] == LetterCorrect {
			continue
		}
		if remaining[g[i]] > 0 {
			marks[i] = LetterPresent
			remaining[g[i]]--
			continue
		}
		marks[i] = LetterAbsent
	}

	return marks
}

// NormalizeGuess puts a submitted word in the shape everything else here works in: trimmed and lower case.
func NormalizeGuess(word string) string {
	return strings.ToLower(strings.TrimSpace(word))
}

// ValidGuess reports whether a normalized guess is the right shape for a round.
func ValidGuess(word string, length int, firstLetter string) bool {
	if utf8.RuneCountInString(word) != length {
		return false
	}

	for _, r := range word {
		if !unicode.IsLetter(r) {
			return false
		}
	}

	return firstLetter == "" || strings.HasPrefix(word, strings.ToLower(firstLetter))
}

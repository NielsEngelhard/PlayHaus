package league_of_letters

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

// Evaluate scores a guess against the round's word.
//
// Two passes, because a letter can only be spent once. Guessing "geel" against
// "regel" has to mark exactly one of the two e's -- the pass that finds exact
// hits claims its letters first, so the near-miss pass can only use what is
// genuinely left over. A single pass would light up both.
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

// NormalizeGuess puts a submitted word in the shape everything else here works
// in: trimmed and lower case. The words in the lists are stored that way and
// Evaluate lowers its arguments anyway, so normalizing once on the way in means
// nothing downstream has to think about it.
func NormalizeGuess(word string) string {
	return strings.ToLower(strings.TrimSpace(word))
}

// ValidGuess reports whether a normalized guess is the right shape for a round.
//
// Shape only -- whether the word actually exists is IsAllowedWord's question,
// asked separately so that "wrong length" can be told from "not a word" while
// the word lists are still placeholders.
//
// The opening letter is part of the shape: the round gives it away, the board
// will not let the player delete it, and a word starting with anything else
// cannot be the answer.
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

// Package wordlists serves the words a round is played with.
package wordlists

import (
	crypto_rand "crypto/rand"
	"embed"
	"fmt"
	"math/big"
	"strconv"
	"strings"
	"sync"
)

// The word lists are embedded so callers can live in any directory --
// otherwise the file paths would only resolve when run from the repo root.
//
//go:embed data
var wordFiles embed.FS

// lists holds every parsed word list, keyed by file path.
//
// Parsed once rather than per round: the files never change after the binary is
// built, so re-reading and re-splitting them on every draw was work whose answer
// was always the same. sync.OnceValues does it on first use and hands every
// later caller the same slices — including the error, so a corrupt embed fails
// the same way every time instead of only for the request that hit it first.
var lists = sync.OnceValues(loadLists)

func loadLists() (map[string][]string, error) {
	out := make(map[string][]string)

	for _, lang := range []WordLanguage{Dutch, English} {
		for _, length := range Lengths {
			path := wordFilePath(lang, length)

			data, err := wordFiles.ReadFile(path)
			if err != nil {
				return nil, fmt.Errorf("read word list %s: %w", path, err)
			}

			var words []string
			for line := range strings.SplitSeq(string(data), "\n") {
				// Trimming absorbs the \r that a list edited on Windows carries,
				// which would otherwise make every word one rune too long.
				if line = strings.TrimSpace(line); line != "" {
					words = append(words, strings.ToLower(line))
				}
			}
			if len(words) == 0 {
				return nil, fmt.Errorf("word list %s is empty", path)
			}

			out[path] = words
		}
	}

	return out, nil
}

// GetRandomWord draws a word for a round.
//
// The draw uses crypto/rand rather than math/rand. The word is the one thing in
// the game the player is not allowed to know, and a math/rand stream is
// reconstructible from enough observed output — which, in a game that hands out
// a fresh word every round, a determined client has no trouble collecting.
func GetRandomWord(lang WordLanguage, size WordLength) (string, error) {
	all, err := lists()
	if err != nil {
		return "", err
	}

	path := wordFilePath(lang, size)
	words, ok := all[path]
	if !ok {
		return "", fmt.Errorf("no word list for %s/%d", lang, size)
	}

	n, err := crypto_rand.Int(crypto_rand.Reader, big.NewInt(int64(len(words))))
	if err != nil {
		return "", fmt.Errorf("draw word: %w", err)
	}

	return words[n.Int64()], nil
}

func wordFilePath(lang WordLanguage, size WordLength) string {
	return "data/" + string(lang) + "/" + string(lang) + "-" + strconv.Itoa(int(size)) + ".txt"
}

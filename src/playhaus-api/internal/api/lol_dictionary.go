package api

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/lol"
)

type dictionaryResponse struct {
	Locale     i18n.Locale `json:"locale"`
	WordLength int         `json:"wordLength"`
	Words      []string    `json:"words"`
}

// The guessable list, which is not the answer list: handing it over gives nothing away and saves the client a round trip on every non-word.
func (s *Server) handleGetDictionary(w http.ResponseWriter, r *http.Request) {
	locale := i18n.Parse(r.PathValue("locale"))
	if r.PathValue("locale") != locale.String() {
		writeError(w, http.StatusNotFound, "no word list for that language")
		return
	}

	length, err := strconv.Atoi(r.PathValue("length"))
	if err != nil || length < lol.MinWordLength || length > lol.MaxWordLength {
		writeError(w, http.StatusNotFound, fmt.Sprintf("word length must be between %d and %d", lol.MinWordLength, lol.MaxWordLength))
		return
	}

	words := lol.AllowedWordList(locale, length)
	if len(words) == 0 {
		writeError(w, http.StatusNotFound, "no word list for that language and length")
		return
	}

	etag := dictionaryETag(locale, length, words)
	// Private because the route is behind a bearer token, so a shared cache must not keep it.
	w.Header().Set("Cache-Control", "private, max-age=86400")
	w.Header().Set("ETag", etag)

	if match := r.Header.Get("If-None-Match"); match == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	writeJSON(w, http.StatusOK, dictionaryResponse{Locale: locale, WordLength: length, Words: words})
}

func dictionaryETag(locale i18n.Locale, length int, words []string) string {
	sum := sha256.New()
	fmt.Fprintf(sum, "%s-%d\n", locale, length)
	for _, word := range words {
		fmt.Fprintln(sum, word)
	}
	return `"` + hex.EncodeToString(sum.Sum(nil)[:16]) + `"`
}

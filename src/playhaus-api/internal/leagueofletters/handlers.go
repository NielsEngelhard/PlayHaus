package leagueofletters

import (
	"encoding/json"
	"net/http"
	"strconv"

	"playhaus-api/internal/leagueofletters/words"
)

func (h *Handlers) randomWord(w http.ResponseWriter, r *http.Request) {
	lang, err := words.ParseLanguage(r.URL.Query().Get("lang"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	n, err := strconv.Atoi(r.URL.Query().Get("length"))
	if err != nil {
		http.Error(w, "length must be a number", http.StatusBadRequest)
		return
	}

	size, err := words.ParseLength(n)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	word, err := words.GetRandomWord(lang, size)
	if err != nil {
		http.Error(w, "no word list for that language and length", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"word": word})
}

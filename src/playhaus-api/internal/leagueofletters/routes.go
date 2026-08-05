package leagueofletters

import "net/http"

type Handlers struct{}

func (h *Handlers) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /words/random", h.randomWord)

	return mux
}

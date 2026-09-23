package api

import (
	"net/http"
	"strconv"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/oneofus"
)

// MaxPromptPack is as many pairs as one request hands over, which is a long evening away from the network rather than a copy of the list.
const MaxPromptPack = 50

type promptPairResponse struct {
	Actual   string `json:"actual"`
	Imposter string `json:"imposter"`
}

type promptPackResponse struct {
	Locale i18n.Locale          `json:"locale"`
	Mode   oneofus.GameMode     `json:"mode"`
	Pairs  []promptPairResponse `json:"pairs"`
}

// A pack of prompt pairs to keep, so a table can be dealt without the network. Nothing is given away: the single-device game hands the client both lines of the pair it plays anyway.
func (s *Server) handleGetOneOfUsPrompts(w http.ResponseWriter, r *http.Request) {
	locale := i18n.Parse(r.PathValue("locale"))
	if r.PathValue("locale") != locale.String() {
		writeError(w, http.StatusNotFound, "no prompts for that language")
		return
	}

	mode := oneofus.GameMode(r.PathValue("mode"))
	if !mode.Valid() {
		writeError(w, http.StatusNotFound, "mode must be word or sentence")
		return
	}

	count := MaxPromptPack
	if raw := r.URL.Query().Get("count"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 {
			writeError(w, http.StatusUnprocessableEntity, "count must be a positive whole number")
			return
		}
		count = min(parsed, MaxPromptPack)
	}

	lines, err := oneofus.GetContentLines(locale, mode, count)
	if err != nil {
		s.log.Error("get one of us prompts", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	pairs := make([]promptPairResponse, len(lines))
	for index, line := range lines {
		pairs[index] = promptPairResponse{Actual: line.RealLine, Imposter: line.ImposterLine}
	}

	writeJSON(w, http.StatusOK, promptPackResponse{Locale: locale, Mode: mode, Pairs: pairs})
}

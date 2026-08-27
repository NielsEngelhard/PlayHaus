package api

import (
	"net/http"
	"playhaus-api/internal/oneofus"
	"strconv"
	"strings"
)

type createOneOfUsOneDeviceGameRequest struct {
	Locale      *string  `json:"locale"`
	PlayerNames []string `json:"playerNames"`
	WordOnly    bool     `json:"wordOnly"`
}

func (req createOneOfUsOneDeviceGameRequest) Validate() map[string]string {
	problems := map[string]string{}

	switch {
	case !oneofus.PlayerCountOK(len(req.PlayerNames)):
		if len(req.PlayerNames) < oneofus.MinPlayers {
			problems["playerNames"] = "needs at least " + strconv.Itoa(oneofus.MinPlayers) + " players"
		} else {
			problems["playerNames"] = "takes at most " + strconv.Itoa(oneofus.MaxPlayers) + " players"
		}
	default:
		for _, name := range req.PlayerNames {
			if strings.TrimSpace(name) == "" {
				problems["playerNames"] = "every player needs a name"
				break
			}
		}
	}

	return problems
}

func (s *Server) handleCreateOneOfUsOneDeviceGame(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleSubmitGuess reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, problems, err := decode[createOneOfUsOneDeviceGameRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	game, err := s.oneOfUs.StartSingleDeviceGame(r.Context(), oneofus.StartOneOfUsSingleDeviceGameInput{
		OwnerID:     ownerID,
		Locale:      localeFrom(Deref(req.Locale, ""), r),
		PlayerNames: req.PlayerNames,
		GameMode:    oneofus.ModeFor(req.WordOnly),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Error creating the single device OOU game")
		return
	}

	writeJSON(w, http.StatusOK, game)
}

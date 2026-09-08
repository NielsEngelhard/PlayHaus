package api

import (
	"net/http"
	"playhaus-api/internal/oneofus"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

type createOneOfUsOneDeviceGameRequest struct {
	Locale      *string  `json:"locale"`
	PlayerNames []string `json:"playerNames"`
	WordOnly    bool     `json:"wordOnly"`
	// EnabledRoles is which imposter roles this table left switched on, as the same role numbers the game deals out.
	EnabledRoles []int `json:"enabledRoles"`
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

	// Its own check rather than another arm of the switch above.
	if !oneofus.ImposterRoleSetOK(imposterRolesFrom(req.EnabledRoles)) {
		problems["enabledRoles"] = "needs at least one imposter role, and only imposter roles"
	}

	return problems
}

// imposterRolesFrom reads the wire's role numbers as roles, and reads a field that was never sent as the whole set.
func imposterRolesFrom(values []int) []oneofus.Role {
	if values == nil {
		return oneofus.ImposterRoles()
	}

	roles := make([]oneofus.Role, len(values))
	for index, value := range values {
		roles[index] = oneofus.Role(value)
	}

	return roles
}

func (s *Server) handleCreateOneOfUsOneDeviceGame(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreateOneOfUsOneDeviceGame reached without an authenticated user")
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
		OwnerID:      ownerID,
		Locale:       localeFrom(Deref(req.Locale, ""), r),
		PlayerNames:  req.PlayerNames,
		GameMode:     oneofus.ModeFor(req.WordOnly),
		EnabledRoles: imposterRolesFrom(req.EnabledRoles),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Error creating the single device OOU game")
		return
	}

	// An object rather than the bare id string this used to answer with.
	writeJSON(w, http.StatusOK, map[string]any{"gameId": game.ID})
}

func (s *Server) handleVotePlayerOutOfSingleDeviceOneOfUsGame(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleVotePlayerOutOfSingleDeviceOneOfUsGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "Missing gameID")
		return
	}

	playerID, err := uuid.Parse(r.PathValue("playerID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "Missing playerID")
		return
	}

	res, err := s.oneOfUs.VotePlayerOutSingleDeviceGame(r.Context(), oneofus.VotePlayerOutSingleDeviceGameInput{
		OwnerID:  ownerID,
		GameID:   gameID,
		PlayerID: playerID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Error voting out player")
		return
	}

	writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleGetSingleDeviceOneOfUsGame(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetSingleDeviceOneOfUsGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "Missing gameID")
		return
	}

	res, err := s.oneOfUs.GetSingleDeviceOneOfUsGame(r.Context(), ownerID, gameID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Error getting game")
		return
	}

	writeJSON(w, http.StatusOK, res)
}

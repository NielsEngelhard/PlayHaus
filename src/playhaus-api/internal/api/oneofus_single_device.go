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
	// EnabledRoles is which imposter roles this table left switched on, as the same role
	// numbers the game deals out -- see oneofus.Role, whose ints are the wire format.
	//
	// Absent means the whole set, which is what keeps every client that predates the
	// setting working. An explicit empty array does not: a caller that sent the field
	// and put nothing in it is asking for a game with no liars in it, which is a game
	// nobody can win, and the difference between "did not ask" and "asked for none" is
	// exactly what the nil check in imposterRolesFrom is for.
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

	// Its own check rather than another arm of the switch above: the two fields describe
	// different things about the table, and a body that got both wrong should hear about
	// both rather than about whichever the switch reached first.
	if !oneofus.ImposterRoleSetOK(imposterRolesFrom(req.EnabledRoles)) {
		problems["enabledRoles"] = "needs at least one imposter role, and only imposter roles"
	}

	return problems
}

// imposterRolesFrom reads the wire's role numbers as roles, and reads a field that was
// never sent as the whole set.
//
// No filtering and no clamping on the way through -- an unknown number stays an unknown
// number so that ImposterRoleSetOK can refuse the body. Quietly dropping what it did not
// recognise would turn a typo in a client into a table dealt from whatever was left,
// which is the kind of thing that only shows up as somebody's game being strange.
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

	// An object rather than the bare id string this used to answer with: every other
	// endpoint in the API answers with one, and a top-level JSON string is the shape
	// that cannot grow a second field later without breaking every client.
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

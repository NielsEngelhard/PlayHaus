package api

import (
	"net/http"
	league_of_letters "playhaus-api/internal/league-of-letters"
)

type ReconnectableGame struct {
	ID        string   `json:"id"`
	Type      GameType `json:"type"`
	CreatedAt string   `json:"createdAt"`
}

func (s *Server) handleGetReconnectableGames(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("getReconnectableGames could not return games to reconnect to")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	var allGames []ReconnectableGame

	// GET solo games
	soloGames, err := s.leagueOfLetters.GetSoloGamesByUserId(r.Context(), userID)
	if err != nil {
		s.log.Error("get solo games to reconnect to", "err", err)
	} else {
		allGames = append(allGames, mapSoloGamesToReconnectableGame(soloGames)...)
	}

	// GET multiplayer GAMES

	writeJSON(w, http.StatusOK, allGames)
}

func mapSoloGamesToReconnectableGame(soloGames []*league_of_letters.SoloLeagueOfLettersGame) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, len(soloGames))

	for i := range soloGames {
		soloGame := soloGames[i]

		mappedGames[i] = ReconnectableGame{
			ID:        soloGame.ID.String(),
			Type:      LeagueOfLettersSolo,
			CreatedAt: soloGame.CreatedAt.Format(timeFormat),
		}
	}

	return mappedGames
}

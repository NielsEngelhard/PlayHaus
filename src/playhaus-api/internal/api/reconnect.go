package api

import (
	"net/http"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/pubquizr"
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

	// GET multiplayer games
	multiplayerGames, err := s.leagueOfLetters.MultiplayerGamesByUserID(r.Context(), userID)
	if err != nil {
		s.log.Error("get multiplayer games to reconnect to", "err", err)
	} else {
		allGames = append(allGames, mapMultiplayerGamesToReconnectableGame(multiplayerGames)...)
	}

	// GET pub quizzes
	quizzes, err := s.pubquizr.SessionsInProgress(r.Context(), userID)
	if err != nil {
		s.log.Error("get pub quiz sessions to reconnect to", "err", err)
	} else {
		allGames = append(allGames, mapQuizSessionsToReconnectableGame(quizzes)...)
	}

	writeJSON(w, http.StatusOK, allGames)
}

func mapQuizSessionsToReconnectableGame(sessions []*pubquizr.Session) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, len(sessions))

	for i := range sessions {
		session := sessions[i]

		mappedGames[i] = ReconnectableGame{
			ID:        session.ID.String(),
			Type:      PubquizRSingleDevice,
			CreatedAt: session.CreatedAt.Format(timeFormat),
		}
	}

	return mappedGames
}

func mapMultiplayerGamesToReconnectableGame(games []*lol.MultiplayerLeagueOfLettersGame) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, len(games))

	for i := range games {
		game := games[i]

		mappedGames[i] = ReconnectableGame{
			// The join code, not the game id: a room is reached by its code, and
			// that is the one screen that knows how to draw a game like this.
			ID:        game.LobbyID,
			Type:      LeagueOfLettersMultiplayer,
			CreatedAt: game.CreatedAt.Format(timeFormat),
		}
	}

	return mappedGames
}

func mapSoloGamesToReconnectableGame(soloGames []*lol.SoloLeagueOfLettersGame) []ReconnectableGame {
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

package api

import (
	"net/http"
	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/oneofus"
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

	// GET fake filler games
	fakeFillerGames, err := s.fakeFiller.GamesByUserID(r.Context(), userID)
	if err != nil {
		s.log.Error("get fake filler games to reconnect to", "err", err)
	} else {
		allGames = append(allGames, mapFFGamesToReconnectableGame(fakeFillerGames)...)
	}

	// Get one device one of us games
	singleDeviceOOUGames, err := s.oneOfUs.GetSingleDeviceOneOfUsGames(r.Context(), userID)
	if err != nil {
		s.log.Error("get single device one of us games to reconnect to", "err", err)
	} else {
		allGames = append(allGames, mapSingleDeviceOneOfUsGamesToReconnectableGame(singleDeviceOOUGames)...)
	}

	// Get multi device one of us games
	multiDeviceOOUGames, err := s.oneOfUs.MultiDeviceGamesByUserID(r.Context(), userID)
	if err != nil {
		s.log.Error("get multi device one of us games to reconnect to", "err", err)
	} else {
		allGames = append(allGames, mapMultiDeviceOneOfUsGamesToReconnectableGame(multiDeviceOOUGames)...)
	}

	writeJSON(w, http.StatusOK, allGames)
}

func mapQuizSessionsToReconnectableGame(sessions []*pubquizr.Session) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, 0, len(sessions))

	for i := range sessions {
		session := sessions[i]

		if session.Mode == pubquizr.ModeMultiDevice {
			// A room with no code is a room nobody can be sent back to, so it is not offered.
			if session.LobbyID == nil {
				continue
			}

			mappedGames = append(mappedGames, ReconnectableGame{
				// The join code, not the session id -- a room is reached by its code.
				ID:        *session.LobbyID,
				Type:      PubquizRMultiDevice,
				CreatedAt: session.CreatedAt.Format(timeFormat),
			})
			continue
		}

		mappedGames = append(mappedGames, ReconnectableGame{
			ID:        session.ID.String(),
			Type:      PubquizRSingleDevice,
			CreatedAt: session.CreatedAt.Format(timeFormat),
		})
	}

	return mappedGames
}

func mapSingleDeviceOneOfUsGamesToReconnectableGame(games []*oneofus.OneOfUsSingleDeviceGame) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, len(games))

	for i := range games {
		game := games[i]

		mappedGames[i] = ReconnectableGame{
			ID:        game.ID.String(),
			Type:      OneOfUsSingleDevice,
			CreatedAt: game.CreatedAt.Format(timeFormat),
		}
	}

	return mappedGames
}

func mapMultiDeviceOneOfUsGamesToReconnectableGame(games []*oneofus.OOUMultiDeviceGame) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, len(games))

	for i := range games {
		game := games[i]

		mappedGames[i] = ReconnectableGame{
			// The join code, not the game id -- a room is reached by its code.
			ID:        game.LobbyID,
			Type:      OneOfUsMultiDevice,
			CreatedAt: game.CreatedAt.Format(timeFormat),
		}
	}

	return mappedGames
}

func mapFFGamesToReconnectableGame(games []*fakefiller.FFMultiDeviceGame) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, len(games))

	for i := range games {
		game := games[i]

		mappedGames[i] = ReconnectableGame{
			// The join code, not the game id -- the same choice League of Letters makes just below, and for the same reason.
			ID:        game.LobbyID,
			Type:      FakeFillerMultiplayer,
			CreatedAt: game.CreatedAt.Format(timeFormat),
		}
	}

	return mappedGames
}

func mapMultiplayerGamesToReconnectableGame(games []*lol.MultiplayerLeagueOfLettersGame) []ReconnectableGame {
	mappedGames := make([]ReconnectableGame, len(games))

	for i := range games {
		game := games[i]

		mappedGames[i] = ReconnectableGame{
			// The join code, not the game id: a room is reached by its code.
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

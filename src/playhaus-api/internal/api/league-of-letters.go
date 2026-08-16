package api

import (
	"net/http"
	"playhaus-api/internal/i18n"
	league_of_letters "playhaus-api/internal/league-of-letters"
)

type createSoloGameRequest struct {
	Locale     string `json:"locale"`
	WordLength int
	NRounds    int
}

func (s *Server) handleCreateSoloGame(w http.ResponseWriter, r *http.Request) {
	req, _, err := decode[createSoloGameRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	locale := Deref(req.Locale, "")
	parsedLocale := i18n.Parse(locale)

	game, err := s.leagueOfLetters.CreateSoloGame(r.Context(), &league_of_letters.CreateSoloGameInput{
		Locale: parsedLocale,
	})

	if err != nil {
		s.log.Error("create guest user", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusCreated, MapToResponse(game))
}

func (s *Server) handleGetSoloGame(w http.ResponseWriter, r *http.Request) {

}

func (s *Server) handleCreateMultiplayerLobby(w http.ResponseWriter, r *http.Request) {

}

func (s *Server) handleJoinMultiplayerLobby(w http.ResponseWriter, r *http.Request) {

}

func (g league_of_letters.SoloLeagueOfLettersGame) MapToResponse() *soloLeagueOfLettersGameResponse {
	return &soloLeagueOfLettersGameResponse{
		ID: g.ID.String(),
	}
}

type soloLeagueOfLettersGameResponse struct {
	ID string
}

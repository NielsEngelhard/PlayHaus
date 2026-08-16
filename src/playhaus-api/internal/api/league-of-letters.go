package api

import (
	"errors"
	"net/http"

	league_of_letters "playhaus-api/internal/league-of-letters"

	"github.com/google/uuid"
)

type createSoloGameRequest struct {
	Locale     *string `json:"locale"`
	WordLength int     `json:"wordLength"`
}

func (createSoloGameRequest) Validate() map[string]string { return nil }

type soloGameResponse struct {
	ID           string              `json:"id"`
	Locale       string              `json:"locale"`
	WordLength   int                 `json:"wordLength"`
	CurrentRound int                 `json:"currentRound"`
	Score        int                 `json:"score"`
	Status       string              `json:"status"`
	CreatedAt    string              `json:"createdAt"`
	Rounds       []soloRoundResponse `json:"rounds"`
}

type soloRoundResponse struct {
	ID          string              `json:"id"`
	RoundNumber int                 `json:"roundNumber"`
	Guesses     []soloGuessResponse `json:"guesses"`
}

type soloGuessResponse struct {
	ID          string               `json:"id"`
	GuessNumber int                  `json:"guessNumber"`
	Letters     []soloLetterResponse `json:"letters"`
}

type soloLetterResponse struct {
	Position int    `json:"position"`
	Letter   string `json:"letter"`
	Status   string `json:"status"`
}

func newSoloGameResponse(g *league_of_letters.SoloLeagueOfLettersGame) soloGameResponse {
	rounds := make([]soloRoundResponse, 0, len(g.Rounds))
	for _, r := range g.Rounds {
		guesses := make([]soloGuessResponse, 0, len(r.Guesses))
		for _, gu := range r.Guesses {
			letters := make([]soloLetterResponse, 0, len(gu.Letters))
			for _, l := range gu.Letters {
				letters = append(letters, soloLetterResponse{
					Position: l.Position,
					Letter:   l.Letter,
					Status:   string(l.Status),
				})
			}
			guesses = append(guesses, soloGuessResponse{
				ID:          gu.ID.String(),
				GuessNumber: gu.GuessNumber,
				Letters:     letters,
			})
		}
		rounds = append(rounds, soloRoundResponse{
			ID:          r.ID.String(),
			RoundNumber: r.RoundNumber,
			Guesses:     guesses,
		})
	}

	return soloGameResponse{
		ID:           g.ID.String(),
		Locale:       g.Locale.String(),
		WordLength:   g.WordLength,
		CurrentRound: g.CurrentRound,
		Score:        g.Score,
		Status:       string(g.Status),
		CreatedAt:    g.CreatedAt.Format(timeFormat),
		Rounds:       rounds,
	}
}

func (s *Server) handleCreateSoloGame(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreateSoloGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, _, err := decode[createSoloGameRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	game, problems, err := s.leagueOfLetters.CreateSoloGame(r.Context(), league_of_letters.CreateSoloGameInput{
		OwnerID:    ownerID,
		WordLength: req.WordLength,
		Locale:     localeFrom(Deref(req.Locale, ""), r),
	})
	if err != nil {
		s.log.Error("create solo game", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	writeJSON(w, http.StatusCreated, newSoloGameResponse(game))
}

func (s *Server) handleGetSoloGame(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetSoloGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		// An unparseable id cannot name a game, and saying so is the same
		// answer as "not yours".
		writeError(w, http.StatusNotFound, "game not found")
		return
	}

	game, err := s.leagueOfLetters.SoloGameForOwner(r.Context(), gameID, ownerID)
	if err != nil {
		if errors.Is(err, league_of_letters.ErrGameNotFound) {
			writeError(w, http.StatusNotFound, "game not found")
			return
		}
		s.log.Error("get solo game", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, newSoloGameResponse(game))
}

func (s *Server) handleCreateMultiplayerLobby(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented yet")
}

func (s *Server) handleJoinMultiplayerLobby(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented yet")
}

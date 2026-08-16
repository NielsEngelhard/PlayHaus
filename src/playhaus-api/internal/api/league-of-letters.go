package api

import (
	"errors"
	"net/http"
	"strings"

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
	OwnerID      string              `json:"ownerId"`
	Locale       string              `json:"locale"`
	WordLength   int                 `json:"wordLength"`
	MaxGuesses   int                 `json:"maxGuesses"`
	CurrentRound int                 `json:"currentRound"`
	TotalRounds  int                 `json:"totalRounds"`
	Score        int                 `json:"score"`
	Status       string              `json:"status"`
	CreatedAt    string              `json:"createdAt"`
	Rounds       []soloRoundResponse `json:"rounds"`
}

type soloRoundResponse struct {
	ID          string `json:"id"`
	RoundNumber int    `json:"roundNumber"`
	// FirstLetter is the hint, sent from the moment the round is drawn.
	FirstLetter string `json:"firstLetter"`
	// Word is the answer, and is only ever set on a round that is already over.
	Word    string              `json:"word,omitempty"`
	Guesses []soloGuessResponse `json:"guesses"`
}

type soloGuessResponse struct {
	ID          string   `json:"id"`
	UserID      string   `json:"userId"`
	GuessNumber int      `json:"guessNumber"`
	Word        string   `json:"word"`
	Marks       []string `json:"marks"`
	CreatedAt   string   `json:"createdAt"`
}

func newSoloGuessResponse(g league_of_letters.LeagueOfLettersGuess) soloGuessResponse {
	marks := make([]string, 0, len(g.Letters))
	for _, mark := range g.Marks() {
		marks = append(marks, string(mark))
	}

	return soloGuessResponse{
		ID:          g.ID.String(),
		UserID:      g.OwnerID,
		GuessNumber: g.GuessNumber,
		Word:        g.Word,
		Marks:       marks,
		CreatedAt:   g.CreatedAt.Format(timeFormat),
	}
}

func newSoloGameResponse(g *league_of_letters.SoloLeagueOfLettersGame) soloGameResponse {
	rounds := make([]soloRoundResponse, 0, len(g.Rounds))
	for _, r := range g.Rounds {
		guesses := make([]soloGuessResponse, 0, len(r.Guesses))
		for _, gu := range r.Guesses {
			guesses = append(guesses, newSoloGuessResponse(gu))
		}

		round := soloRoundResponse{
			ID:          r.ID.String(),
			RoundNumber: r.RoundNumber,
			FirstLetter: r.FirstLetter(),
			Guesses:     guesses,
		}
		// Told only once there is nothing left to spoil.
		if r.IsOver() {
			round.Word = r.Word
		}

		rounds = append(rounds, round)
	}

	return soloGameResponse{
		ID:           g.ID.String(),
		OwnerID:      g.OwnerID,
		Locale:       g.Locale.String(),
		WordLength:   g.WordLength,
		MaxGuesses:   league_of_letters.MaxGuesses,
		CurrentRound: g.CurrentRound,
		TotalRounds:  len(g.Rounds),
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

type submitGuessRequest struct {
	Word string `json:"word"`
}

func (req submitGuessRequest) Validate() map[string]string {
	if strings.TrimSpace(req.Word) == "" {
		return map[string]string{"word": "must not be empty"}
	}
	return nil
}

type submitGuessResponse struct {
	Guess     soloGuessResponse `json:"guess"`
	Solved    bool              `json:"solved"`
	RoundOver bool              `json:"roundOver"`
	GameOver  bool              `json:"gameOver"`
	// Word is the answer, present only once the round is over.
	Word         string `json:"word,omitempty"`
	CurrentRound int    `json:"currentRound"`
}

func (s *Server) handleSubmitGuess(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleSubmitGuess reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	gameID, err := uuid.Parse(r.PathValue("gameID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "game not found")
		return
	}

	req, problems, err := decode[submitGuessRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	outcome, err := s.leagueOfLetters.SubmitGuess(r.Context(), league_of_letters.SubmitGuessInput{
		GameID:  gameID,
		OwnerID: ownerID,
		Word:    req.Word,
	})
	if err != nil {
		s.writeGuessError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, submitGuessResponse{
		Guess:        newSoloGuessResponse(*outcome.Guess),
		Solved:       outcome.Solved,
		RoundOver:    outcome.RoundOver,
		GameOver:     outcome.GameOver,
		Word:         outcome.Word,
		CurrentRound: outcome.CurrentRound,
	})
}

func (s *Server) writeGuessError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, league_of_letters.ErrGameNotFound):
		writeError(w, http.StatusNotFound, "game not found")
	case errors.Is(err, league_of_letters.ErrInvalidGuess):
		writeError(w, http.StatusBadRequest, "that word cannot be played here")
	case errors.Is(err, league_of_letters.ErrDuplicateGuess):
		writeError(w, http.StatusConflict, "you already guessed that word")
	case errors.Is(err, league_of_letters.ErrRoundClosed):
		writeError(w, http.StatusConflict, "this round takes no more guesses")
	case errors.Is(err, league_of_letters.ErrGameFinished):
		writeError(w, http.StatusConflict, "this game is over")
	default:
		s.log.Error("submit guess", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

func (s *Server) handleCreateMultiplayerLobby(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented yet")
}

func (s *Server) handleJoinMultiplayerLobby(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented yet")
}

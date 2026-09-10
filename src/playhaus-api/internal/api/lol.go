package api

import (
	"errors"
	"net/http"
	"strings"

	"playhaus-api/internal/lol"

	"github.com/google/uuid"
)

type createSoloGameRequest struct {
	WordLength int     `json:"wordLength"`
	Locale     *string `json:"locale"`
	HardMode   *bool   `json:"hardMode"`
	// Competitive runs the clock and keeps score; zen, the default, does neither.
	Competitive *bool `json:"competitive"`
}

func (createSoloGameRequest) Validate() map[string]string { return nil }

type soloGameResponse struct {
	ID           string          `json:"id"`
	OwnerID      string          `json:"ownerId"`
	Locale       string          `json:"locale"`
	WordLength   int             `json:"wordLength"`
	MaxGuesses   int             `json:"maxGuesses"`
	CurrentRound int             `json:"currentRound"`
	TotalRounds  int             `json:"totalRounds"`
	Score        int             `json:"score"`
	Status       string          `json:"status"`
	CreatedAt    string          `json:"createdAt"`
	Competitive  bool            `json:"competitive"`
	TimeBonus    int             `json:"timeBonus"`
	FinishedAt   string          `json:"finishedAt,omitempty"`
	Rounds       []roundResponse `json:"rounds"`
	// Mode is which sort of game this is, and is left off a solo one.
	Mode string `json:"mode,omitempty"`
}

type roundResponse struct {
	ID          string `json:"id"`
	RoundNumber int    `json:"roundNumber"`
	// FirstLetter is the hint, sent from the moment the round is drawn.
	FirstLetter string `json:"firstLetter"`
	// Word is the answer, and is only ever set on a round that is already over.
	Word    string          `json:"word,omitempty"`
	Guesses []guessResponse `json:"guesses"`
	// EndsAt is the deadline on the round being played.
	EndsAt string `json:"endsAt,omitempty"`
}

type guessResponse struct {
	ID          string   `json:"id"`
	UserID      string   `json:"userId"`
	GuessNumber int      `json:"guessNumber"`
	Word        string   `json:"word"`
	Marks       []string `json:"marks"`
	CreatedAt   string   `json:"createdAt"`
	// Skipped is a row the clock filled in rather than a player (run out of time so skipped)
	Skipped bool `json:"skipped,omitempty"`
}

func newGuessResponse(g lol.LeagueOfLettersGuess) guessResponse {
	marks := make([]string, 0, len(g.Letters))
	for _, mark := range g.Marks() {
		marks = append(marks, string(mark))
	}

	return guessResponse{
		ID:          g.ID.String(),
		UserID:      g.OwnerID,
		GuessNumber: g.GuessNumber,
		Word:        g.Word,
		Marks:       marks,
		CreatedAt:   g.CreatedAt.Format(timeFormat),
		Skipped:     g.Skipped,
	}
}

func newSoloGameResponse(g *lol.SoloLeagueOfLettersGame) soloGameResponse {
	rounds := make([]roundResponse, 0, len(g.Rounds))
	for _, r := range g.Rounds {
		guesses := make([]guessResponse, 0, len(r.Guesses))
		for _, gu := range r.Guesses {
			guesses = append(guesses, newGuessResponse(gu))
		}

		round := roundResponse{
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

	finishedAt := ""
	if g.FinishedAt != nil {
		finishedAt = g.FinishedAt.Format(timeFormat)
	}

	return soloGameResponse{
		ID:           g.ID.String(),
		OwnerID:      g.OwnerID,
		Locale:       g.Locale.String(),
		WordLength:   g.WordLength,
		MaxGuesses:   lol.MaxGuesses,
		CurrentRound: g.CurrentRound,
		TotalRounds:  len(g.Rounds),
		Score:        g.Score,
		Status:       string(g.Status),
		CreatedAt:    g.CreatedAt.Format(timeFormat),
		Competitive:  g.Competitive,
		TimeBonus:    g.TimeBonus,
		FinishedAt:   finishedAt,
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

	onlyPickCommonWords := req.HardMode == nil || *req.HardMode == false

	game, problems, err := s.leagueOfLetters.CreateSoloGame(r.Context(), lol.CreateSoloGameInput{
		OwnerID:             ownerID,
		WordLength:          req.WordLength,
		Locale:              localeFrom(Deref(req.Locale, ""), r),
		OnlyPickCommonWords: onlyPickCommonWords,
		Competitive:         Deref(req.Competitive, false),
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

func (s *Server) handleDeleteSoloGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleDeleteSoloGame reached without an authenticated user")
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	gameID := r.PathValue("gameID")

	err := s.leagueOfLetters.DeleteSoloGameByID(r.Context(), gameID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "game not found")
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
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
		// An unparseable id cannot name a game, and saying so is the same answer as "not yours".
		writeError(w, http.StatusNotFound, "game not found")
		return
	}

	game, err := s.leagueOfLetters.SoloGameForOwner(r.Context(), gameID, ownerID)
	if err != nil {
		if errors.Is(err, lol.ErrGameNotFound) {
			writeError(w, http.StatusNotFound, "game not found")
			return
		}
		s.log.Error("get solo game", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, newSoloGameResponse(game))
}

func (s *Server) handleGetCurrentSoloGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetCurrentSoloGame reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	game, err := s.leagueOfLetters.CurrentSoloGame(r.Context(), userID)
	if err != nil {
		if errors.Is(err, lol.ErrGameNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		s.log.Error("get current solo game", "err", err)
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
	Guess        guessResponse `json:"guess"`
	Solved       bool          `json:"solved"`
	RoundOver    bool          `json:"roundOver"`
	GameOver     bool          `json:"gameOver"`
	Word         string        `json:"word,omitempty"`
	CurrentRound int           `json:"currentRound"`
	Score        int           `json:"score"`
	TimeBonus    int           `json:"timeBonus,omitempty"`
	HighScore    bool          `json:"highScore,omitempty"`
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

	outcome, err := s.leagueOfLetters.SubmitGuess(r.Context(), lol.SubmitGuessInput{
		GameID:  gameID,
		OwnerID: ownerID,
		Word:    req.Word,
	})
	if err != nil {
		s.writeGuessError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, submitGuessResponse{
		Guess:        newGuessResponse(*outcome.Guess),
		Solved:       outcome.Solved,
		RoundOver:    outcome.RoundOver,
		GameOver:     outcome.GameOver,
		Word:         outcome.Word,
		CurrentRound: outcome.CurrentRound,
		Score:        outcome.Score,
		TimeBonus:    outcome.TimeBonus,
		HighScore:    outcome.NewHighScore,
	})
}

func (s *Server) writeGuessError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, lol.ErrGameNotFound):
		writeError(w, http.StatusNotFound, "game not found")
	case errors.Is(err, lol.ErrInvalidGuessCharacters):
		writeError(w, http.StatusBadRequest, "invalid characters in guess (or too short)")
	case errors.Is(err, lol.ErrInvalidGuessWordNonExisting):
		writeError(w, http.StatusBadRequest, "that word does not exist")
	case errors.Is(err, lol.ErrDuplicateGuess):
		writeError(w, http.StatusConflict, "you already guessed that word")
	case errors.Is(err, lol.ErrRoundClosed):
		writeError(w, http.StatusConflict, "this round takes no more guesses")
	case errors.Is(err, lol.ErrGameFinished):
		writeError(w, http.StatusConflict, "this game is over")
	default:
		s.log.Error("submit guess", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

type highScoreResponse struct {
	WordLength int    `json:"wordLength"`
	Score      int    `json:"score"`
	Seconds    int    `json:"seconds"`
	AchievedAt string `json:"achievedAt"`
}

func (s *Server) handleGetHighScores(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetHighScores reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	bests, err := s.leagueOfLetters.HighScores(r.Context(), userID)
	if err != nil {
		s.log.Error("list solo high scores", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	scores := make([]highScoreResponse, 0, len(bests))
	for _, best := range bests {
		scores = append(scores, highScoreResponse{
			WordLength: best.WordLength,
			Score:      best.Score,
			Seconds:    best.Seconds,
			AchievedAt: best.AchievedAt.Format(timeFormat),
		})
	}

	writeJSON(w, http.StatusOK, scores)
}

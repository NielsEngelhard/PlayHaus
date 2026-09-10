package api

import (
	"errors"
	"net/http"
	"time"

	"playhaus-api/internal/lol"
)

type dailyStatsResponse struct {
	// BestGuesses is the fewest guesses a solved day took, and is 0 until one is solved.
	BestGuesses    int     `json:"bestGuesses"`
	AverageGuesses float64 `json:"averageGuesses"`
	DaysPlayed     int     `json:"daysPlayed"`
	DaysSolved     int     `json:"daysSolved"`
}

type dailyDayResponse struct {
	Day string `json:"day"`
	// Weekday is Go's numbering, Sunday first, so the app can label it in its own language.
	Weekday int  `json:"weekday"`
	Played  bool `json:"played"`
	Solved  bool `json:"solved"`
	Guesses int  `json:"guesses"`
}

type wordOfTheDayResponse struct {
	Day        string `json:"day"`
	Locale     string `json:"locale"`
	WordLength int    `json:"wordLength"`
	MaxGuesses int    `json:"maxGuesses"`
	// ResetsAt is when the next word becomes playable, so the client never has to agree about the zone.
	ResetsAt string `json:"resetsAt"`
	// Playable is whether today is still open: one attempt per account per day.
	Playable bool               `json:"playable"`
	Game     *soloGameResponse  `json:"game,omitempty"`
	Streak   int                `json:"streak"`
	Stats    dailyStatsResponse `json:"stats"`
	History  []dailyDayResponse `json:"history"`
}

// newDailyGameResponse serves the day's game in the shape the board already reads.
func newDailyGameResponse(g *lol.DailyGame) soloGameResponse {
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
		CurrentRound: 1,
		TotalRounds:  1,
		Status:       string(g.Status),
		CreatedAt:    g.CreatedAt.Format(timeFormat),
		Competitive:  false,
		FinishedAt:   finishedAt,
		Rounds:       rounds,
		Mode:         "daily",
	}
}

func (s *Server) handleGetWordOfTheDay(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetWordOfTheDay reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	locale := localeFrom(r.URL.Query().Get("locale"), r)
	loc := s.leagueOfLetters.ResetLocation()

	status, err := s.leagueOfLetters.WordOfTheDay(r.Context(), userID, locale, time.Now(), loc)
	if err != nil {
		s.log.Error("get word of the day", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, newWordOfTheDayResponse(status))
}

func newWordOfTheDayResponse(status *lol.DailyStatus) wordOfTheDayResponse {
	history := make([]dailyDayResponse, 0, len(status.History))
	for _, day := range status.History {
		history = append(history, dailyDayResponse{
			Day:     day.Day,
			Weekday: int(day.Weekday),
			Played:  day.Played,
			Solved:  day.Solved,
			Guesses: day.Guesses,
		})
	}

	body := wordOfTheDayResponse{
		Day:        status.Day,
		Locale:     status.Locale.String(),
		WordLength: status.WordLength,
		MaxGuesses: lol.MaxGuesses,
		ResetsAt:   status.ResetsAt.Format(timeFormat),
		Playable:   status.Game == nil,
		Streak:     status.Streak,
		Stats: dailyStatsResponse{
			BestGuesses:    status.Stats.BestGuesses,
			AverageGuesses: status.Stats.AverageGuesses,
			DaysPlayed:     status.Stats.DaysPlayed,
			DaysSolved:     status.Stats.DaysSolved,
		},
		History: history,
	}

	if status.Game != nil {
		game := newDailyGameResponse(status.Game)
		body.Game = &game
	}

	return body
}

type startWordOfTheDayRequest struct {
	Locale *string `json:"locale"`
}

func (startWordOfTheDayRequest) Validate() map[string]string { return nil }

func (s *Server) handleStartWordOfTheDay(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleStartWordOfTheDay reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, _, err := decode[startWordOfTheDayRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	locale := localeFrom(Deref(req.Locale, ""), r)
	loc := s.leagueOfLetters.ResetLocation()

	game, err := s.leagueOfLetters.StartWordOfTheDay(r.Context(), userID, locale, time.Now(), loc)
	if err != nil {
		if errors.Is(err, lol.ErrAlreadyPlayedToday) {
			writeErrorCode(w, http.StatusConflict, "already_played_today", "you have already played today's word")
			return
		}
		s.log.Error("start word of the day", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusCreated, newDailyGameResponse(game))
}

func (s *Server) handleSubmitDailyGuess(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleSubmitDailyGuess reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
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

	loc := s.leagueOfLetters.ResetLocation()

	outcome, err := s.leagueOfLetters.SubmitDailyGuess(r.Context(), lol.SubmitDailyGuessInput{
		OwnerID: userID,
		Day:     lol.DayKey(time.Now(), loc),
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
	})
}

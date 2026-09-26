package api

import (
	"context"
	"net/http"

	"playhaus-api/internal/gamestats"
)

type gamesPlayedResponse struct {
	LolWodPlayed                      int64 `json:"lolWodPlayed"`
	LolSoloPlayed                     int64 `json:"lolSoloPlayed"`
	LolMpPlayed                       int64 `json:"lolMpPlayed"`
	QzSingleDevicePlayed              int64 `json:"qzSingleDevicePlayed"`
	QzMultiDevicePlayed               int64 `json:"qzMultiDevicePlayed"`
	QzMultiDeviceWithHostScreenPlayed int64 `json:"qzMultiDeviceWithHostScreenPlayed"`
	OouSingleDevicePlayed             int64 `json:"oouSingleDevicePlayed"`
	OouMultiDevicePlayed              int64 `json:"oouMultiDevicePlayed"`
	FfPlayed                          int64 `json:"ffPlayed"`
	WwPlayed                          int64 `json:"wwPlayed"`
}

func (s *Server) AddGlobalStatsHandlers() {
	s.mux.HandleFunc("GET /api/v1/stats/games-played", s.requireAuth(s.handleGetGamesPlayed))
}

func (s *Server) handleGetGamesPlayed(w http.ResponseWriter, r *http.Request) {
	totals, err := s.gameStats.Totals(r.Context())
	if err != nil {
		s.log.Error("get games played", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, gamesPlayedResponse{
		LolWodPlayed:                      totals.LolWodPlayed,
		LolSoloPlayed:                     totals.LolSoloPlayed,
		LolMpPlayed:                       totals.LolMpPlayed,
		QzSingleDevicePlayed:              totals.QzSingleDevicePlayed,
		QzMultiDevicePlayed:               totals.QzMultiDevicePlayed,
		QzMultiDeviceWithHostScreenPlayed: totals.QzMultiDeviceWithHostScreenPlayed,
		OouSingleDevicePlayed:             totals.OouSingleDevicePlayed,
		OouMultiDevicePlayed:              totals.OouMultiDevicePlayed,
		FfPlayed:                          totals.FfPlayed,
		WwPlayed:                          totals.WwPlayed,
	})
}

// countGame only logs a failure: the game already exists, so a lost count must not become a 500.
func (s *Server) countGame(ctx context.Context, counter gamestats.Counter) {
	if err := s.gameStats.Increment(ctx, counter); err != nil {
		s.log.Error("count game", "counter", counter, "err", err)
	}
}

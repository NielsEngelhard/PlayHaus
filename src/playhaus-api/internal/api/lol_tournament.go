package api

import (
	"context"
	"errors"
	"net/http"

	"playhaus-api/internal/lol"
)

// The tournament half of League of Letters on the wire.

// tournamentPlayerResponse is one entrant's record in the bracket.
type tournamentPlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	Seed          int    `json:"seed"`
	Losses        int    `json:"losses"`
	Eliminated    bool   `json:"eliminated"`
	// Ready is this player having readied for the stage on the table right now.
	Ready bool `json:"ready"`
	// Placement is the finishing position, set the moment they are out.
	Placement int `json:"placement,omitempty"`
}

// tournamentMatchPlayerResponse is one cell of a match.
type tournamentMatchPlayerResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	Score         int    `json:"score"`
	// Place is 1-based and 0 until the match is settled.
	Place int `json:"place"`
}

type tournamentMatchResponse struct {
	ID       string `json:"id"`
	Stage    int    `json:"stage"`
	Bracket  string `json:"bracket"`
	Position int    `json:"position"`
	Status   string `json:"status"`
	// LobbyCode is the room this match is played in, and is what the client navigates to.
	LobbyCode string                          `json:"lobbyCode,omitempty"`
	WinnerID  string                          `json:"winnerId,omitempty"`
	Players   []tournamentMatchPlayerResponse `json:"players"`
}

type tournamentResponse struct {
	ID string `json:"id"`
	// Code is the tournament lobby's join code, which is also its socket room.
	Code   string `json:"code"`
	HostID string `json:"hostId"`
	Status string `json:"status"`
	// Stage is the round of the bracket on the table right now, counting from 1.
	Stage int `json:"stage"`
	// StageOver is every match of that round having a result, which is what opens the ready gate.
	StageOver bool `json:"stageOver"`
	// StagePending is that round being drawn but not opened, so the table is reading the bracket.
	StagePending bool                       `json:"stagePending"`
	WinnerID     string                     `json:"winnerId,omitempty"`
	Settings     lobbySettingsResponse      `json:"settings"`
	Players      []tournamentPlayerResponse `json:"players"`
	Matches      []tournamentMatchResponse  `json:"matches"`
	ReadyCount   int                        `json:"readyCount"`
	// ReadyNeeded is how many players the next stage is waiting on, knocked-out ones excluded.
	ReadyNeeded int    `json:"readyNeeded"`
	CreatedAt   string `json:"createdAt"`
}

func (s *Server) newTournamentResponse(ctx context.Context, tournament *lol.Tournament) tournamentResponse {
	ids := make([]string, 0, len(tournament.Players))
	for _, player := range tournament.Players {
		ids = append(ids, player.UserID)
	}
	users := s.usersByID(ctx, ids)

	players := make([]tournamentPlayerResponse, 0, len(tournament.Players))
	readyCount, readyNeeded := 0, 0
	for _, player := range tournament.Players {
		name, color := nameAndColor(users, player.UserID)
		ready := player.ReadyStage >= tournament.Stage

		if !player.Eliminated() {
			readyNeeded++
			if ready {
				readyCount++
			}
		}

		row := tournamentPlayerResponse{
			UserID:        player.UserID,
			Name:          name,
			AvatarColorID: color,
			Seed:          player.Seed,
			Losses:        player.Losses,
			Eliminated:    player.Eliminated(),
			Ready:         ready && !player.Eliminated(),
		}
		if player.Placement != nil {
			row.Placement = *player.Placement
		}
		players = append(players, row)
	}

	matches := make([]tournamentMatchResponse, 0, len(tournament.Matches))
	for _, match := range tournament.Matches {
		cells := make([]tournamentMatchPlayerResponse, 0, len(match.Players))
		for _, player := range match.Players {
			name, color := nameAndColor(users, player.UserID)
			cells = append(cells, tournamentMatchPlayerResponse{
				UserID:        player.UserID,
				Name:          name,
				AvatarColorID: color,
				Score:         player.Score,
				Place:         player.Place,
			})
		}

		row := tournamentMatchResponse{
			ID:       match.ID.String(),
			Stage:    match.Stage,
			Bracket:  string(match.Bracket),
			Position: match.Position,
			Status:   string(match.Status),
			Players:  cells,
		}
		if match.LobbyID != nil {
			row.LobbyCode = *match.LobbyID
		}
		if match.WinnerID != nil {
			row.WinnerID = *match.WinnerID
		}
		matches = append(matches, row)
	}

	body := tournamentResponse{
		ID:           tournament.ID.String(),
		Code:         tournament.LobbyID,
		HostID:       tournament.OwnerID,
		Status:       string(tournament.Status),
		Stage:        tournament.Stage,
		StageOver:    tournament.StageOver(),
		StagePending: tournament.StagePending(),
		Settings: lobbySettingsResponse{
			Locale:         tournament.Locale.String(),
			WordLength:     tournament.WordLength,
			SecondsPerTurn: tournament.SecondsPerTurn,
		},
		Players:     players,
		Matches:     matches,
		ReadyCount:  readyCount,
		ReadyNeeded: readyNeeded,
		CreatedAt:   tournament.CreatedAt.Format(timeFormat),
	}
	if tournament.WinnerID != nil {
		body.WinnerID = *tournament.WinnerID
	}

	return body
}

// handleCreateTournament draws the bracket for the table sitting in a tournament room.
func (s *Server) handleCreateTournament(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreateTournament reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	tournament, err := s.leagueOfLetters.CreateTournament(r.Context(), lobbyCode(r), userID)
	if err != nil {
		s.writeTournamentError(w, "create tournament", err)
		return
	}

	body := s.newTournamentResponse(r.Context(), tournament)
	s.publishTournament(tournament.LobbyID, body)
	// Each match room is told its own bracket too, so a competitor already sitting there is sent onward.
	s.publishTournamentToMatches(tournament, body)

	writeJSON(w, http.StatusCreated, body)
}

// handleStartTournamentStage opens the room of every match the round on the table drew.
func (s *Server) handleStartTournamentStage(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleStartTournamentStage reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	tournament, err := s.leagueOfLetters.StartStage(r.Context(), lobbyCode(r), userID)
	if err != nil {
		s.writeTournamentError(w, "start tournament stage", err)
		return
	}

	body := s.newTournamentResponse(r.Context(), tournament)
	s.publishTournament(tournament.LobbyID, body)
	s.publishTournamentToMatches(tournament, body)

	writeJSON(w, http.StatusOK, body)
}

// handleGetTournament is the snapshot the bracket screen opens on.
func (s *Server) handleGetTournament(w http.ResponseWriter, r *http.Request) {
	tournament, err := s.leagueOfLetters.Tournament(r.Context(), lobbyCode(r))
	if err != nil {
		s.writeTournamentError(w, "get tournament", err)
		return
	}

	writeJSON(w, http.StatusOK, s.newTournamentResponse(r.Context(), tournament))
}

// handleTournamentReady is a player saying they have seen the bracket.
func (s *Server) handleTournamentReady(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleTournamentReady reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	tournament, err := s.leagueOfLetters.ReadyUp(r.Context(), lobbyCode(r), userID)
	if err != nil {
		s.writeTournamentError(w, "ready up", err)
		return
	}

	body := s.newTournamentResponse(r.Context(), tournament)
	s.publishTournament(tournament.LobbyID, body)
	s.publishTournamentToMatches(tournament, body)

	writeJSON(w, http.StatusOK, body)
}

func (s *Server) writeTournamentError(w http.ResponseWriter, what string, err error) {
	switch {
	case errors.Is(err, lol.ErrTournamentNotFound):
		writeErrorCode(w, http.StatusNotFound, "tournament_not_found", "that tournament does not exist")
	case errors.Is(err, lol.ErrNotATournament):
		writeErrorCode(w, http.StatusConflict, "not_a_tournament", "that room is not a tournament")
	case errors.Is(err, lol.ErrStageStarted):
		writeErrorCode(w, http.StatusConflict, "stage_started", "this round has already started")
	case errors.Is(err, lol.ErrStageNotOver):
		writeErrorCode(w, http.StatusConflict, "stage_not_over", "some matches of this round are still being played")
	case errors.Is(err, lol.ErrTournamentOver):
		writeErrorCode(w, http.StatusConflict, "tournament_over", "that tournament is already over")
	default:
		s.writeLobbyError(w, what, err)
	}
}

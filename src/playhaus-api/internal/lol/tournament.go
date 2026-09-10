package lol

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"playhaus-api/internal/joincode"

	"github.com/google/uuid"
)

type TournamentStore interface {
	CreateTournament(ctx context.Context, tournament *Tournament, rooms []MatchRoom) error
	TournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error)
	TournamentByLobbyCode(ctx context.Context, code string) (*Tournament, error)
	TournamentLobbyCode(ctx context.Context, id uuid.UUID) (string, error)
	TournamentMatchByGameID(ctx context.Context, gameID uuid.UUID) (*TournamentMatch, error)
	SettleTournamentMatch(ctx context.Context, in SettleMatchInput) error
	SetReadyStage(ctx context.Context, tournamentID uuid.UUID, userID string, stage int) error
	AdvanceTournamentStage(ctx context.Context, tournamentID uuid.UUID, from int, rooms []MatchRoom) (bool, error)
	DeleteTournamentsOlderThan(ctx context.Context, before time.Time) (int64, error)
}

// MatchRoom is one drawn match together with the ordinary multiplayer room it is played in.
type MatchRoom struct {
	Match TournamentMatch
	Lobby *MultiplayerLeagueOfLettersLobby
	Game  *MultiplayerLeagueOfLettersGame
}

// SettleMatchInput is everything one finished match changes about the bracket.
type SettleMatchInput struct {
	TournamentID uuid.UUID
	MatchID      uuid.UUID
	WinnerID     string
	Players      []TournamentMatchPlayer
	Standings    []TournamentPlayerUpdate
	// Completed is the final having been played, so the bracket is over.
	Completed bool
}

// TournamentPlayerUpdate is one player's record after a match moved it.
type TournamentPlayerUpdate struct {
	UserID    string
	Losses    int
	Placement *int
}

// CreateTournament draws the first stage of a bracket for the table sitting in a tournament lobby.
func (s *Service) CreateTournament(ctx context.Context, code, userID string) (*Tournament, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if lobby.Kind != LobbyTournament {
		return nil, ErrNotATournament
	}
	if lobby.OwnerID != userID {
		return nil, ErrNotHost
	}
	if lobby.Status != LobbyWaiting {
		return nil, ErrLobbyStarted
	}
	if len(lobby.Players) < MinTournamentPlayers {
		return nil, ErrNotEnoughPlayers
	}

	// By seat, so the draw is the order people walked in and the host.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b MultiplayerLobbyPlayer) int { return a.Seat - b.Seat })

	now := time.Now().UTC()
	tournament := &Tournament{
		ID:             uuid.New(),
		LobbyID:        lobby.ID,
		OwnerID:        lobby.OwnerID,
		Locale:         lobby.Locale,
		WordLength:     lobby.WordLength,
		SecondsPerTurn: lobby.SecondsPerTurn,
		Stage:          1,
		Status:         TournamentInProgress,
		CreatedAt:      now,
	}

	entrants := make([]string, len(seated))
	tournament.Players = make([]TournamentPlayer, len(seated))
	for i, player := range seated {
		entrants[i] = player.UserID
		tournament.Players[i] = TournamentPlayer{TournamentID: tournament.ID, UserID: player.UserID, Seed: i}
	}

	rooms, err := s.openMatchRooms(ctx, tournament, 1, NextStage(entrants, nil))
	if err != nil {
		return nil, err
	}

	if err := s.store.CreateTournament(ctx, tournament, rooms); err != nil {
		return nil, err
	}

	return s.store.TournamentByID(ctx, tournament.ID)
}

// Tournament is the whole bracket, read back by the code of the lobby that opened it.
func (s *Service) Tournament(ctx context.Context, code string) (*Tournament, error) {
	return s.store.TournamentByLobbyCode(ctx, code)
}

// TournamentByID is the whole bracket, read back by its own id.
func (s *Service) TournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error) {
	return s.store.TournamentByID(ctx, id)
}

// TournamentCode is the join code of the bracket a match room belongs to.
func (s *Service) TournamentCode(ctx context.Context, id uuid.UUID) (string, error) {
	return s.store.TournamentLobbyCode(ctx, id)
}

// ReadyUp records that a player has seen the bracket, and draws the next stage once everyone has.
func (s *Service) ReadyUp(ctx context.Context, code, userID string) (*Tournament, error) {
	tournament, err := s.store.TournamentByLobbyCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if tournament.Status == TournamentCompleted {
		return nil, ErrTournamentOver
	}

	player := tournament.Player(userID)
	if player == nil {
		return nil, ErrTournamentNotFound
	}
	// Knocked out players watch the rest of the bracket, and never hold it up.
	if player.Eliminated() {
		return tournament, nil
	}
	if !tournament.StageOver() {
		return nil, ErrStageNotOver
	}

	if err := s.store.SetReadyStage(ctx, tournament.ID, userID, tournament.Stage); err != nil {
		return nil, err
	}
	player.ReadyStage = tournament.Stage

	if !everyoneReady(tournament) {
		return tournament, nil
	}

	draws := NextStage(tournament.Stand())
	if len(draws) == 0 {
		return tournament, nil
	}

	rooms, err := s.openMatchRooms(ctx, tournament, tournament.Stage+1, draws)
	if err != nil {
		return nil, err
	}

	// Conditional on the stage we read, so two players readying at once cannot draw it twice.
	if _, err := s.store.AdvanceTournamentStage(ctx, tournament.ID, tournament.Stage, rooms); err != nil {
		return nil, err
	}

	return s.store.TournamentByID(ctx, tournament.ID)
}

// everyoneReady reports whether every player still in the bracket has readied for the stage on the table.
func everyoneReady(tournament *Tournament) bool {
	for _, player := range tournament.Players {
		if player.Eliminated() {
			continue
		}
		if player.ReadyStage < tournament.Stage {
			return false
		}
	}
	return true
}

// settleMatch writes a finished game's result into the bracket and answers with the tournament's
// join code, so the caller can publish the new standings. An ordinary game answers with "".
func (s *Service) settleMatch(ctx context.Context, game *MultiplayerLeagueOfLettersGame) (string, error) {
	match, err := s.store.TournamentMatchByGameID(ctx, game.ID)
	if err != nil {
		if errors.Is(err, ErrTournamentNotFound) {
			return "", nil
		}
		return "", err
	}
	if match.Status != MatchLive {
		return "", nil
	}

	tournament, err := s.store.TournamentByID(ctx, match.TournamentID)
	if err != nil {
		return "", err
	}

	ranked := RankMatch(game)
	if len(ranked) == 0 {
		return "", fmt.Errorf("settle tournament match %s: game %s seats nobody", match.ID, game.ID)
	}

	in := SettleMatchInput{TournamentID: tournament.ID, MatchID: match.ID, WinnerID: ranked[0]}
	for place, userID := range ranked {
		// Slot is the draw and stays put, so a cell reads the same before and after the match settles.
		in.Players = append(in.Players, TournamentMatchPlayer{
			MatchID: match.ID,
			UserID:  userID,
			Score:   game.Score(userID),
			Place:   place + 1,
		})
	}

	// Everybody but the winner picks up a loss, and a second loss is the end of it.
	losses := map[string]int{}
	for _, player := range tournament.Players {
		losses[player.UserID] = player.Losses
	}
	for _, userID := range ranked[1:] {
		losses[userID]++
	}

	// The grand final ends the bracket whatever the losers carry, so it places everyone itself.
	if match.Bracket == BracketFinal {
		in.Completed = true
		for place, userID := range ranked {
			placement := place + 1
			in.Standings = append(in.Standings, TournamentPlayerUpdate{
				UserID:    userID,
				Losses:    losses[userID],
				Placement: &placement,
			})
		}
		if err := s.store.SettleTournamentMatch(ctx, in); err != nil {
			return "", err
		}
		return tournament.LobbyID, nil
	}

	// Whoever is knocked out here finishes just below everyone still standing.
	standing := 0
	for _, player := range tournament.Players {
		if losses[player.UserID] < TournamentLossesAllowed {
			standing++
		}
	}

	out := 0
	for _, userID := range ranked[1:] {
		update := TournamentPlayerUpdate{UserID: userID, Losses: losses[userID]}
		if losses[userID] >= TournamentLossesAllowed {
			placement := standing + 1 + out
			update.Placement = &placement
			out++
		}
		in.Standings = append(in.Standings, update)
	}

	if err := s.store.SettleTournamentMatch(ctx, in); err != nil {
		return "", err
	}

	return tournament.LobbyID, nil
}

// openMatchRooms turns a stage's draws into ordinary multiplayer rooms, one per match.
func (s *Service) openMatchRooms(ctx context.Context, tournament *Tournament, stage int, draws []Draw) ([]MatchRoom, error) {
	// Nothing is committed yet, so a code minted for an earlier draw is not taken as far as the store knows.
	minted := map[string]bool{}
	taken := func(ctx context.Context, code string) (bool, error) {
		if minted[code] {
			return true, nil
		}
		return s.store.LobbyCodeTaken(ctx, code)
	}

	positions := map[Bracket]int{}
	rooms := make([]MatchRoom, 0, len(draws))
	for _, draw := range draws {
		code, err := joincode.Free(ctx, joincode.LeagueOfLetters, taken)
		if err != nil {
			return nil, err
		}
		minted[code] = true

		position := positions[draw.Bracket]
		positions[draw.Bracket]++

		room, err := s.openMatchRoom(tournament, stage, draw, position, code)
		if err != nil {
			return nil, err
		}
		rooms = append(rooms, *room)
	}

	return rooms, nil
}

// openMatchRoom is one match: a room that is born started, and the game already dealt on its table.
func (s *Service) openMatchRoom(tournament *Tournament, stage int, draw Draw, position int, code string) (*MatchRoom, error) {
	now := time.Now().UTC()
	matchID := uuid.New()

	game := &MultiplayerLeagueOfLettersGame{
		ID:              uuid.New(),
		LobbyID:         code,
		OwnerID:         tournament.OwnerID,
		Locale:          tournament.Locale,
		WordLength:      tournament.WordLength,
		CurrentRound:    1,
		Status:          GameInProgress,
		CreatedAt:       now,
		TurnUserID:      draw.Players[0],
		TurnEndsAt:      now.Add(time.Duration(tournament.SecondsPerTurn) * time.Second),
		SecondsPerGuess: tournament.SecondsPerTurn,
	}

	lobby := &MultiplayerLeagueOfLettersLobby{
		ID:             code,
		OwnerID:        tournament.OwnerID,
		Locale:         tournament.Locale,
		WordLength:     tournament.WordLength,
		SecondsPerTurn: tournament.SecondsPerTurn,
		// A match room opens started: its table was drawn, not gathered.
		Status:       LobbyStarted,
		GameID:       &game.ID,
		CreatedAt:    now,
		Kind:         LobbyMultiplayer,
		TournamentID: &tournament.ID,
	}

	match := TournamentMatch{
		ID:           matchID,
		TournamentID: tournament.ID,
		Stage:        stage,
		Bracket:      draw.Bracket,
		Position:     position,
		LobbyID:      &code,
		GameID:       &game.ID,
		Status:       MatchLive,
		CreatedAt:    now,
	}

	lobby.Players = make([]MultiplayerLobbyPlayer, len(draw.Players))
	game.Players = make([]MultiplayerGamePlayer, len(draw.Players))
	match.Players = make([]TournamentMatchPlayer, len(draw.Players))
	for i, userID := range draw.Players {
		lobby.Players[i] = MultiplayerLobbyPlayer{LobbyID: code, UserID: userID, Seat: i, JoinedAt: now}
		game.Players[i] = MultiplayerGamePlayer{GameID: game.ID, UserID: userID, TurnOrder: i}
		match.Players[i] = TournamentMatchPlayer{MatchID: matchID, UserID: userID, Slot: i}
	}

	rounds, err := s.generateRounds(game.ID, TournamentRoundsPerMatch, game.WordLength, game.Locale, multiplayerCommonWordsOnly)
	if err != nil {
		return nil, err
	}
	game.Rounds = rounds

	return &MatchRoom{Match: match, Lobby: lobby, Game: game}, nil
}

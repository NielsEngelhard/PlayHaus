package pubquizr

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/joincode"
)

// The multi device room: where a table gathers before the quiz starts, and the deal that ends it.

func (in LobbySetup) normalised() LobbySetup {
	if !in.Locale.Valid() {
		in.Locale = i18n.Default
	}
	return in
}

// CreateLobby opens a room and puts the caller in it as the host.
func (s *Service) CreateLobby(ctx context.Context, ownerID, name string, locale i18n.Locale) (*PQLobby, error) {
	if ownerID == "" {
		return nil, fmt.Errorf("create lobby: %w: missing owner", ErrInvalidInput)
	}
	if !locale.Valid() {
		locale = i18n.Default
	}

	code, err := joincode.Free(ctx, joincode.PubquizR, s.store.LobbyCodeTaken)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	lobby := &PQLobby{
		ID:      code,
		OwnerID: ownerID,
		Locale:  locale,
		Status:  LobbyWaiting,
		// The host is a phone like any other, and the first one.
		Players:   []PQLobbyPlayer{{LobbyID: code, UserID: ownerID, Seat: 0, Name: playerName(name), JoinedAt: now}},
		CreatedAt: now,
	}

	if err := s.store.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}

	return lobby, nil
}

// Lobby reads a room back by its code.
func (s *Service) Lobby(ctx context.Context, code string) (*PQLobby, error) {
	return s.store.LobbyByCode(ctx, code)
}

// CurrentLobby is the room this player opened and nobody has started yet.
func (s *Service) CurrentLobby(ctx context.Context, ownerID string) (*PQLobby, error) {
	return s.store.WaitingLobbyByOwnerID(ctx, ownerID)
}

// UpdateLobbySetup moves the room onto what the host has picked.
func (s *Service) UpdateLobbySetup(ctx context.Context, code, userID string, in LobbySetup) (*PQLobby, map[string]string, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, nil, err
	}
	if lobby.OwnerID != userID {
		return nil, nil, ErrNotHost
	}
	if lobby.Status != LobbyWaiting {
		return nil, nil, ErrLobbyStarted
	}

	in = in.normalised()

	// A quiz that does not exist, or is not the room's language, is worth catching here rather than at the start.
	if in.QuizID != nil {
		quiz, err := s.store.QuizByID(ctx, *in.QuizID)
		if err != nil {
			return nil, nil, err
		}
		if quiz.Locale != in.Locale {
			return nil, map[string]string{"quizId": "that quiz is not in this language"}, nil
		}
	}

	if err := s.store.SaveLobbySetup(ctx, code, in); err != nil {
		return nil, nil, fmt.Errorf("save lobby setup: %w", err)
	}

	lobby.QuizID = in.QuizID
	lobby.Locale = in.Locale
	lobby.ZenMode = in.ZenMode
	lobby.TriviaMode = in.TriviaMode

	return lobby, nil, nil
}

// JoinLobby steps into somebody else's room, and is safe to call again on a room you are already in.
func (s *Service) JoinLobby(ctx context.Context, code, userID, name string) (*PQLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}

	// Already in, which is the common case.
	if lobby.Has(userID) {
		return lobby, nil
	}

	if lobby.Status != LobbyWaiting {
		return nil, ErrLobbyStarted
	}
	if lobby.Full() {
		return nil, ErrLobbyFull
	}

	player := &PQLobbyPlayer{
		LobbyID:  lobby.ID,
		UserID:   userID,
		Seat:     lobby.NextSeat(),
		Name:     playerName(name),
		JoinedAt: time.Now().UTC(),
	}
	if err := s.store.AddLobbyPlayer(ctx, player); err != nil {
		return nil, fmt.Errorf("join lobby: %w", err)
	}
	lobby.Players = append(lobby.Players, *player)

	return lobby, nil
}

// LeaveLobby gives a seat back without closing the room.
func (s *Service) LeaveLobby(ctx context.Context, code, userID string) error {
	return s.store.RemoveLobbyPlayer(ctx, code, userID)
}

// CloseLobby throws a room away for good, and the evening it dealt with it.
func (s *Service) CloseLobby(ctx context.Context, code, userID string) error {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		if errors.Is(err, ErrLobbyNotFound) {
			return nil
		}
		return err
	}
	if lobby.OwnerID != userID {
		return ErrNotHost
	}

	// The evening first: a room deleted before it would leave a quiz running with no way for this call to find it again.
	if lobby.SessionID != nil {
		if err := s.store.AbandonSession(ctx, *lobby.SessionID); err != nil {
			return err
		}
	}

	return s.store.DeleteLobby(ctx, code)
}

// SweepStaleLobbies deletes rooms older than maxAge on a ticker until ctx is cancelled.
func (s *Service) SweepStaleLobbies(ctx context.Context, maxAge, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			deleted, err := s.store.DeleteLobbiesOlderThan(ctx, time.Now().UTC().Add(-maxAge))
			if err != nil {
				log.Error("sweep stale pubquizr lobbies", "err", err)
				continue
			}
			if deleted > 0 {
				log.Info("swept stale pubquizr lobbies", "deleted", deleted)
			}
		}
	}
}

// StartMultiDeviceSession deals the evening the room gathered for.
func (s *Service) StartMultiDeviceSession(ctx context.Context, code, userID string) (*Session, map[string]string, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, nil, err
	}
	if lobby.OwnerID != userID {
		return nil, nil, ErrNotHost
	}
	if lobby.Status != LobbyWaiting {
		return nil, nil, ErrLobbyStarted
	}
	if lobby.QuizID == nil {
		return nil, map[string]string{"quizId": "pick a quiz first"}, nil
	}
	if err := lobbyCountOK(len(lobby.Players)); err != nil {
		return nil, nil, err
	}

	quiz, err := s.Quiz(ctx, *lobby.QuizID)
	if err != nil {
		return nil, nil, err
	}

	modes := Modes{Zen: lobby.ZenMode, Trivia: lobby.TriviaMode}
	deal, err := dealQuestions(quiz, len(lobby.Players), modes)
	if err != nil {
		return nil, nil, err
	}

	// The lobby's seats can have holes in them, so they are handed out again here: a session's seats are what the rules count round.
	roster := make([]seatedPlayer, 0, len(lobby.Players))
	for _, player := range lobby.Players {
		userID := player.UserID
		roster = append(roster, seatedPlayer{Name: player.Name, UserID: &userID})
	}

	now := time.Now().UTC()
	session := buildSession(quiz, roster, modes, ModeMultiDevice, lobby.OwnerID, &lobby.ID, deal, now)

	// One row per phone rather than one for the host, so the shelf's played mark is right for everybody who was here.
	plays := make([]*QuizPlay, 0, len(roster))
	for _, player := range lobby.Players {
		plays = append(plays, &QuizPlay{OwnerID: player.UserID, QuizID: quiz.ID, PlayedAt: now})
	}

	if err := s.store.StartLobby(ctx, lobby, session, plays); err != nil {
		return nil, nil, err
	}

	return session, nil, nil
}

// lobbyCountOK is the player rule read off a room rather than off a roster of typed names.
func lobbyCountOK(players int) error {
	if players < MinPlayers {
		return ErrTooFewPlayers
	}
	if players > MaxPlayers {
		return ErrTooManyPlayers
	}
	return nil
}

// playerName is what a phone will be called at the table, and never nothing.
func playerName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return "Player"
	}
	if len(trimmed) > 40 {
		return trimmed[:40]
	}
	return trimmed
}

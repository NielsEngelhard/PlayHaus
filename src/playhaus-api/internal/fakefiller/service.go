package fakefiller

import (
	"context"
	"fmt"
	"playhaus-api/internal/i18n"
	"playhaus-api/internal/joincode"
	"time"
)

type Store interface {
	LobbyCodeTaken(ctx context.Context, code string) (bool, error)
	CreateLobby(ctx context.Context, lobby *FFLobby) error
	StartLobby(ctx context.Context, lobby *FFLobby, game *FFMultiDeviceGame) error
	GetLobbyByID(ctx context.Context, lobby string) (*FFLobby, error)
	AddLobbyPlayer(ctx context.Context, player *FFLobbyPlayer) error
	RemoveLobbyPlayer(ctx context.Context, code, userID string) error
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) CreateMpLobby(ctx context.Context, ownerID string, locale i18n.Locale) (*FFLobby, error) {
	if ownerID == "" {
		return nil, fmt.Errorf("create lobby: %w: missing owner", ErrInvalidInput)
	}
	if !locale.Valid() {
		locale = i18n.Default
	}

	code, err := s.freeJoinCode(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()

	lobby := &FFLobby{
		ID:        code,
		OwnerID:   ownerID,
		Locale:    locale,
		Players:   []FFLobbyPlayer{{LobbyID: code, UserID: ownerID}},
		CreatedAt: now,
	}

	if err := s.store.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create ff lobby: %w", err)
	}

	return lobby, nil
}

type StartFFGameInput struct {
	GameID   string
	OwnerID  string
	Locale   i18n.Locale
	GameMode FFGameMode
}

// Start the game
func (s *Service) StartMpLobby(ctx context.Context, in *StartFFGameInput) (*FFMultiDeviceGame, error) {
	//lobby, err := s.store.GetLobbyByID(ctx, in.GameID)
	//if err != nil {
	//	return nil, err
	//}
	//
	//if len(lobby.Players) < MultiDeviceGameMinPlayers {
	//	return nil, fmt.Errorf("MultiDeviceGameMinPlayers not reached")
	//}
	//
	//if len(lobby.Players) > MultiDeviceGameMaxPlayers {
	//	return nil, fmt.Errorf("MultiDeviceGameMaxPlayers exceeded")
	//}
	//
	//now := time.Now().UTC()
	//
	//game := &FFMultiDeviceGame{
	//	ID:           uuid.New(),
	//	LobbyID:      lobby.ID,
	//	OwnerID:      lobby.OwnerID,
	//	Locale:       in.Locale,
	//	GameMode:     in.GameMode,
	//	CurrentRound: 1,
	//	CreatedAt:    now,
	//}
	//
	//players, err := createPlayers(game)
	//if err != nil {
	//	return nil, err
	//}
	//
	//rounds, err := createRounds(game)
	//if err != nil {
	//	return nil, err
	//}
	//
	//game.Players = players
	//game.Rounds = rounds
	//
	//if err := s.store.StartLobby(ctx, lobby, game); err != nil {
	//	return nil, fmt.Errorf("start lobby: %w", err)
	//}
	//
	//return game, nil
	return nil, nil
}

func (s *Service) freeJoinCode(ctx context.Context) (string, error) {
	return joincode.Free(ctx, joincode.LeagueOfLetters, s.store.LobbyCodeTaken)
}

//func createPlayers(game *FFMultiDeviceGame) ([]FFLobbyPlayer, error) {
//	game.Players = make([]FFLobbyPlayer, len(X))
//	for i, player := range X {
//		game.Players[i] = FFLobbyPlayer{
//			UserID:  player.UserID,
//			LobbyID: game.LobbyID,
//			Score:   0,
//		}
//	}
//}

func createRounds() []FFRound {
	return nil
	// Every person always can write 2 answers himself. So it is possible you don't battle every other player, but that is OK
}

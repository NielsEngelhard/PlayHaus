package oneofus

import (
	"context"
	"fmt"
	"math/rand"
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type GameInputLine struct {
	RealLine     string
	ImposterLine string
}

type Store interface {
	CreateOneDeviceGame(ctx context.Context, game *OneOfUsSingleDeviceGame) error
	GetOneDeviceGame(ctx context.Context, ownerID string, gameID uuid.UUID) (OneOfUsSingleDeviceGame, error)
	GetOneDeviceGamePlayers(ctx context.Context, ownerID string, gameID uuid.UUID) ([]OneOfUsLocalPlayer, error)
	VoteOutPlayerOneDeviceGame(ctx context.Context, playerID uuid.UUID) error
	RemoveOneDeviceGame(ctx context.Context, gameID uuid.UUID) error
}

type Service struct {
	store Store
}

type StartOneOfUsSingleDeviceGameInput struct {
	OwnerID     string
	Locale      i18n.Locale
	PlayerNames []string
	GameMode    GameMode
}

type VotePlayerOutSingleDeviceGameInput struct {
	OwnerID  string
	GameID   uuid.UUID
	PlayerID uuid.UUID
}

type VotePlayerOutSingleDeviceGameResponse struct {
	PlayerID     uuid.UUID
	PlayerRole   Role
	GameEnded    bool
	CiviliansWon bool
}

func (s *Service) StartSingleDeviceGame(ctx context.Context, in StartOneOfUsSingleDeviceGameInput) (*OneOfUsSingleDeviceGame, error) {
	gameID := uuid.New()
	now := time.Now().UTC()

	players := make([]OneOfUsLocalPlayer, len(in.PlayerNames))
	for seat, name := range in.PlayerNames {
		players[seat] = OneOfUsLocalPlayer{
			playerID:   uuid.UUID{},
			Name:       name,
			Role:       Civilian,
			CreatedAt:  now,
			IsVotedOut: false,
		}
	}

	assignImposters(players)

	lines, err := GetContentLines(in.Locale, in.GameMode, 1)
	if err != nil {
		return nil, err
	}

	if len(lines) == 0 {
		return nil, fmt.Errorf("no lines found for game %s", in.OwnerID)
	}

	game := &OneOfUsSingleDeviceGame{
		ID:               gameID,
		OwnerID:          in.OwnerID,
		Locale:           in.Locale,
		CreatedAt:        now,
		ActualQuestion:   lines[0].RealLine,
		ImposterQuestion: lines[0].ImposterLine,
		Players:          players,
	}

	err = s.store.CreateOneDeviceGame(ctx, game)
	if err != nil {
		return nil, fmt.Errorf("error creating CreateOneDeviceGame %w", err)
	}

	return game, nil
}

func (s *Service) GetSingleDeviceOneOfUsGame(ctx context.Context, ownerID string, gameID uuid.UUID) (OneOfUsSingleDeviceGame, error) {
	return s.store.GetOneDeviceGame(ctx, ownerID, gameID)
}

func (s *Service) VotePlayerOutSingleDeviceGame(ctx context.Context, in VotePlayerOutSingleDeviceGameInput) (*VotePlayerOutSingleDeviceGameResponse, error) {
	players, err := s.store.GetOneDeviceGamePlayers(ctx, in.OwnerID, in.GameID)
	if err != nil {
		return nil, err
	}

	player := getPlayerByID(in.PlayerID, players)
	if player == nil {
		return nil, fmt.Errorf("player not found")
	}

	if player.IsVotedOut == true {
		return nil, fmt.Errorf("player is already voted out")
	}

	player.IsVotedOut = true
	err = s.store.VoteOutPlayerOneDeviceGame(ctx, player.playerID)
	if err != nil {
		return nil, err
	}

	gameEnded, noMoreImposters := determineGameEnded(players)

	if gameEnded == true {
		err = s.store.RemoveOneDeviceGame(ctx, in.GameID)
		if err != nil {
			fmt.Errorf("Could not remove RemoveOneDeviceGame with game ID %s: %w", in.GameID, err)
		}
	}

	return &VotePlayerOutSingleDeviceGameResponse{
		PlayerID:     player.playerID,
		PlayerRole:   player.Role,
		GameEnded:    gameEnded,
		CiviliansWon: gameEnded && noMoreImposters,
	}, nil
}

func getPlayerByID(playerID uuid.UUID, players []OneOfUsLocalPlayer) *OneOfUsLocalPlayer {
	for _, player := range players {
		if player.playerID == playerID {
			return &player
		}
	}

	return nil
}

func determineGameEnded(players []OneOfUsLocalPlayer) (bool, bool) {
	civilians := 0
	activePlayers := 0

	for _, player := range players {
		if player.IsVotedOut {
			continue
		}

		activePlayers++

		if player.Role == Civilian {
			civilians++
		}
	}

	civiliansInMinority := civilians <= activePlayers/2
	noMoreImposters := activePlayers == civilians
	gameEnded := civiliansInMinority || noMoreImposters

	return gameEnded, noMoreImposters
}

func assignImposters(players []OneOfUsLocalPlayer) {
	amountOfImposters := len(players) / 3

	if amountOfImposters == 0 {
		return
	}

	indices := rand.Perm(len(players))

	for _, index := range indices[:amountOfImposters] {
		players[index].Role = Imposter
	}
}

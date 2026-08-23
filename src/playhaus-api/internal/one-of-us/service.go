package one_of_us

import (
	"context"
	"fmt"
	"math/rand"
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type GameMode string

const (
	Word     GameMode = "word"
	Sentence GameMode = "sentence"
)

type GameInputLine struct {
	RealLine     string
	ImposterLine string
}

type Store interface {
	CreateOneDeviceGame(ctx context.Context, game *OneOfUsSingleDeviceGame) error
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

func (s *Service) StartSingleDeviceGame(ctx context.Context, in StartOneOfUsSingleDeviceGameInput) (*OneOfUsSingleDeviceGame, error) {
	gameID := uuid.New()
	now := time.Now().UTC()

	players := make([]OneOfUsLocalPlayer, len(in.PlayerNames))
	for seat, name := range in.PlayerNames {
		players[seat] = OneOfUsLocalPlayer{
			GameId:    gameID,
			Seat:      seat,
			Name:      name,
			Score:     0,
			CreatedAt: now,
		}
	}

	rounds, err := generateOneOfUsRounds(in.Locale, in.GameMode, 4, gameID, players)
	if err != nil {
		return nil, err
	}

	game := &OneOfUsSingleDeviceGame{
		ID:        gameID,
		OwnerID:   in.OwnerID,
		Locale:    in.Locale,
		CreatedAt: now,
		Rounds:    rounds,
		Players:   players,
	}

	err = s.store.CreateOneDeviceGame(ctx, game)
	if err != nil {
		return nil, fmt.Errorf("error creating CreateOneDeviceGame %w", err)
	}

	return game, nil
}

func generateOneOfUsRounds(
	locale i18n.Locale,
	mode GameMode,
	amount int,
	gameID uuid.UUID,
	players []OneOfUsLocalPlayer,
) ([]OneOfUsRound, error) {
	content, err := GetContentLines(locale, mode, amount)
	if err != nil {
		return nil, err
	}

	rounds := make([]OneOfUsRound, len(content))
	rand := rand.New(rand.NewSource(time.Now().UnixNano()))

	for i, line := range content {
		imposterAmount := determineAmountOfImposters(len(players))

		// Create a shuffled copy so the original players slice isn't modified.
		shuffledPlayers := append([]OneOfUsLocalPlayer(nil), players...)
		rand.Shuffle(len(shuffledPlayers), func(i, j int) {
			shuffledPlayers[i], shuffledPlayers[j] = shuffledPlayers[j], shuffledPlayers[i]
		})

		imposters := shuffledPlayers[:imposterAmount]

		rounds[i] = OneOfUsRound{
			GameID:           gameID,
			RoundNumber:      i + 1,
			ActualQuestion:   line.RealLine,
			ImposterQuestion: line.ImposterLine,
			Imposters:        imposters,
		}
	}

	return rounds, nil
}

func determineAmountOfImposters(totalPlayers int) int {
	return totalPlayers / 3 // 1 imposter per 3 players
}

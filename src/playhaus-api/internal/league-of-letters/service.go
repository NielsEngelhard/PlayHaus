package league_of_letters

import (
	"context"
	"fmt"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

type Store interface {
	CreateSoloGame(ctx context.Context, soloGame *SoloLeagueOfLettersGame) error
	SoloGameByID(ctx context.Context, id uuid.UUID) (*SoloLeagueOfLettersGame, error)
}

type CreateSoloGameInput struct {
	OwnerID    string
	WordLength int
	NRounds    int
	Locale     i18n.Locale
}

func (in CreateSoloGameInput) validate() map[string]string {
	problems := map[string]string{}
	if in.WordLength < MinWordLength || in.WordLength > MaxWordLength {
		problems["wordLength"] = fmt.Sprintf("must be between %d and %d", MinWordLength, MaxWordLength)
	}
	if in.NRounds < MinRounds || in.NRounds > MaxRounds {
		problems["nRounds"] = fmt.Sprintf("must be between %d and %d", MinRounds, MaxRounds)
	}
	return problems
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) CreateSoloGame(ctx context.Context, in CreateSoloGameInput) (*SoloLeagueOfLettersGame, map[string]string, error) {
	if in.OwnerID == "" {
		return nil, nil, fmt.Errorf("create solo game: %w: missing owner", ErrInvalidInput)
	}
	if problems := in.validate(); len(problems) > 0 {
		return nil, problems, nil
	}

	locale := in.Locale
	if !locale.Valid() {
		locale = i18n.Default
	}

	game := &SoloLeagueOfLettersGame{
		ID:              uuid.New(),
		OwnerID:         in.OwnerID,
		Locale:          locale,
		WordLength:      in.WordLength,
		SecondsPerGuess: nil,
		CurrentRound:    1,
		Score:           0,
		Status:          GameInProgress,
		CreatedAt:       time.Now().UTC(),
	}

	rounds, err := generateRounds(game.ID, in.NRounds, in.WordLength, locale)
	if err != nil {
		return nil, nil, err
	}
	game.Rounds = rounds

	if err := s.store.CreateSoloGame(ctx, game); err != nil {
		return nil, nil, fmt.Errorf("insert solo game: %w", err)
	}

	return game, nil, nil
}

func (s *Service) SoloGameForOwner(ctx context.Context, id uuid.UUID, ownerID string) (*SoloLeagueOfLettersGame, error) {
	game, err := s.store.SoloGameByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if game.OwnerID != ownerID {
		return nil, ErrGameNotFound
	}
	return game, nil
}

func generateRounds(gameID uuid.UUID, amount int, wordLength int, locale i18n.Locale) ([]LeagueOfLettersRound, error) {
	words, err := GetRandomWords(locale, wordLength, amount)
	if err != nil {
		return nil, err
	}

	rounds := make([]LeagueOfLettersRound, amount)
	for i := 0; i < amount; i++ {
		rounds[i] = LeagueOfLettersRound{
			ID:          uuid.New(),
			GameID:      gameID,
			RoundNumber: i + 1,
			Word:        words[i],
		}
	}

	return rounds, nil
}

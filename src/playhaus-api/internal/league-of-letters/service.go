package league_of_letters

import (
	"context"
	"fmt"
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type Store interface {
	CreateSoloGame(ctx context.Context, soloGame *SoloLeagueOfLettersGame) error
}

type CreateSoloGameInput struct {
	WordLength int
	NRounds    int
	UserId     uuid.UUID
	Locale     i18n.Locale
}

type Service struct {
	Store Store
}

func (s *Service) CreateSoloGame(ctx context.Context, in CreateSoloGameInput) (*SoloLeagueOfLettersGame, error) {
	rounds, err := generateRounds(in.NRounds, in.WordLength, in.Locale)
	if err != nil {
		return nil, err
	}

	game := &SoloLeagueOfLettersGame{
		ID: uuid.New(),
		//OwnerId:         uuid.New(), // TODO: How to determine this?!
		Rounds:          rounds,
		SecondsPerGuess: nil,
		CurrentRound:    1,
		Score:           0,
		Status:          GameInProgress,
		CreatedAt:       time.Now().UTC(),
	}

	if err := s.Store.CreateSoloGame(ctx, game); err != nil {
		return nil, fmt.Errorf("insert solo game: %w", err)
	}

	return game, nil
}

func generateRounds(amount int, wordLength int, locale i18n.Locale) ([]LeagueOfLettersRound, error) {
	rounds := make([]LeagueOfLettersRound, amount)
	words, err := GetRandomWords(locale, wordLength, amount)
	if err != nil {
		return nil, err
	}

	for i := 0; i < amount; i++ {
		rounds[i] = LeagueOfLettersRound{
			ID:          uuid.New(),
			RoundNumber: i + 1,
			Word:        words[i],
			Guesses:     nil,
		}
	}

	return rounds, nil
}

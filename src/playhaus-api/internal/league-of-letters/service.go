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
	GetSoloGamesByUserId(ctx context.Context, userID string) ([]*SoloLeagueOfLettersGame, error)
	CurrentSoloGameByUserID(ctx context.Context, userID string) (*SoloLeagueOfLettersGame, error)
	DeleteSoloGamesByUserId(ctx context.Context, userID string, except uuid.UUID) error
	RecordGuess(ctx context.Context, guess *LeagueOfLettersGuess, game *SoloLeagueOfLettersGame) error
}

type CreateSoloGameInput struct {
	OwnerID    string
	WordLength int
	Locale     i18n.Locale
}

func (in CreateSoloGameInput) validate() map[string]string {
	problems := map[string]string{}
	if in.WordLength < MinWordLength || in.WordLength > MaxWordLength {
		problems["wordLength"] = fmt.Sprintf("must be between %d and %d", MinWordLength, MaxWordLength)
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

	rounds, err := generateRounds(game.ID, determineNumberOfRounds(1), in.WordLength, locale)
	if err != nil {
		return nil, nil, err
	}
	game.Rounds = rounds

	if err := s.store.CreateSoloGame(ctx, game); err != nil {
		return nil, nil, fmt.Errorf("insert solo game: %w", err)
	}

	// A player keeps one solo game at a time: the new one replaces whatever was
	if err := s.store.DeleteSoloGamesByUserId(ctx, in.OwnerID, game.ID); err != nil {
		return nil, nil, fmt.Errorf("delete previous solo games: %w", err)
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

func (s *Service) GetSoloGamesByUserId(ctx context.Context, userID string) ([]*SoloLeagueOfLettersGame, error) {
	return s.store.GetSoloGamesByUserId(ctx, userID)
}

// CurrentSoloGame is the unfinished solo game the player owns
func (s *Service) CurrentSoloGame(ctx context.Context, userID string) (*SoloLeagueOfLettersGame, error) {
	if userID == "" {
		return nil, ErrGameNotFound
	}
	return s.store.CurrentSoloGameByUserID(ctx, userID)
}

type SubmitGuessInput struct {
	GameID  uuid.UUID
	OwnerID string
	Word    string
}

type GuessOutcome struct {
	Guess        *LeagueOfLettersGuess
	Solved       bool
	RoundOver    bool
	GameOver     bool
	Word         string
	CurrentRound int
	Score        int
}

// SubmitGuess plays one word against the game's current round.
func (s *Service) SubmitGuess(ctx context.Context, in SubmitGuessInput) (*GuessOutcome, error) {
	game, err := s.SoloGameForOwner(ctx, in.GameID, in.OwnerID)
	if err != nil {
		return nil, err
	}
	if game.Status != GameInProgress {
		return nil, ErrGameFinished
	}

	round := game.round(game.CurrentRound)
	if round == nil {
		// The game points at a round it does not have. Nothing the player can do
		// about it, so it is not a refusal -- it is a broken game.
		return nil, fmt.Errorf("game %s has no round %d", game.ID, game.CurrentRound)
	}
	if round.IsOver() {
		return nil, ErrRoundClosed
	}

	word := NormalizeGuess(in.Word)
	if !ValidGuess(word, game.WordLength, round.FirstLetter()) {
		return nil, ErrInvalidGuess
	}
	if !IsAllowedWord(game.Locale, game.WordLength, word) {
		return nil, ErrInvalidGuess
	}
	for _, played := range round.Guesses {
		if played.Word == word {
			return nil, ErrDuplicateGuess
		}
	}

	guess := &LeagueOfLettersGuess{
		ID:          uuid.New(),
		RoundID:     round.ID,
		OwnerID:     in.OwnerID,
		Word:        word,
		GuessNumber: len(round.Guesses) + 1,
		Letters:     validatedLetters(word, round.Word),
		CreatedAt:   time.Now().UTC(),
	}

	solved := guess.Correct()
	roundOver := solved || guess.GuessNumber >= MaxGuesses

	game.Score += DetermineScore(*guess, round.Guesses)

	outcome := &GuessOutcome{
		Guess:        guess,
		Solved:       solved,
		RoundOver:    roundOver,
		CurrentRound: game.CurrentRound,
		Score:        game.Score,
	}

	if roundOver {
		outcome.Word = round.Word

		if game.CurrentRound >= len(game.Rounds) {
			game.Status = GameCompleted
			outcome.GameOver = true
		} else {
			game.CurrentRound++
		}
		outcome.CurrentRound = game.CurrentRound
	}

	if err := s.store.RecordGuess(ctx, guess, game); err != nil {
		return nil, err
	}

	return outcome, nil
}

func (g *SoloLeagueOfLettersGame) round(number int) *LeagueOfLettersRound {
	for i := range g.Rounds {
		if g.Rounds[i].RoundNumber == number {
			return &g.Rounds[i]
		}
	}
	return nil
}

func validatedLetters(word, target string) []LeagueOfLettersValidatedLetter {
	marks := Evaluate(word, target)
	runes := []rune(word)

	letters := make([]LeagueOfLettersValidatedLetter, len(runes))
	for i, r := range runes {
		letters[i] = LeagueOfLettersValidatedLetter{
			ID:       uuid.New(),
			Position: i,
			Letter:   string(r),
			Status:   marks[i],
		}
	}

	return letters
}

func generateRounds(gameID uuid.UUID, amount int, wordLength int, locale i18n.Locale) ([]LeagueOfLettersRound, error) {
	words, err := GetRandomWords(locale, wordLength, amount)
	if err != nil {
		return nil, err
	}

	rounds := make([]LeagueOfLettersRound, amount)
	for i := range amount {
		rounds[i] = LeagueOfLettersRound{
			ID:          uuid.New(),
			GameID:      gameID,
			RoundNumber: i + 1,
			Word:        words[i],
		}
	}

	return rounds, nil
}

func determineNumberOfRounds(nPlayers int) int {
	switch {
	case nPlayers == 1:
		return 3
	case nPlayers <= 3:
		return nPlayers * 2
	default:
		return nPlayers * 3
	}
}

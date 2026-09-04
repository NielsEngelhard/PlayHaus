package lol

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

type Store interface {
	CreateSoloGame(ctx context.Context, soloGame *SoloLeagueOfLettersGame) error
	SoloGameByID(ctx context.Context, id uuid.UUID) (*SoloLeagueOfLettersGame, error)
	GetSoloGamesByUserId(ctx context.Context, userID string) ([]*SoloLeagueOfLettersGame, error)
	DeleteSoloGameByID(ctx context.Context, soloGameID string, userID string) error
	CurrentSoloGameByUserID(ctx context.Context, userID string) (*SoloLeagueOfLettersGame, error)
	DeleteSoloGamesByUserId(ctx context.Context, userID string, except uuid.UUID) error
	DeleteSoloGamesOlderThan(ctx context.Context, before time.Time) (int64, error)
	RecordGuess(ctx context.Context, guess *LeagueOfLettersGuess, game *SoloLeagueOfLettersGame) error

	MultiplayerStore
}

// SweepConfig is the retention window per table the sweep touches.
type SweepConfig struct {
	SoloGameAge time.Duration
	LobbyAge    time.Duration // shared by lobbies and started multiplayer games
}

// SweepStale deletes old solo games and multiplayer lobbies/games on a ticker until ctx
// is cancelled. A DB-only delete is safe: realtime rooms are ephemeral and self-reap
// once empty, so nothing live is still pointing at a room or game this old.
func (s *Service) SweepStale(ctx context.Context, cfg SweepConfig, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now().UTC()

			if deleted, err := s.store.DeleteSoloGamesOlderThan(ctx, now.Add(-cfg.SoloGameAge)); err != nil {
				log.Error("sweep stale solo league of letters games", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale solo league of letters games", "deleted", deleted)
			}

			if deleted, err := s.store.DeleteLobbiesOlderThan(ctx, now.Add(-cfg.LobbyAge)); err != nil {
				log.Error("sweep stale league of letters lobbies", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale league of letters lobbies", "deleted", deleted)
			}

			if deleted, err := s.store.DeleteMultiplayerGamesOlderThan(ctx, now.Add(-cfg.LobbyAge)); err != nil {
				log.Error("sweep stale multiplayer league of letters games", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale multiplayer league of letters games", "deleted", deleted)
			}
		}
	}
}

type CreateSoloGameInput struct {
	OwnerID             string
	WordLength          int
	Locale              i18n.Locale
	OnlyPickCommonWords bool
}

func (in CreateSoloGameInput) validate() map[string]string {
	problems := map[string]string{}
	if !ValidWordLength(in.WordLength) {
		problems["wordLength"] = fmt.Sprintf("must be between %d and %d", MinWordLength, MaxWordLength)
	}

	return problems
}

// Options is the behaviour a deployment gets to choose, rather than the game's own
// rules. It is passed in from main because the environment is main's business: a
// service that read it for itself could not be constructed two ways in a test, and
// the reading would happen once per game rather than once per process.
type Options struct {
	DevMode bool // DevMode makes every round play the same word
}

type Service struct {
	store Store
	opts  Options
}

func NewService(store Store, opts Options) *Service {
	return &Service{store: store, opts: opts}
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

	rounds, err := s.generateRounds(game.ID, RoundsFor(1), in.WordLength, locale, in.OnlyPickCommonWords)
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

func (s *Service) DeleteSoloGameByID(ctx context.Context, soloGameID string, userID string) error {
	return s.store.DeleteSoloGameByID(ctx, soloGameID, userID)
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
		return nil, ErrInvalidGuessCharacters
	}
	if !IsAllowedWord(game.Locale, game.WordLength, word) {
		return nil, ErrInvalidGuessWordNonExisting
	}
	if AlreadyGuessed(round.Guesses, word) {
		return nil, ErrDuplicateGuess
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
	// GuessNumber counts this row, so the round is asked about the board as it will
	// stand -- the guess is scored before it is appended, and this is the same order.
	roundOver := RoundIsOver(solved, guess.GuessNumber)

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

func (s *Service) generateRounds(gameID uuid.UUID, amount int, wordLength int, locale i18n.Locale, onlyPickCommonWords bool) ([]LeagueOfLettersRound, error) {
	words, err := GetRandomWords(locale, wordLength, amount, onlyPickCommonWords)
	if err != nil {
		return nil, err
	}

	// One word for the whole game in dev mode, but the *right* length: picking a
	// fixed word here would quietly ignore the length the player chose, and a
	// setting that does nothing looks like a broken setting rather than a dev flag.
	devWord := ""
	if s.opts.DevMode {
		devWord, _ = DevModeWord(locale, wordLength, onlyPickCommonWords)
	}

	rounds := make([]LeagueOfLettersRound, amount)
	for i := range amount {
		word := words[i]
		if devWord != "" {
			word = devWord
		}

		rounds[i] = LeagueOfLettersRound{
			ID:          uuid.New(),
			GameID:      gameID,
			RoundNumber: i + 1,
			Word:        word,
		}
	}

	return rounds, nil
}

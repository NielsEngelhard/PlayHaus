package leagueofletters

import (
	"context"
	"errors"
	"time"

	"playhausapi/internal/leagueofletters/wordlists"
)

// Why a game read or a guess was refused. Handlers turn these into statuses in
// writeError; nothing outside this package needs to tell them apart.
var (
	errGameNotFound        = errors.New("game not found")
	errGameNotActive       = errors.New("game is not accepting guesses")
	errBadGuess            = errors.New("guess does not fit this game")
	errAlreadyGuessed      = errors.New("word already guessed this round")
	errOutOfGuesses        = errors.New("no guesses left")
	errUnknownMode         = errors.New("unknown game mode")
	errUnsupportedLanguage = errors.New("unsupported language")
	errUnsupportedLength   = errors.New("unsupported word length")
)

// How many times a room code collision is retried before giving up.
const codeAttempts = 5

// Service is the rules of the game. It is the only layer that decides anything:
// handlers above it only translate HTTP, and the store below it only moves rows.
type Service struct {
	store *Store

	// now is a field rather than a direct call to time.Now so that tests can
	// run a game's clock out without sleeping through it.
	now func() time.Time
}

func NewService(store *Store) *Service {
	return &Service{store: store, now: time.Now}
}

// NewGame is what a caller must supply to start a game. Strings rather than
// parsed types on purpose: parsing them is this layer's job, so an unknown
// language is a game-rules error with a proper response rather than something
// the HTTP layer had to know how to check.
type NewGame struct {
	Mode       string
	Language   string
	WordLength int
}

// CreateGame starts a new game, solo or multiplayer.
//
// The two modes differ only in when the clock starts. A solo game has nobody to
// wait for, so it is created active with its first round already drawn. A
// multiplayer game is created in the lobby with a room code and no round at
// all — the word is drawn when the host starts it, so a code that sits unused
// for an hour hasn't burned a word or quietly run out its clock.
func (s *Service) CreateGame(ctx context.Context, userID string, in NewGame) (GameResponse, error) {
	mode, ok := ParseMode(in.Mode)
	if !ok {
		return GameResponse{}, errUnknownMode
	}

	// Parsed here only to reject bad input early; the game stores the raw
	// values and re-parses when it needs a word.
	if _, err := wordlists.ParseLanguage(in.Language); err != nil {
		return GameResponse{}, errUnsupportedLanguage
	}
	if _, err := wordlists.ParseLength(in.WordLength); err != nil {
		return GameResponse{}, errUnsupportedLength
	}

	var (
		game Game
		err  error
	)
	for range codeAttempts {
		game, err = s.createGame(ctx, userID, mode, in)
		// Two games drew the same room code. Nothing was written — the whole
		// create is one transaction — so just draw another one.
		if errors.Is(err, ErrConflict) {
			continue
		}
		break
	}
	if err != nil {
		return GameResponse{}, err
	}

	return s.view(ctx, game)
}

func (s *Service) createGame(ctx context.Context, userID string, mode Mode, in NewGame) (Game, error) {
	now := s.now()

	game := Game{
		HostUserID: userID,
		Mode:       mode,
		Status:     StatusLobby,
		Language:   in.Language,
		WordLength: in.WordLength,
	}

	if mode == ModeMultiplayer {
		code, err := NewRoomCode()
		if err != nil {
			return Game{}, err
		}
		game.Code = &code
	} else {
		game.Status = StatusActive
		game.StartedAt = &now
	}

	player := Player{UserID: userID, JoinedAt: now}

	// A lobby has no round yet; the word is drawn when the host starts it.
	var round *Round
	if game.Status == StatusActive {
		drawn, err := NewRound(game, 1, game.EndsAt)
		if err != nil {
			return Game{}, err
		}
		round = &drawn
	}

	if err := s.store.CreateGame(ctx, &game, &player, round); err != nil {
		return Game{}, err
	}

	return game, nil
}

// GameView reads a game back.
//
// This is what the app polls: the response is the same shape every other read
// returns, so a client that can render a created game can render this one.
func (s *Service) GameView(ctx context.Context, gameID, userID string) (GameResponse, error) {
	game, err := s.gameForPlayer(ctx, gameID, userID)
	if err != nil {
		return GameResponse{}, err
	}

	game, err = s.finishIfExpired(ctx, game)
	if err != nil {
		return GameResponse{}, err
	}

	return s.view(ctx, game)
}

// Guess records a guess and hands back the whole game.
//
// The whole game rather than just the new guess: the guess is not the only
// thing that changed — it may have ended the round, moved a score, or revealed
// the answer — and a client that re-renders from one response can never hold a
// half-updated board.
func (s *Service) Guess(ctx context.Context, gameID, userID, rawWord string) (GameResponse, error) {
	game, err := s.gameForPlayer(ctx, gameID, userID)
	if err != nil {
		return GameResponse{}, err
	}

	// Settled before the guess is looked at, so a game whose clock ran out while
	// the player was typing refuses the word rather than accepting a late one.
	game, err = s.finishIfExpired(ctx, game)
	if err != nil {
		return GameResponse{}, err
	}

	if err := s.recordGuess(ctx, game, userID, NormalizeGuess(rawWord)); err != nil {
		return GameResponse{}, err
	}

	game, err = s.store.Game(ctx, game.ID)
	if err != nil {
		return GameResponse{}, err
	}

	return s.view(ctx, game)
}

// recordGuess writes the guess, the score it earned, and the game's new state
// as one transaction.
//
// Everything it decides from is read inside that transaction rather than passed
// in, because every one of those reads is a race otherwise: two requests in
// flight at once would both see five guesses and both write a sixth.
func (s *Service) recordGuess(ctx context.Context, game Game, userID, word string) error {
	if !ValidGuess(word, game.WordLength) {
		return errBadGuess
	}

	return s.store.InTx(ctx, func(tx *Tx) error {
		// Re-read: the copy above was fetched before the write lock was taken,
		// and may describe a game that has since finished.
		current, err := tx.Game(game.ID)
		if err != nil {
			return err
		}
		if current.Status != StatusActive || current.HasExpired(s.now()) {
			return errGameNotActive
		}

		round, err := tx.LatestRound(current.ID)
		switch {
		case errors.Is(err, ErrNotFound):
			// An active game always has a round. If it somehow doesn't, there is
			// nothing to guess against, which is the same answer as a finished one.
			return errGameNotActive
		case err != nil:
			return err
		}

		mine, err := tx.PlayerGuesses(round.ID, userID)
		if err != nil {
			return err
		}

		if len(mine) >= MaxGuesses {
			return errOutOfGuesses
		}
		for _, previous := range mine {
			if previous.Word == round.Word {
				// Already found it. The round is over for this player whatever the
				// game as a whole is still doing.
				return errGameNotActive
			}
			if previous.Word == word {
				return errAlreadyGuessed
			}
		}

		number := len(mine) + 1
		err = tx.AddGuess(&Guess{
			RoundID: round.ID,
			UserID:  userID,
			Number:  number,
			Word:    word,
		})
		if err != nil {
			// The unique index on (round_id, user_id, number) rejected it, so
			// another request took this slot between the read above and here.
			if errors.Is(err, ErrConflict) {
				return errAlreadyGuessed
			}
			return err
		}

		// Scored against what this player already knew, which is why `mine` had to
		// be read inside the transaction: the same guess is worth more or less
		// depending on which guess of theirs it is.
		if points := ScoreGuess(word, round.Word, guessWords(mine)); points > 0 {
			if err := tx.AddScore(current.ID, userID, points); err != nil {
				return err
			}
		}

		// A solo game is over the moment its only player is: they found the word,
		// or they have just spent the last guess. A multiplayer game is not —
		// everyone else is still playing — so it stays open on its own clock.
		var status *Status
		if current.Mode == ModeSolo && (word == round.Word || number >= MaxGuesses) {
			finished := StatusFinished
			status = &finished
		}

		return tx.TouchGame(current.ID, status)
	})
}

// gameForPlayer reads a game the caller is actually in.
//
// Being in it is the whole of the permission model: there is nothing to see in
// a game you are not playing, and a solo game has exactly one player.
func (s *Service) gameForPlayer(ctx context.Context, gameID, userID string) (Game, error) {
	if gameID == "" {
		return Game{}, errGameNotFound
	}

	game, err := s.store.Game(ctx, gameID)
	switch {
	case errors.Is(err, ErrNotFound):
		return Game{}, errGameNotFound
	case err != nil:
		return Game{}, err
	}

	playing, err := s.store.IsPlayer(ctx, gameID, userID)
	if err != nil {
		return Game{}, err
	}
	if !playing {
		// Deliberately the same answer as a game that does not exist: whether an
		// id is real is not something a stranger gets to find out by asking.
		return Game{}, errGameNotFound
	}

	return game, nil
}

// finishIfExpired closes a game whose clock has run out.
//
// Nothing sweeps games in the background, so expiry is settled on read: whoever
// looks next is the one who writes it down. Solo games have no deadline, so for
// them this never fires.
func (s *Service) finishIfExpired(ctx context.Context, game Game) (Game, error) {
	if game.Status != StatusActive || !game.HasExpired(s.now()) {
		return game, nil
	}

	if err := s.store.FinishGame(ctx, game.ID); err != nil {
		return Game{}, err
	}

	return s.store.Game(ctx, game.ID)
}

// view gathers everything a client is shown about a game and hands it to the
// pure builder in dto.go.
func (s *Service) view(ctx context.Context, game Game) (GameResponse, error) {
	players, err := s.store.Scoreboard(ctx, game.ID)
	if err != nil {
		return GameResponse{}, err
	}

	round, err := s.store.LatestRound(ctx, game.ID)
	switch {
	case errors.Is(err, ErrNotFound):
		// A game in the lobby has no round yet.
		return newGameResponse(game, players, nil, nil, s.now()), nil
	case err != nil:
		return GameResponse{}, err
	}

	guesses, err := s.store.RoundGuesses(ctx, round.ID)
	if err != nil {
		return GameResponse{}, err
	}

	return newGameResponse(game, players, &round, guesses, s.now()), nil
}

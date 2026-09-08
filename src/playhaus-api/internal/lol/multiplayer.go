package lol

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/joincode"

	"github.com/google/uuid"
)

// LobbySettings is what the host gets to decide once the room exists.
type LobbySettings struct {
	Locale         i18n.Locale
	WordLength     int
	SecondsPerTurn int
}

func (in LobbySettings) validate() map[string]string {
	problems := map[string]string{}
	if !ValidWordLength(in.WordLength) {
		problems["wordLength"] = fmt.Sprintf("must be between %d and %d", MinWordLength, MaxWordLength)
	}
	return problems
}

func (in LobbySettings) normalised() LobbySettings {
	if !in.Locale.Valid() {
		in.Locale = i18n.Default
	}
	return in
}

type MultiplayerStore interface {
	CreateLobby(ctx context.Context, lobby *MultiplayerLeagueOfLettersLobby) error
	LobbyByCode(ctx context.Context, code string) (*MultiplayerLeagueOfLettersLobby, error)
	LobbyCodeTaken(ctx context.Context, code string) (bool, error)
	WaitingLobbyByOwnerID(ctx context.Context, userID string) (*MultiplayerLeagueOfLettersLobby, error)
	AbandonMultiplayerGame(ctx context.Context, gameID uuid.UUID) error
	AddLobbyPlayer(ctx context.Context, player *MultiplayerLobbyPlayer) error
	RemoveLobbyPlayer(ctx context.Context, code, userID string) error
	SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error
	SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error)
	DeleteLobby(ctx context.Context, code string) error
	DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error)
	StartLobby(ctx context.Context, lobby *MultiplayerLeagueOfLettersLobby, game *MultiplayerLeagueOfLettersGame) error
	MultiplayerGameByID(ctx context.Context, id uuid.UUID) (*MultiplayerLeagueOfLettersGame, error)
	MultiplayerGamesByUserID(ctx context.Context, userID string) ([]*MultiplayerLeagueOfLettersGame, error)
	DeleteMultiplayerGamesOlderThan(ctx context.Context, before time.Time) (int64, error)
	RecordMultiplayerGuess(ctx context.Context, in RecordMultiplayerGuessInput) error
	RestartTurn(ctx context.Context, gameID uuid.UUID, expectTurnUserID string, endsAt time.Time) error
}

// RecordMultiplayerGuessInput is one row going down, plus the game state it moved.
type RecordMultiplayerGuessInput struct {
	Guess *LeagueOfLettersGuess
	Game  *MultiplayerLeagueOfLettersGame

	ExpectTurnUserID string
	ExpectRound      int

	// ScoreFor and Score are who earned what. Zero for a turn that ran out.
	ScoreFor string
	Score    int
}

// CreateLobby opens a room and puts the caller in it as the host.
func (s *Service) CreateLobby(ctx context.Context, ownerID string, locale i18n.Locale) (*MultiplayerLeagueOfLettersLobby, error) {
	return s.openLobby(ctx, ownerID, locale, DefaultWordLength, DefaultSecondsPerTurn)
}

// openLobby is the room itself: a free code, a host in seat nought, and a length to sit at until somebody moves it.
func (s *Service) openLobby(ctx context.Context, ownerID string, locale i18n.Locale, wordLength int, secondsPerTurn int) (*MultiplayerLeagueOfLettersLobby, error) {
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
	lobby := &MultiplayerLeagueOfLettersLobby{
		ID:             code,
		OwnerID:        ownerID,
		Locale:         locale,
		WordLength:     wordLength,
		SecondsPerTurn: secondsPerTurn,
		Status:         LobbyWaiting,
		CreatedAt:      now,
		// The host is a player like any other, and the first one.
		Players: []MultiplayerLobbyPlayer{{LobbyID: code, UserID: ownerID, Seat: 0, JoinedAt: now}},
	}

	if err := s.store.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}

	return lobby, nil
}

// freeJoinCode is a free code for this game.
func (s *Service) freeJoinCode(ctx context.Context) (string, error) {
	return joincode.Free(ctx, joincode.LeagueOfLetters, s.store.LobbyCodeTaken)
}

// Lobby reads a room back by its code.
func (s *Service) Lobby(ctx context.Context, code string) (*MultiplayerLeagueOfLettersLobby, error) {
	return s.store.LobbyByCode(ctx, code)
}

// UpdateLobbySettings moves the room onto what the host has picked.
func (s *Service) UpdateLobbySettings(ctx context.Context, code, userID string, in LobbySettings) (*MultiplayerLeagueOfLettersLobby, map[string]string, error) {
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
	if problems := in.validate(); len(problems) > 0 {
		return nil, problems, nil
	}

	if err := s.store.SaveLobbySettings(ctx, code, in); err != nil {
		return nil, nil, fmt.Errorf("save lobby settings: %w", err)
	}

	lobby.Locale = in.Locale
	lobby.WordLength = in.WordLength
	lobby.SecondsPerTurn = in.SecondsPerTurn

	return lobby, nil, nil
}

// JoinLobby steps into somebody else's room, and is safe to call again on a room you are already in.
func (s *Service) JoinLobby(ctx context.Context, code, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}

	// Already in, which is the common case.
	if lobby.Has(userID) {
		return lobby, nil
	}

	// Checked after the membership test on purpose.
	if lobby.Status != LobbyWaiting {
		return nil, ErrLobbyStarted
	}
	if lobby.Full() {
		return nil, ErrLobbyFull
	}

	player := &MultiplayerLobbyPlayer{
		LobbyID:  lobby.ID,
		UserID:   userID,
		Seat:     lobby.NextSeat(),
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

// DeleteLobby closes a room for good.
func (s *Service) DeleteLobby(ctx context.Context, code, userID string) error {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		if err == ErrLobbyNotFound {
			return nil
		}
		return err
	}
	if lobby.OwnerID != userID {
		return ErrNotHost
	}

	return s.store.DeleteLobby(ctx, code)
}

// CurrentLobby is the room this player is still on the hook for.
func (s *Service) CurrentLobby(ctx context.Context, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	games, err := s.store.MultiplayerGamesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Newest first, and only the ones this player owns.
	for _, game := range games {
		if game.OwnerID != userID {
			continue
		}

		lobby, err := s.store.LobbyByCode(ctx, game.LobbyID)
		if err != nil {
			// A game whose room has been deleted is not one anybody can be sent back to -- the board is reached by its join code.
			if errors.Is(err, ErrLobbyNotFound) {
				continue
			}
			return nil, err
		}

		return lobby, nil
	}

	return s.store.WaitingLobbyByOwnerID(ctx, userID)
}

// AbandonLobby throws a room away for good, game and all.
func (s *Service) AbandonLobby(ctx context.Context, code, userID string) error {
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

	// The game first: a room deleted before its game was ended would leave a board running with no way for this call to find it again.
	if lobby.GameID != nil {
		if err := s.store.AbandonMultiplayerGame(ctx, *lobby.GameID); err != nil {
			return err
		}
	}

	return s.store.DeleteLobby(ctx, code)
}

// StartLobby turns a room into a game.
func (s *Service) StartLobby(ctx context.Context, code, userID string) (*MultiplayerLeagueOfLettersLobby, *MultiplayerLeagueOfLettersGame, error) {
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
	if len(lobby.Players) < MinLobbyPlayers {
		return nil, nil, ErrNotEnoughPlayers
	}

	// By seat, so the turn order is the order people walked in and the host.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b MultiplayerLobbyPlayer) int { return a.Seat - b.Seat })

	now := time.Now().UTC()
	game := &MultiplayerLeagueOfLettersGame{
		ID:              uuid.New(),
		LobbyID:         lobby.ID,
		OwnerID:         lobby.OwnerID,
		Locale:          lobby.Locale,
		WordLength:      lobby.WordLength,
		CurrentRound:    1,
		Status:          GameInProgress,
		CreatedAt:       now,
		TurnUserID:      seated[0].UserID,
		TurnEndsAt:      now.Add(time.Duration(lobby.SecondsPerTurn) * time.Second),
		SecondsPerGuess: lobby.SecondsPerTurn,
	}

	game.Players = make([]MultiplayerGamePlayer, len(seated))
	for i, player := range seated {
		game.Players[i] = MultiplayerGamePlayer{
			GameID:    game.ID,
			UserID:    player.UserID,
			TurnOrder: i,
			Score:     0,
		}
	}

	rounds, err := s.generateRounds(game.ID, RoundsFor(len(seated)), game.WordLength, game.Locale, multiplayerCommonWordsOnly)
	if err != nil {
		return nil, nil, err
	}
	game.Rounds = rounds

	if err := s.store.StartLobby(ctx, lobby, game); err != nil {
		return nil, nil, fmt.Errorf("start lobby: %w", err)
	}

	lobby.Status = LobbyStarted
	lobby.GameID = &game.ID

	return lobby, game, nil
}

// Rematch opens a fresh room for the table that just finished a game, and answers it.
func (s *Service) Rematch(ctx context.Context, code, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if lobby.OwnerID != userID {
		return nil, ErrNotHost
	}

	// Already opened, which is what a double-tapped button looks like from here.
	if lobby.RematchCode != nil {
		next, err := s.store.LobbyByCode(ctx, *lobby.RematchCode)
		if err == nil {
			return next, nil
		}
		if !errors.Is(err, ErrLobbyNotFound) {
			return nil, err
		}
		// The room it pointed at has since been closed.
	}

	// There has to be a game, and it has to be over.
	if lobby.GameID == nil {
		return nil, ErrGameNotOver
	}
	game, err := s.store.MultiplayerGameByID(ctx, *lobby.GameID)
	if err != nil {
		return nil, err
	}
	if game.Status == GameInProgress {
		return nil, ErrGameNotOver
	}

	next, err := s.openLobby(ctx, userID, lobby.Locale, lobby.WordLength, lobby.SecondsPerTurn)
	if err != nil {
		return nil, err
	}

	claimed, err := s.store.SaveRematchCode(ctx, lobby.ID, next.ID)
	if err != nil {
		return nil, fmt.Errorf("save rematch code: %w", err)
	}
	if !claimed {
		// Two presses that both got past the check above.
		_ = s.store.DeleteLobby(ctx, next.ID)

		settled, err := s.store.LobbyByCode(ctx, lobby.ID)
		if err != nil {
			return nil, err
		}
		if settled.RematchCode == nil {
			return nil, fmt.Errorf("rematch for lobby %s was claimed but is not recorded", lobby.ID)
		}

		return s.store.LobbyByCode(ctx, *settled.RematchCode)
	}

	return next, nil
}

// MultiplayerGame reads a game back for one of its players.
func (s *Service) MultiplayerGame(ctx context.Context, id uuid.UUID, userID string) (*MultiplayerLeagueOfLettersGame, error) {
	game, err := s.store.MultiplayerGameByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !game.Has(userID) {
		return nil, ErrGameNotFound
	}
	return game, nil
}

// MultiplayerGamesByUserID is every unfinished game this player is at a table for.
func (s *Service) MultiplayerGamesByUserID(ctx context.Context, userID string) ([]*MultiplayerLeagueOfLettersGame, error) {
	return s.store.MultiplayerGamesByUserID(ctx, userID)
}

type SubmitMultiplayerGuessInput struct {
	GameID uuid.UUID
	UserID string
	Word   string
}

// MultiplayerGuessOutcome is what one row did, and where it left the game.
type MultiplayerGuessOutcome struct {
	Game  *MultiplayerLeagueOfLettersGame
	Guess *LeagueOfLettersGuess

	Solved    bool
	RoundOver bool
	GameOver  bool

	// Word is the answer, told only once the round it belonged to is over.
	Word string
	// RoundNumber is the round the guess was played into.
	RoundNumber int
}

// SubmitMultiplayerGuess plays one word into the game's current round.
func (s *Service) SubmitMultiplayerGuess(ctx context.Context, in SubmitMultiplayerGuessInput) (*MultiplayerGuessOutcome, error) {
	game, err := s.MultiplayerGame(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	if game.Status != GameInProgress {
		return nil, ErrGameFinished
	}
	if game.TurnUserID != in.UserID {
		return nil, ErrNotYourTurn
	}

	round := game.round(game.CurrentRound)
	if round == nil {
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
		OwnerID:     in.UserID,
		Word:        word,
		GuessNumber: len(round.Guesses) + 1,
		Letters:     validatedLetters(word, round.Word),
		CreatedAt:   time.Now().UTC(),
	}

	// Scored against what the round had revealed before this row.
	score := DetermineScore(*guess, round.Guesses, round.FirstLetter())

	return s.recordTurn(ctx, game, round, guess, in.UserID, score)
}

// SkipTurn is what the clock calls: the row goes down blank and play moves on.
func (s *Service) SkipTurn(ctx context.Context, gameID uuid.UUID) (*MultiplayerGuessOutcome, error) {
	game, err := s.store.MultiplayerGameByID(ctx, gameID)
	if err != nil {
		return nil, err
	}
	if game.Status != GameInProgress {
		return nil, ErrGameFinished
	}

	round := game.round(game.CurrentRound)
	if round == nil {
		return nil, fmt.Errorf("game %s has no round %d", game.ID, game.CurrentRound)
	}
	if round.IsOver() {
		return nil, ErrRoundClosed
	}

	guess := &LeagueOfLettersGuess{
		ID:          uuid.New(),
		RoundID:     round.ID,
		OwnerID:     game.TurnUserID,
		Word:        "",
		GuessNumber: len(round.Guesses) + 1,
		Skipped:     true,
		CreatedAt:   time.Now().UTC(),
	}

	// No score, and no scorer: nothing was learned, so there is nothing to pay for.
	return s.recordTurn(ctx, game, round, guess, "", 0)
}

// recordTurn is the half a guess and a timeout have in common: lay the row down, move the game on, write both.
func (s *Service) recordTurn(
	ctx context.Context,
	game *MultiplayerLeagueOfLettersGame,
	round *LeagueOfLettersRound,
	guess *LeagueOfLettersGuess,
	scoreFor string,
	score int,
) (*MultiplayerGuessOutcome, error) {
	expectTurn, expectRound := game.TurnUserID, game.CurrentRound

	// Appended before advance is asked anything.
	round.Guesses = append(round.Guesses, *guess)

	solved := guess.Correct()
	roundOver := round.IsOver()

	outcome := &MultiplayerGuessOutcome{
		Game:        game,
		Guess:       guess,
		Solved:      solved,
		RoundOver:   roundOver,
		RoundNumber: game.CurrentRound,
	}
	if roundOver {
		outcome.Word = round.Word
	}

	game.advance(time.Now().UTC())
	outcome.GameOver = game.Status == GameCompleted

	if scoreFor != "" && score != 0 {
		game.addScore(scoreFor, score)
	}

	err := s.store.RecordMultiplayerGuess(ctx, RecordMultiplayerGuessInput{
		Guess:            guess,
		Game:             game,
		ExpectTurnUserID: expectTurn,
		ExpectRound:      expectRound,
		ScoreFor:         scoreFor,
		Score:            score,
	})
	if err != nil {
		return nil, err
	}

	return outcome, nil
}

// ResumeTurn restarts the clock on a game whose deadline passed while nobody was connected.
func (s *Service) ResumeTurn(ctx context.Context, gameID uuid.UUID) (time.Time, error) {
	game, err := s.store.MultiplayerGameByID(ctx, gameID)
	if err != nil {
		return time.Time{}, err
	}
	if game.Status != GameInProgress {
		return time.Time{}, ErrGameFinished
	}

	now := time.Now().UTC()
	if game.TurnEndsAt.After(now) {
		return game.TurnEndsAt, nil
	}

	endsAt := now.Add(time.Duration(game.SecondsPerGuess) * time.Second)
	if err := s.store.RestartTurn(ctx, game.ID, game.TurnUserID, endsAt); err != nil {
		return time.Time{}, err
	}

	return endsAt, nil
}

// advance moves the game on after a row has been laid down.
func (g *MultiplayerLeagueOfLettersGame) advance(now time.Time) {
	round := g.round(g.CurrentRound)

	if round != nil && round.IsOver() {
		if g.CurrentRound >= len(g.Rounds) {
			g.Status = GameCompleted
			g.TurnEndsAt = now
			return
		}

		g.CurrentRound++
		g.TurnUserID = g.opener(g.CurrentRound)
	} else {
		g.TurnUserID = g.playerAfter(g.TurnUserID)
	}

	g.TurnEndsAt = now.Add(time.Duration(g.SecondsPerGuess) * time.Second)
}

// seats is the table in turn order.
func (g *MultiplayerLeagueOfLettersGame) seats() []MultiplayerGamePlayer {
	seated := slices.Clone(g.Players)
	slices.SortFunc(seated, func(a, b MultiplayerGamePlayer) int { return a.TurnOrder - b.TurnOrder })
	return seated
}

// opener is who goes first in a round.
func (g *MultiplayerLeagueOfLettersGame) opener(roundNumber int) string {
	seated := g.seats()
	if len(seated) == 0 {
		return ""
	}
	return seated[OpenerSeat(roundNumber, len(seated))].UserID
}

// playerAfter is whose turn it is once userID has had theirs.
func (g *MultiplayerLeagueOfLettersGame) playerAfter(userID string) string {
	seated := g.seats()
	if len(seated) == 0 {
		return ""
	}

	for i, player := range seated {
		if player.UserID == userID {
			return seated[SeatAfter(i, len(seated))].UserID
		}
	}

	// The player whose turn it was is no longer at the table.
	return seated[0].UserID
}

// Has reports whether someone is at this table.
func (g *MultiplayerLeagueOfLettersGame) Has(userID string) bool {
	for _, player := range g.Players {
		if player.UserID == userID {
			return true
		}
	}
	return false
}

// Score is what one player has earned.
func (g *MultiplayerLeagueOfLettersGame) Score(userID string) int {
	for _, player := range g.Players {
		if player.UserID == userID {
			return player.Score
		}
	}
	return 0
}

func (g *MultiplayerLeagueOfLettersGame) addScore(userID string, score int) {
	for i := range g.Players {
		if g.Players[i].UserID == userID {
			g.Players[i].Score += score
			return
		}
	}
}

func (g *MultiplayerLeagueOfLettersGame) round(number int) *LeagueOfLettersRound {
	for i := range g.Rounds {
		if g.Rounds[i].RoundNumber == number {
			return &g.Rounds[i]
		}
	}
	return nil
}

// Round is the round being played, or nil on a game that has none left.
func (g *MultiplayerLeagueOfLettersGame) Round(number int) *LeagueOfLettersRound {
	return g.round(number)
}

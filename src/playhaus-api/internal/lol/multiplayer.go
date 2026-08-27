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

// LobbySettings is what the host gets to decide once the room exists -- the same two
// knobs a solo game is set up with, so the room can reuse the app's word-length card
// and language list rather than growing its own.
//
// Not what a room is opened with: see CreateLobby. Opening a room and deciding what
// it plays are two different moments, and only the second one has a host sitting in
// front of the settings card.
type LobbySettings struct {
	Locale     i18n.Locale
	WordLength int
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
	StartLobby(ctx context.Context, lobby *MultiplayerLeagueOfLettersLobby, game *MultiplayerLeagueOfLettersGame) error
	MultiplayerGameByID(ctx context.Context, id uuid.UUID) (*MultiplayerLeagueOfLettersGame, error)
	MultiplayerGamesByUserID(ctx context.Context, userID string) ([]*MultiplayerLeagueOfLettersGame, error)
	RecordMultiplayerGuess(ctx context.Context, in RecordMultiplayerGuessInput) error
	RestartTurn(ctx context.Context, gameID uuid.UUID, expectTurnUserID string, endsAt time.Time) error
}

// RecordMultiplayerGuessInput is one row going down, plus the game state it moved.
//
// The Expect fields are what the game looked like when the caller read it. The
// write is conditional on them still being true, which is what stops a guess and
// the turn timeout that raced it from both being applied.
type RecordMultiplayerGuessInput struct {
	Guess *LeagueOfLettersGuess
	Game  *MultiplayerLeagueOfLettersGame

	ExpectTurnUserID string
	ExpectRound      int

	// ScoreFor and Score are who earned what. Zero for a turn that ran out.
	ScoreFor string
	Score    int
}

// ---------------------------------------------------------------------------
// Lobbies
// ---------------------------------------------------------------------------

// CreateLobby opens a room and puts the caller in it as the host.
//
// Takes a language and nothing else. A room is opened the moment its host walks onto
// the screen -- there has to be a code before there is anything to share -- which is
// well before anybody has been asked what to play. So the room starts at
// DefaultWordLength and the host moves it from the settings card, through
// StartLobby draws the words with it.
//
// The language is not much of a decision here either: it is the host's own, and it is
// asked for at all only so a room opens in the language its host plays in rather than
// always in Dutch.
//
// Answers the whole lobby rather than just a code: the screen needs the code to
// show, the player list to draw and its own id back to know it is the host, and one
// of the three arriving later than the others would be a room that appears in
// pieces.
func (s *Service) CreateLobby(ctx context.Context, ownerID string, locale i18n.Locale) (*MultiplayerLeagueOfLettersLobby, error) {
	return s.openLobby(ctx, ownerID, locale, DefaultWordLength)
}

// openLobby is the room itself: a free code, a host in seat nought, and a length to
// sit at until somebody moves it.
//
// Shared with Rematch, which opens a room exactly this way but carries the last one's
// length in rather than starting over at the default -- that table has already agreed
// what it is playing, and asking again is the setup the button exists to skip.
func (s *Service) openLobby(ctx context.Context, ownerID string, locale i18n.Locale, wordLength int) (*MultiplayerLeagueOfLettersLobby, error) {
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
		ID:         code,
		OwnerID:    ownerID,
		Locale:     locale,
		WordLength: wordLength,
		Status:     LobbyWaiting,
		CreatedAt:  now,
		// The host is a player like any other, and the first one -- which is what
		// makes them the top row of the list and the first to play.
		Players: []MultiplayerLobbyPlayer{{LobbyID: code, UserID: ownerID, Seat: 0, JoinedAt: now}},
	}

	if err := s.store.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}

	return lobby, nil
}

// freeJoinCode is a free code for this game, which is joincode.Free with the one thing
// this package can contribute to the question handed to it.
//
// Uniqueness lives here rather than there because the code is this table's primary key:
// only the lobby store can say whether a room already answers to one. Everything else --
// the draw, the alphabet, the retry, the L on the front -- is the same for every game
// and belongs to nobody in particular.
func (s *Service) freeJoinCode(ctx context.Context) (string, error) {
	return joincode.Free(ctx, joincode.LeagueOfLetters, s.store.LobbyCodeTaken)
}

// Lobby reads a room back by its code.
func (s *Service) Lobby(ctx context.Context, code string) (*MultiplayerLeagueOfLettersLobby, error) {
	return s.store.LobbyByCode(ctx, code)
}

// UpdateLobbySettings moves the room onto what the host has picked. Host only.
//
// Answers the whole room rather than the settings back, because this is what the rest
// of the table is shown: the same snapshot a join or a leave produces, so whatever
// draws the room screen does not need a second shape for "the settings changed".
//
// Refused while a game is running -- the words have already been drawn by then, so a
// length changed now would be a settings card disagreeing with the board.
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

	// Answered from what was just written rather than read back: the store has the
	// same two fields, and a second query is a second chance to disagree with it.
	lobby.Locale = in.Locale
	lobby.WordLength = in.WordLength

	return lobby, nil, nil
}

// JoinLobby steps into somebody else's room, and is safe to call again on a room
// you are already in -- reopening the screen must not be a second seat.
func (s *Service) JoinLobby(ctx context.Context, code, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}

	// Already in, which is the common case: anyone who backgrounded the app and
	// came back lands here, and so does the host arriving on the room screen.
	if lobby.Has(userID) {
		return lobby, nil
	}

	// Checked after the membership test on purpose -- somebody already in a started
	// game is coming back to it, not trying to join one.
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

// LeaveLobby gives a seat back without closing the room. A room that is already
// gone is a no-op rather than a refusal: the screen fires this on its way out,
// where there is nobody left to tell.
func (s *Service) LeaveLobby(ctx context.Context, code, userID string) error {
	return s.store.RemoveLobbyPlayer(ctx, code, userID)
}

// DeleteLobby closes a room for good. Host only, and a code that is already gone
// is a no-op for the same reason LeaveLobby is.
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

// CurrentLobby is the room this player is still on the hook for: one whose game is
// being played, or failing that one they opened and nobody has started.
//
// The multiplayer half of CurrentSoloGame, and it exists for the same reason -- the
// room screen opens a fresh lobby the moment its host walks onto it, so without this
// a host who still has something running is given a second room rather than asked
// about the first.
//
// The game is preferred over the waiting room when a host somehow has both: other
// people are sitting at it, which an empty room nobody has joined cannot say.
//
// Answers ErrLobbyNotFound when there is nothing to come back to, which is the
// ordinary case.
func (s *Service) CurrentLobby(ctx context.Context, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	games, err := s.store.MultiplayerGamesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Newest first, and only the ones this player owns: being at somebody else's
	// table is not something opening a room of your own would disturb.
	for _, game := range games {
		if game.OwnerID != userID {
			continue
		}

		lobby, err := s.store.LobbyByCode(ctx, game.LobbyID)
		if err != nil {
			// A game whose room has been deleted is not one anybody can be sent back
			// to -- the board is reached by its join code. Keep looking.
			if errors.Is(err, ErrLobbyNotFound) {
				continue
			}
			return nil, err
		}

		return lobby, nil
	}

	return s.store.WaitingLobbyByOwnerID(ctx, userID)
}

// AbandonLobby throws a room away for good, game and all. Host only.
//
// The difference from DeleteLobby is the game: that one deliberately leaves a started
// room's game alone, because it is only ever the host stepping out of a room they are
// finished with. This is the host saying they are finished with the game itself, so
// the table is told and the board stops being something anybody can play.
//
// A code that is already gone is a no-op rather than a refusal, for the same reason
// it is on DeleteLobby: the screen that calls this has just been told the room exists,
// and being right a moment too late is not an error worth showing anybody.
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

	// The game first: a room deleted before its game was ended would leave a board
	// running with no way for this call to find it again.
	if lobby.GameID != nil {
		if err := s.store.AbandonMultiplayerGame(ctx, *lobby.GameID); err != nil {
			return err
		}
	}

	return s.store.DeleteLobby(ctx, code)
}

// StartLobby turns a room into a game. Host only.
//
// Membership is settled here: whoever is in the room at this moment is who plays,
// in the order they arrived, and that order is the turn order for the whole game.
//
// So are the settings. The room's word length has been sitting on the lobby since it
// opened, moving under the host's finger; this is the first and only moment anything
// reads it, because it is the moment the words are drawn.
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

	// By seat, so the turn order is the order people walked in and the host -- who
	// has seat nought by construction -- is always up first.
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
		TurnEndsAt:      now.Add(DefaultSecondsPerTurn * time.Second),
		SecondsPerGuess: DefaultSecondsPerTurn,
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
//
// A new room rather than the old one wound back, and the difference is who ends up in
// it. A room that was reset would still be holding everybody who was at the table when
// the last word went down, including whoever shut the app on it -- so the host would be
// looking at a roster of people who are not coming back, and a start button that needs
// them. A new code is joined by whoever actually turns up.
//
// The settings are read off the old room rather than taken from the caller. This table
// has already agreed what it is playing; the whole point of the button is to skip the
// part where they decide.
func (s *Service) Rematch(ctx context.Context, code, userID string) (*MultiplayerLeagueOfLettersLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if lobby.OwnerID != userID {
		return nil, ErrNotHost
	}

	// Already opened, which is what a double-tapped button looks like from here: answer
	// with the room the rest of the table has been sent to rather than opening a second
	// one beside it and splitting them between two codes.
	if lobby.RematchCode != nil {
		next, err := s.store.LobbyByCode(ctx, *lobby.RematchCode)
		if err == nil {
			return next, nil
		}
		if !errors.Is(err, ErrLobbyNotFound) {
			return nil, err
		}
		// The room it pointed at has since been closed. Falling through opens another,
		// because the alternative is a table that can never play again.
	}

	// There has to be a game, and it has to be over. Reopening a room mid-game would be
	// the host inviting players elsewhere while they are still sitting at the board.
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

	next, err := s.openLobby(ctx, userID, lobby.Locale, lobby.WordLength)
	if err != nil {
		return nil, err
	}

	claimed, err := s.store.SaveRematchCode(ctx, lobby.ID, next.ID)
	if err != nil {
		return nil, fmt.Errorf("save rematch code: %w", err)
	}
	if !claimed {
		// Two presses that both got past the check above. The room this one just opened
		// has nobody in it and nobody has been told about it, so it goes straight back
		// and the winner is answered with instead.
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

// ---------------------------------------------------------------------------
// The game
// ---------------------------------------------------------------------------

// MultiplayerGame reads a game back for one of its players. Somebody who is not in
// it gets the same answer as somebody asking about a game that does not exist --
// being at the table is the whole of the permission model.
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
	// RoundNumber is the round the guess was played into, which is not the round
	// the game is on afterwards if this guess ended it.
	RoundNumber int
}

// SubmitMultiplayerGuess plays one word into the game's current round.
//
// The solo path checks you own the game; this one checks it is your turn. From the
// validation down they are the same rules, scored by the same functions -- a board
// is a board.
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

	// Scored against what the round had revealed before this row, which on a shared
	// board is what the whole table already knew. Same function as solo: the scale
	// pays for information, and information here is public.
	score := DetermineScore(*guess, round.Guesses)

	return s.recordTurn(ctx, game, round, guess, in.UserID, score)
}

// SkipTurn is what the clock calls: the row goes down blank and play moves on.
//
// Takes no user id -- whoever's turn it was is on the game -- so a timeout cannot
// be attributed to the wrong player, and a caller cannot skip somebody else.
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

// recordTurn is the half a guess and a timeout have in common: lay the row down,
// move the game on, write both.
//
// One function rather than two so the two paths cannot drift -- a rule about when a
// round ends that held for a guess but not for a timeout would be a game that ends
// differently depending on whether anybody was paying attention.
func (s *Service) recordTurn(
	ctx context.Context,
	game *MultiplayerLeagueOfLettersGame,
	round *LeagueOfLettersRound,
	guess *LeagueOfLettersGuess,
	scoreFor string,
	score int,
) (*MultiplayerGuessOutcome, error) {
	expectTurn, expectRound := game.TurnUserID, game.CurrentRound

	// Appended before advance is asked anything: whether the round is over is a
	// question about the board with this row already on it.
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

// ResumeTurn restarts the clock on a game whose deadline passed while nobody was
// connected, and reports when the current turn now runs out.
//
// The turn timer lives on a socket room, and a room with nobody in it is reaped --
// so a table that all got up and walked away comes back to a deadline in the past.
// Replaying it would burn every turn between then and now at once, which is a
// punishment for the server having had nothing to do. The turn is given back
// instead, whole.
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

// ---------------------------------------------------------------------------
// Turn order
// ---------------------------------------------------------------------------

// advance moves the game on after a row has been laid down.
//
// Three outcomes, in order: the game ends, the round ends and the next one opens,
// or the same round carries on with the next player up. Whichever it is, the clock
// is reset -- a turn is thirty-five seconds from the moment it becomes yours.
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
//
// Rotated by round rather than fixed, so that going first -- which on a fresh board
// is the turn that learns the least -- is shared out instead of always landing on
// the host.
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

	// The player whose turn it was is no longer at the table. Cannot happen today
	// -- membership is frozen at kickoff -- but falling back to the opener keeps a
	// game playable rather than stuck on a turn nobody can take.
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

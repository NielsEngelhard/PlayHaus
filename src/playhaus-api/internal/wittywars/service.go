package wittywars

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"slices"
	"time"

	"github.com/google/uuid"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/joincode"
)

// LobbySettings is what the host gets to decide once the room exists.
type LobbySettings struct {
	GameMode         WWGameMode
	Locale           i18n.Locale
	AnswersPerPlayer int
}

func (in LobbySettings) validate() map[string]string {
	problems := map[string]string{}
	if !in.GameMode.Valid() {
		problems["gameMode"] = fmt.Sprintf("must be %q, %q or %q", GameModeFamily, GameModeRude, GameModeCaliente)
	}
	if !ValidAnswersPerPlayer(in.AnswersPerPlayer) {
		problems["answersPerPlayer"] = fmt.Sprintf("must be between %d and %d", MinAnswersPerPlayer, MaxAnswersPerPlayer)
	}
	return problems
}

func (in LobbySettings) normalised() LobbySettings {
	if !in.Locale.Valid() {
		in.Locale = i18n.Default
	}
	if in.AnswersPerPlayer == 0 {
		in.AnswersPerPlayer = DefaultAnswersPerPlayer
	}
	return in
}

// DefaultGameMode is what a room plays until its host says otherwise.
const DefaultGameMode = GameModeFamily

// answersPerPlayer falls back to the default for a stored value out of range.
func answersPerPlayer(stored int) int {
	if !ValidAnswersPerPlayer(stored) {
		return DefaultAnswersPerPlayer
	}
	return stored
}

// Store is declared next to its consumer, as everywhere else in this codebase.
type Store interface {
	// The room
	CreateLobby(ctx context.Context, lobby *WWLobby) error
	LobbyByCode(ctx context.Context, code string) (*WWLobby, error)
	LobbyCodeTaken(ctx context.Context, code string) (bool, error)
	WaitingLobbyByOwnerID(ctx context.Context, userID string) (*WWLobby, error)
	AddLobbyPlayer(ctx context.Context, player *WWLobbyPlayer) error
	RemoveLobbyPlayer(ctx context.Context, code, userID string) error
	SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error
	SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error)
	DeleteLobby(ctx context.Context, code string) error
	DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error)

	// The game
	StartLobby(ctx context.Context, lobby *WWLobby, game *WWMultiDeviceGame) error
	GameByID(ctx context.Context, id uuid.UUID) (*WWMultiDeviceGame, error)
	GamesByUserID(ctx context.Context, userID string) ([]*WWMultiDeviceGame, error)
	AbandonGame(ctx context.Context, gameID uuid.UUID) error
	DeleteGamesOlderThan(ctx context.Context, before time.Time) (int64, error)

	// Playing it
	SaveAnswers(ctx context.Context, gameID uuid.UUID, options []WWOption) (int, error)
	OpenVoting(ctx context.Context, gameID uuid.UUID, slots []SlotAssignment) (bool, error)
	RecordVote(ctx context.Context, in RecordVoteInput) (*RecordVoteResult, error)
	AdvanceRound(ctx context.Context, in AdvanceRoundInput) (bool, error)
}

// SlotAssignment is where one answer is to be shown once voting opens.
type SlotAssignment struct {
	RoundID  uuid.UUID
	AuthorID string
	Slot     int
}

// RecordVoteInput is one vote going down, and what it pays out.
type RecordVoteInput struct {
	GameID      uuid.UUID
	Vote        *WWVote
	RoundNumber int

	TotalRounds  int
	VotersNeeded int

	// AuthorIDs are paid VotePoints each: everybody who wrote the answer in the slot that was picked.
	AuthorIDs []string
}

// RecordVoteResult is where the vote left the game.
type RecordVoteResult struct {
	Votes     int
	RoundOver bool
	LastRound bool
}

// AdvanceRoundInput is the reveal being left behind, named by the round it is showing.
type AdvanceRoundInput struct {
	GameID      uuid.UUID
	RoundNumber int
	TotalRounds int
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

// SweepConfig is how long the two kinds of row are kept.
type SweepConfig struct {
	LobbyAge time.Duration
	GameAge  time.Duration
}

// SweepStale deletes old rooms and games on a ticker until ctx is cancelled.
func (s *Service) SweepStale(ctx context.Context, cfg SweepConfig, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now().UTC()

			if deleted, err := s.store.DeleteLobbiesOlderThan(ctx, now.Add(-cfg.LobbyAge)); err != nil {
				log.Error("sweep stale witty wars lobbies", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale witty wars lobbies", "deleted", deleted)
			}

			if deleted, err := s.store.DeleteGamesOlderThan(ctx, now.Add(-cfg.GameAge)); err != nil {
				log.Error("sweep stale witty wars games", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale witty wars games", "deleted", deleted)
			}
		}
	}
}

// CreateLobby opens a room on a mode and puts the caller in it as the host; an empty mode is the default.
func (s *Service) CreateLobby(ctx context.Context, ownerID string, locale i18n.Locale, mode WWGameMode) (*WWLobby, error) {
	return s.openLobby(ctx, ownerID, locale, mode, DefaultAnswersPerPlayer)
}

func (s *Service) openLobby(ctx context.Context, ownerID string, locale i18n.Locale, mode WWGameMode, answers int) (*WWLobby, error) {
	if ownerID == "" {
		return nil, fmt.Errorf("create lobby: %w: missing owner", ErrInvalidInput)
	}
	if !locale.Valid() {
		locale = i18n.Default
	}
	if !mode.Valid() {
		mode = DefaultGameMode
	}

	code, err := joincode.Free(ctx, joincode.WittyWars, s.store.LobbyCodeTaken)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	lobby := &WWLobby{
		ID:               code,
		OwnerID:          ownerID,
		Locale:           locale,
		GameMode:         mode,
		AnswersPerPlayer: answersPerPlayer(answers),
		Status:           LobbyWaiting,
		Players:          []WWLobbyPlayer{{LobbyID: code, UserID: ownerID, Seat: 0, JoinedAt: now}},
		CreatedAt:        now,
	}

	if err := s.store.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}
	return lobby, nil
}

// Lobby reads a room back by its code.
func (s *Service) Lobby(ctx context.Context, code string) (*WWLobby, error) {
	return s.store.LobbyByCode(ctx, code)
}

// UpdateLobbySettings moves the room onto what the host has picked.
func (s *Service) UpdateLobbySettings(ctx context.Context, code, userID string, in LobbySettings) (*WWLobby, map[string]string, error) {
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
	lobby.GameMode = in.GameMode
	lobby.AnswersPerPlayer = in.AnswersPerPlayer

	return lobby, nil, nil
}

// JoinLobby steps into somebody else's room, and is safe to call again on a room you are already in.
func (s *Service) JoinLobby(ctx context.Context, code, userID string) (*WWLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if lobby.Has(userID) {
		return lobby, nil
	}
	if lobby.Status != LobbyWaiting {
		return nil, ErrLobbyStarted
	}
	if lobby.Full() {
		return nil, ErrLobbyFull
	}

	player := &WWLobbyPlayer{
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
		if errors.Is(err, ErrLobbyNotFound) {
			return nil
		}
		return err
	}
	if lobby.OwnerID != userID {
		return ErrNotHost
	}
	return s.store.DeleteLobby(ctx, code)
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

	// The game first, or a board would be left running that this call can no longer find.
	if lobby.GameID != nil {
		if err := s.store.AbandonGame(ctx, *lobby.GameID); err != nil {
			return err
		}
	}
	return s.store.DeleteLobby(ctx, code)
}

// CurrentLobby is the room this player is still on the hook for.
func (s *Service) CurrentLobby(ctx context.Context, userID string) (*WWLobby, error) {
	games, err := s.store.GamesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	for _, game := range games {
		if game.OwnerID != userID {
			continue
		}
		lobby, err := s.store.LobbyByCode(ctx, game.LobbyID)
		if err != nil {
			if errors.Is(err, ErrLobbyNotFound) {
				continue
			}
			return nil, err
		}
		return lobby, nil
	}

	return s.store.WaitingLobbyByOwnerID(ctx, userID)
}

// StartLobby turns a room into a game.
func (s *Service) StartLobby(ctx context.Context, code, userID string) (*WWLobby, *WWMultiDeviceGame, error) {
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
	if len(lobby.Players) > MaxLobbyPlayers {
		return nil, nil, ErrTooManyPlayers
	}

	// By seat before the shuffle, so the shuffle starts from a defined order.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b WWLobbyPlayer) int { return a.Seat - b.Seat })
	rand.Shuffle(len(seated), func(i, j int) { seated[i], seated[j] = seated[j], seated[i] })

	answers := answersPerPlayer(lobby.AnswersPerPlayer)
	lines, err := GetContentLines(lobby.Locale, lobby.GameMode, RoundsFor(len(seated), answers))
	if err != nil {
		return nil, nil, fmt.Errorf("draw prompts: %w", err)
	}

	now := time.Now().UTC()
	game := &WWMultiDeviceGame{
		ID:               uuid.New(),
		LobbyID:          lobby.ID,
		OwnerID:          lobby.OwnerID,
		Locale:           lobby.Locale,
		GameMode:         lobby.GameMode,
		AnswersPerPlayer: answers,
		Phase:            PhaseWriting,
		CurrentRound:     1,
		Status:           GameInProgress,
		CreatedAt:        now,
	}

	game.Players = make([]WWGamePlayer, len(seated))
	for i, player := range seated {
		game.Players[i] = WWGamePlayer{GameID: game.ID, UserID: player.UserID, TurnOrder: i}
	}

	pairs := DealSeats(len(seated), answers)
	game.Rounds = make([]WWRound, len(lines))
	for i, line := range lines {
		number := i + 1
		seats := pairs[i]

		round := WWRound{
			ID:              uuid.New(),
			GameID:          game.ID,
			Number:          number,
			Line:            line,
			AuthorOneUserID: seated[seats[0]].UserID,
			AuthorTwoUserID: seated[seats[1]].UserID,
			CreatedAt:       now,
		}
		// Anybody at the table, the writers included.
		if HasPlaceholder(line) {
			round.SubjectUserID = seated[rand.IntN(len(seated))].UserID
		}

		game.Rounds[i] = round
	}

	if err := s.store.StartLobby(ctx, lobby, game); err != nil {
		return nil, nil, fmt.Errorf("start lobby: %w", err)
	}

	lobby.Status = LobbyStarted
	lobby.GameID = &game.ID

	return lobby, game, nil
}

// Rematch opens a fresh room for the table that just finished, and answers it.
func (s *Service) Rematch(ctx context.Context, code, userID string) (*WWLobby, error) {
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
	}

	if lobby.GameID == nil {
		return nil, ErrGameNotOver
	}
	game, err := s.store.GameByID(ctx, *lobby.GameID)
	if err != nil {
		return nil, err
	}
	if game.Status == GameInProgress {
		return nil, ErrGameNotOver
	}

	next, err := s.openLobby(ctx, userID, lobby.Locale, lobby.GameMode, lobby.AnswersPerPlayer)
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

// Game reads a game back for one of its players.
func (s *Service) Game(ctx context.Context, id uuid.UUID, userID string) (*WWMultiDeviceGame, error) {
	game, err := s.store.GameByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !game.Has(userID) {
		return nil, ErrGameNotFound
	}
	return game, nil
}

// GamesByUserID is every unfinished game this player is at a table for.
func (s *Service) GamesByUserID(ctx context.Context, userID string) ([]*WWMultiDeviceGame, error) {
	return s.store.GamesByUserID(ctx, userID)
}

// RoundAnswer is one answer inside a batch.
type RoundAnswer struct {
	RoundNumber int
	Answer      string
}

type SubmitAnswersInput struct {
	GameID  uuid.UUID
	UserID  string
	Answers []RoundAnswer
}

// AnswerOutcome is what one batch did, and where it left the game.
type AnswerOutcome struct {
	Game     *WWMultiDeviceGame
	Answered int
	Expected int
	// VotingOpened is true for exactly one caller: whoever sent the last batch.
	VotingOpened bool
}

// SubmitAnswers files every answer a player owes in one go: all of their prompts, or none of them.
func (s *Service) SubmitAnswers(ctx context.Context, in SubmitAnswersInput) (*AnswerOutcome, error) {
	game, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	if game.Status != GameInProgress {
		return nil, ErrGameFinished
	}
	if game.Phase != PhaseWriting {
		return nil, ErrWrongPhase
	}

	dealt := game.RoundsFor(in.UserID)
	if len(in.Answers) != len(dealt) {
		return nil, ErrIncompleteAnswers
	}

	now := time.Now().UTC()
	seen := map[int]bool{}
	options := make([]WWOption, 0, len(in.Answers))

	for _, answer := range in.Answers {
		round := game.Round(answer.RoundNumber)
		if round == nil {
			return nil, ErrRoundNotFound
		}
		if !round.WrittenBy(in.UserID) {
			return nil, ErrNotYourPrompt
		}
		if seen[answer.RoundNumber] {
			return nil, ErrIncompleteAnswers
		}
		seen[answer.RoundNumber] = true

		if round.Option(in.UserID) != nil {
			return nil, ErrAlreadyAnswered
		}

		text, err := NormaliseAnswer(answer.Answer)
		if err != nil {
			if errors.Is(err, ErrInvalidInput) {
				return nil, fmt.Errorf("%w: an answer cannot be blank", ErrInvalidInput)
			}
			return nil, err
		}

		options = append(options, WWOption{
			RoundID:   round.ID,
			AuthorID:  in.UserID,
			Answer:    text,
			Slot:      UnassignedSlot,
			CreatedAt: now,
		})
	}

	expected := AnswersFor(len(game.Players), answersPerPlayer(game.AnswersPerPlayer))
	answered, err := s.store.SaveAnswers(ctx, game.ID, options)
	if err != nil {
		return nil, err
	}

	outcome := &AnswerOutcome{Answered: answered, Expected: expected}

	// The last batch in is what opens the voting.
	if answered >= expected {
		opened, err := s.openVoting(ctx, game.ID)
		if err != nil {
			return nil, err
		}
		outcome.VotingOpened = opened
	}

	fresh, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	outcome.Game = fresh

	return outcome, nil
}

// openVoting shuffles every round's two answers, writes the order down, and flips the game into its second half.
func (s *Service) openVoting(ctx context.Context, gameID uuid.UUID) (bool, error) {
	game, err := s.store.GameByID(ctx, gameID)
	if err != nil {
		return false, err
	}
	if game.Phase != PhaseWriting {
		return false, nil
	}

	var slots []SlotAssignment
	for _, round := range game.Rounds {
		groups := GroupSameAnswers(round.Options)
		order := rand.Perm(len(groups))
		for i, group := range groups {
			for _, option := range group {
				slots = append(slots, SlotAssignment{RoundID: round.ID, AuthorID: option.AuthorID, Slot: order[i]})
			}
		}
	}

	opened, err := s.store.OpenVoting(ctx, gameID, slots)
	if err != nil {
		return false, fmt.Errorf("open voting: %w", err)
	}
	return opened, nil
}

type CastVoteInput struct {
	GameID      uuid.UUID
	UserID      string
	RoundNumber int
	// Slot is the position the answer was shown in, not its author id.
	Slot int
}

// VoteOutcome is what one vote did, and where it left the game.
type VoteOutcome struct {
	Game        *WWMultiDeviceGame
	RoundNumber int
	// Round is the round that was voted on, reloaded after the write.
	Round *WWRound

	Votes       int
	VotesNeeded int
	RoundOver   bool
	LastRound   bool
}

// CastVote records one player's pick on the round the table is on.
func (s *Service) CastVote(ctx context.Context, in CastVoteInput) (*VoteOutcome, error) {
	game, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	if game.Status != GameInProgress {
		return nil, ErrGameFinished
	}
	if game.Phase != PhaseVoting {
		return nil, ErrWrongPhase
	}

	round := game.Round(in.RoundNumber)
	if round == nil {
		return nil, ErrRoundNotFound
	}
	if round.Number != game.CurrentRound {
		return nil, ErrWrongRound
	}
	if round.WrittenBy(in.UserID) {
		return nil, ErrCannotVoteOwnPrompt
	}
	if round.VoteBy(in.UserID) != nil {
		return nil, ErrAlreadyVoted
	}

	option := round.OptionInSlot(in.Slot)
	if option == nil {
		return nil, ErrOptionNotFound
	}

	vote := &WWVote{
		RoundID:          round.ID,
		VoterUserID:      in.UserID,
		VotedForAuthorID: option.AuthorID,
		CreatedAt:        time.Now().UTC(),
	}

	input := RecordVoteInput{
		GameID:       game.ID,
		Vote:         vote,
		RoundNumber:  round.Number,
		TotalRounds:  len(game.Rounds),
		VotersNeeded: VotersFor(len(game.Players)),
	}

	// A merged slot pays everybody who wrote it.
	shared := round.OptionsInSlot(in.Slot)
	for _, o := range shared {
		input.AuthorIDs = append(input.AuthorIDs, o.AuthorID)
	}

	result, err := s.store.RecordVote(ctx, input)
	if err != nil {
		return nil, err
	}

	fresh, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}

	return &VoteOutcome{
		Game:        fresh,
		RoundNumber: input.RoundNumber,
		Round:       fresh.Round(input.RoundNumber),
		Votes:       result.Votes,
		VotesNeeded: input.VotersNeeded,
		RoundOver:   result.RoundOver,
		LastRound:   result.LastRound,
	}, nil
}

// AdvanceInput is the host leaving a reveal, naming the round being left.
type AdvanceInput struct {
	GameID      uuid.UUID
	UserID      string
	RoundNumber int
}

// AdvanceOutcome is where the table went after the reveal.
type AdvanceOutcome struct {
	Game *WWMultiDeviceGame
	// Advanced is false for a tap that arrived after the table had already moved, which is not a mistake.
	Advanced bool
	GameOver bool
}

// Advance leaves the reveal for the next round, or for the end of the game. The host's alone.
func (s *Service) Advance(ctx context.Context, in AdvanceInput) (*AdvanceOutcome, error) {
	game, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	if game.OwnerID != in.UserID {
		return nil, ErrNotHost
	}

	if game.Phase == PhaseVoting && game.CurrentRound == in.RoundNumber+1 {
		return &AdvanceOutcome{Game: game, Advanced: false}, nil
	}
	if game.Status == GameCompleted && game.CurrentRound == in.RoundNumber {
		return &AdvanceOutcome{Game: game, Advanced: false, GameOver: true}, nil
	}
	if game.Status != GameInProgress {
		return nil, ErrGameFinished
	}
	if game.Phase != PhaseReveal {
		return nil, ErrWrongPhase
	}
	if game.CurrentRound != in.RoundNumber {
		return nil, ErrWrongRound
	}

	advanced, err := s.store.AdvanceRound(ctx, AdvanceRoundInput{
		GameID:      game.ID,
		RoundNumber: in.RoundNumber,
		TotalRounds: len(game.Rounds),
	})
	if err != nil {
		return nil, err
	}

	fresh, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}

	return &AdvanceOutcome{Game: fresh, Advanced: advanced, GameOver: fresh.Status == GameCompleted}, nil
}

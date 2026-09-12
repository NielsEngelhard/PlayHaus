package fakefiller

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/joincode"
)

// The Fake Filler service: the lobby half is League of Letters' lobby with the words taken out.

// LobbySettings is what the host gets to decide once the room exists.
type LobbySettings struct {
	GameMode FFGameMode
	Locale   i18n.Locale
}

func (in LobbySettings) validate() map[string]string {
	problems := map[string]string{}
	if !in.GameMode.Valid() {
		problems["gameMode"] = fmt.Sprintf("must be %q or %q", GameModeFacts, GameModeCreative)
	}
	return problems
}

func (in LobbySettings) normalised() LobbySettings {
	if !in.Locale.Valid() {
		in.Locale = i18n.Default
	}
	return in
}

// DefaultGameMode is what a room plays until its host says otherwise. facts rather than creative because it is the mode with a right answer.
const DefaultGameMode = GameModeFacts

// Store is declared next to its consumer, as everywhere else in this codebase.
type Store interface {
	// The room
	CreateLobby(ctx context.Context, lobby *FFLobby) error
	LobbyByCode(ctx context.Context, code string) (*FFLobby, error)
	LobbyCodeTaken(ctx context.Context, code string) (bool, error)
	WaitingLobbyByOwnerID(ctx context.Context, userID string) (*FFLobby, error)
	AddLobbyPlayer(ctx context.Context, player *FFLobbyPlayer) error
	RemoveLobbyPlayer(ctx context.Context, code, userID string) error
	SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error
	SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error)
	DeleteLobby(ctx context.Context, code string) error
	DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error)

	// The game
	StartLobby(ctx context.Context, lobby *FFLobby, game *FFMultiDeviceGame) error
	GameByID(ctx context.Context, id uuid.UUID) (*FFMultiDeviceGame, error)
	GamesByUserID(ctx context.Context, userID string) ([]*FFMultiDeviceGame, error)
	AbandonGame(ctx context.Context, gameID uuid.UUID) error
	DeleteGamesOlderThan(ctx context.Context, before time.Time) (int64, error)

	// Playing it
	SaveAnswer(ctx context.Context, in SaveAnswerInput) (int, error)
	OpenVoting(ctx context.Context, gameID uuid.UUID, slots []SlotAssignment) (bool, error)
	RecordVote(ctx context.Context, in RecordVoteInput) (*RecordVoteResult, error)
	AdvanceRound(ctx context.Context, in AdvanceRoundInput) (bool, error)
}

// SaveAnswerInput is one option row going down, plus what the game is waiting for.
type SaveAnswerInput struct {
	GameID   uuid.UUID
	Option   *FFOption
	Expected int
}

// SlotAssignment is where one option is to be shown once voting opens.
type SlotAssignment struct {
	RoundID  uuid.UUID
	AuthorID string
	Slot     int
}

// RecordVoteInput is one vote going down, the points it pays out.
type RecordVoteInput struct {
	GameID      uuid.UUID
	Vote        *FFVote
	RoundNumber int

	TotalRounds  int
	VotersNeeded int

	// GuesserID is paid GuesserPoints for finding the truth; AuthorID is paid AuthorPoints for having been picked.
	GuesserID     string
	GuesserPoints int
	AuthorID      string
	AuthorPoints  int
}

// RecordVoteResult is where the vote left the game.
type RecordVoteResult struct {
	// Votes is how many are now on the round, this one included.
	Votes     int
	RoundOver bool
	// LastRound is the round it closed having been the final one, which is not the same as the game being over.
	LastRound bool
	// CurrentRound is the round the game is on afterwards, which the reveal holds at RoundNumber.
	CurrentRound int
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
				log.Error("sweep stale fake filler lobbies", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale fake filler lobbies", "deleted", deleted)
			}

			if deleted, err := s.store.DeleteGamesOlderThan(ctx, now.Add(-cfg.GameAge)); err != nil {
				log.Error("sweep stale fake filler games", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale fake filler games", "deleted", deleted)
			}
		}
	}
}

// CreateLobby opens a room and puts the caller in it as the host.
func (s *Service) CreateLobby(ctx context.Context, ownerID string, locale i18n.Locale) (*FFLobby, error) {
	return s.openLobby(ctx, ownerID, locale, DefaultGameMode)
}

// openLobby is the room itself: a free code, a host in seat nought, and a mode to sit at until somebody moves it.
func (s *Service) openLobby(ctx context.Context, ownerID string, locale i18n.Locale, mode FFGameMode) (*FFLobby, error) {
	if ownerID == "" {
		return nil, fmt.Errorf("create lobby: %w: missing owner", ErrInvalidInput)
	}
	if !locale.Valid() {
		locale = i18n.Default
	}
	if !mode.Valid() {
		mode = DefaultGameMode
	}

	code, err := s.freeJoinCode(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	lobby := &FFLobby{
		ID:       code,
		OwnerID:  ownerID,
		Locale:   locale,
		GameMode: mode,
		Status:   LobbyWaiting,
		// The host is a player like any other, and the first one.
		Players:   []FFLobbyPlayer{{LobbyID: code, UserID: ownerID, Seat: 0, JoinedAt: now}},
		CreatedAt: now,
	}

	if err := s.store.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}

	return lobby, nil
}

// freeJoinCode is a free code for this game. joincode.FakeFiller, not joincode.LeagueOfLetters.
func (s *Service) freeJoinCode(ctx context.Context) (string, error) {
	return joincode.Free(ctx, joincode.FakeFiller, s.store.LobbyCodeTaken)
}

// Lobby reads a room back by its code.
func (s *Service) Lobby(ctx context.Context, code string) (*FFLobby, error) {
	return s.store.LobbyByCode(ctx, code)
}

// UpdateLobbySettings moves the room onto what the host has picked.
func (s *Service) UpdateLobbySettings(ctx context.Context, code, userID string, in LobbySettings) (*FFLobby, map[string]string, error) {
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

	return lobby, nil, nil
}

// JoinLobby steps into somebody else's room, and is safe to call again on a room you are already in.
func (s *Service) JoinLobby(ctx context.Context, code, userID string) (*FFLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}

	// Already in, which is the common case.
	if lobby.Has(userID) {
		return lobby, nil
	}

	if lobby.Status != LobbyWaiting {
		return nil, ErrLobbyStarted
	}
	if lobby.Full() {
		return nil, ErrLobbyFull
	}

	player := &FFLobbyPlayer{
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

	// The game first: a room deleted before its game was ended would leave a board running with no way for this call to find it again.
	if lobby.GameID != nil {
		if err := s.store.AbandonGame(ctx, *lobby.GameID); err != nil {
			return err
		}
	}

	return s.store.DeleteLobby(ctx, code)
}

// CurrentLobby is the room this player is still on the hook for.
func (s *Service) CurrentLobby(ctx context.Context, userID string) (*FFLobby, error) {
	games, err := s.store.GamesByUserID(ctx, userID)
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

// StartLobby turns a room into a game.
func (s *Service) StartLobby(ctx context.Context, code, userID string) (*FFLobby, *FFMultiDeviceGame, error) {
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
	if len(lobby.Players) < MinPlayersFor(lobby.GameMode) {
		return nil, nil, ErrNotEnoughPlayers
	}
	if len(lobby.Players) > MaxLobbyPlayers {
		return nil, nil, ErrTooManyPlayers
	}

	// By seat before the shuffle, so the shuffle starts from a defined order rather than from whatever the preload happened to return.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b FFLobbyPlayer) int { return a.Seat - b.Seat })
	rand.Shuffle(len(seated), func(i, j int) { seated[i], seated[j] = seated[j], seated[i] })

	lines, err := GetContentLines(lobby.Locale, lobby.GameMode, RoundsFor(lobby.GameMode, len(seated)))
	if err != nil {
		return nil, nil, fmt.Errorf("draw prompts: %w", err)
	}

	now := time.Now().UTC()
	game := &FFMultiDeviceGame{
		ID:       uuid.New(),
		LobbyID:  lobby.ID,
		OwnerID:  lobby.OwnerID,
		Locale:   lobby.Locale,
		GameMode: lobby.GameMode,
		Phase:    PhaseWriting,
		// Meaningless until voting opens -- every round is written at once -- but a column that is 1 from the start is one nobody has to wonder about.
		CurrentRound: 1,
		Status:       GameInProgress,
		CreatedAt:    now,
	}

	game.Players = make([]FFGamePlayer, len(seated))
	for i, player := range seated {
		game.Players[i] = FFGamePlayer{
			GameID:    game.ID,
			UserID:    player.UserID,
			TurnOrder: i,
			Score:     0,
		}
	}

	game.Rounds = make([]FFRound, len(lines))
	for i, line := range lines {
		number := i + 1
		seats := AuthorSeats(game.GameMode, number, len(seated))

		round := FFRound{
			ID:              uuid.New(),
			GameID:          game.ID,
			Number:          number,
			Line:            line.Line,
			Blanks:          line.Blanks,
			AuthorOneUserID: seated[seats[0]].UserID,
			CreatedAt:       now,
		}
		if len(seats) > 1 {
			round.AuthorTwoUserID = seated[seats[1]].UserID
		}

		// The truth goes in as an option now rather than at the reveal, because it is one of the things being shuffled.
		if game.GameMode.HasTruth() {
			round.Options = []FFOption{{
				RoundID:   round.ID,
				AuthorID:  TruthAuthorID,
				Fills:     Fills(line.Answers),
				Slot:      UnassignedSlot,
				CreatedAt: now,
			}}
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
func (s *Service) Rematch(ctx context.Context, code, userID string) (*FFLobby, error) {
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
	game, err := s.store.GameByID(ctx, *lobby.GameID)
	if err != nil {
		return nil, err
	}
	if game.Status == GameInProgress {
		return nil, ErrGameNotOver
	}

	next, err := s.openLobby(ctx, userID, lobby.Locale, lobby.GameMode)
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
func (s *Service) Game(ctx context.Context, id uuid.UUID, userID string) (*FFMultiDeviceGame, error) {
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
func (s *Service) GamesByUserID(ctx context.Context, userID string) ([]*FFMultiDeviceGame, error) {
	return s.store.GamesByUserID(ctx, userID)
}

type SubmitAnswerInput struct {
	GameID      uuid.UUID
	UserID      string
	RoundNumber int
	Fills       Fills
}

// AnswerOutcome is what one answer did, and where it left the game.
type AnswerOutcome struct {
	Game *FFMultiDeviceGame
	// Answered is how many player-written answers the game now holds, out of Expected.
	Answered int
	Expected int
	// VotingOpened is true for exactly one caller: whoever wrote the last one.
	VotingOpened bool
}

// SubmitAnswer files one player's fake for one of the two prompts they were dealt.
func (s *Service) SubmitAnswer(ctx context.Context, in SubmitAnswerInput) (*AnswerOutcome, error) {
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

	round := game.Round(in.RoundNumber)
	if round == nil {
		return nil, ErrRoundNotFound
	}
	if !round.WrittenBy(in.UserID) {
		return nil, ErrNotYourPrompt
	}
	if round.Option(in.UserID) != nil {
		return nil, ErrAlreadyAnswered
	}

	fills, err := normaliseFills(in.Fills, round.Blanks)
	if err != nil {
		return nil, err
	}

	expected := AnswersFor(game.GameMode, len(game.Players))
	answered, err := s.store.SaveAnswer(ctx, SaveAnswerInput{
		GameID: game.ID,
		Option: &FFOption{
			RoundID:   round.ID,
			AuthorID:  in.UserID,
			Fills:     fills,
			Slot:      UnassignedSlot,
			CreatedAt: time.Now().UTC(),
		},
		Expected: expected,
	})
	if err != nil {
		return nil, err
	}

	outcome := &AnswerOutcome{Answered: answered, Expected: expected}

	// The last answer in is what opens the voting, and it is the writer's own request that does it.
	if answered >= expected {
		opened, err := s.openVoting(ctx, game.ID)
		if err != nil {
			return nil, err
		}
		outcome.VotingOpened = opened
	}

	// Re-read rather than patched by hand.
	fresh, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	outcome.Game = fresh

	return outcome, nil
}

// normaliseFills trims an answer and holds it to the shape of the prompt.
func normaliseFills(in Fills, blanks int) (Fills, error) {
	if len(in) != blanks {
		return nil, fmt.Errorf("%w: that prompt takes %d fills, got %d", ErrInvalidInput, blanks, len(in))
	}

	out := make(Fills, 0, len(in))
	for _, fill := range in {
		fill = strings.TrimSpace(fill)
		if fill == "" {
			return nil, fmt.Errorf("%w: a fill cannot be blank", ErrInvalidInput)
		}
		out = append(out, fill)
	}
	return out, nil
}

// openVoting shuffles every round's options, writes the order down, and flips the game into its second half.
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
		order := rand.Perm(len(round.Options))
		for i, option := range round.Options {
			slots = append(slots, SlotAssignment{
				RoundID:  round.ID,
				AuthorID: option.AuthorID,
				Slot:     order[i],
			})
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
	// Slot is the position the option was shown in, not its author id.
	Slot int
}

// VoteOutcome is what one vote did, and where it left the game.
type VoteOutcome struct {
	Game        *FFMultiDeviceGame
	RoundNumber int
	// Round is the round that was voted on, reloaded after the write so its votes are the ones this call produced.
	Round *FFRound

	Votes       int
	VotesNeeded int
	RoundOver   bool
	// LastRound is whether the reveal now up is the final one.
	LastRound bool
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

	guesser, author := ScoreVote(game.GameMode, option.AuthorID)

	input := RecordVoteInput{
		GameID: game.ID,
		Vote: &FFVote{
			RoundID:          round.ID,
			VoterUserID:      in.UserID,
			VotedForAuthorID: option.AuthorID,
			CreatedAt:        time.Now().UTC(),
		},
		RoundNumber:  round.Number,
		TotalRounds:  len(game.Rounds),
		VotersNeeded: VotersFor(game.GameMode, len(game.Players)),
	}
	if guesser != 0 {
		input.GuesserID, input.GuesserPoints = in.UserID, guesser
	}
	// The truth has no author to pay.
	if author != 0 && !option.IsTruth() {
		input.AuthorID, input.AuthorPoints = option.AuthorID, author
	}

	result, err := s.store.RecordVote(ctx, input)
	if err != nil {
		return nil, err
	}

	// Re-read for the same reason SubmitAnswer does.
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
	Game *FFMultiDeviceGame
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

	// A second tap on a table that has already moved is a no-op rather than a mistake.
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

	total := len(game.Rounds)
	advanced, err := s.store.AdvanceRound(ctx, AdvanceRoundInput{
		GameID:      game.ID,
		RoundNumber: in.RoundNumber,
		TotalRounds: total,
	})
	if err != nil {
		return nil, err
	}

	// Re-read for the same reason CastVote does.
	fresh, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}

	return &AdvanceOutcome{
		Game:     fresh,
		Advanced: advanced,
		GameOver: fresh.Status == GameCompleted,
	}, nil
}

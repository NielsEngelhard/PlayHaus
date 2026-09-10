package oneofus

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

// The multi-device half of One of Us: one phone each, typed answers, and one prompt pair for the whole game.

// LobbySettings is what the host gets to decide once the room exists.
type LobbySettings struct {
	GameMode     GameMode
	Locale       i18n.Locale
	EnabledRoles RoleSet
}

func (in LobbySettings) validate() map[string]string {
	problems := map[string]string{}

	if !in.GameMode.Valid() {
		problems["wordOnly"] = "must be a boolean"
	}

	if !ImposterRoleSetOK(in.EnabledRoles) {
		problems["enabledRoles"] = "must be a set of distinct imposter roles"
	}

	return problems
}

func (in LobbySettings) normalised() LobbySettings {
	if !in.Locale.Valid() {
		in.Locale = i18n.Default
	}

	return in
}

// MultiDeviceStore is declared next to its consumer, as everywhere else in this codebase.
type MultiDeviceStore interface {
	// The room
	CreateLobby(ctx context.Context, lobby *OOULobby) error
	LobbyByCode(ctx context.Context, code string) (*OOULobby, error)
	LobbyCodeTaken(ctx context.Context, code string) (bool, error)
	WaitingLobbyByOwnerID(ctx context.Context, userID string) (*OOULobby, error)
	AddLobbyPlayer(ctx context.Context, player *OOULobbyPlayer) error
	RemoveLobbyPlayer(ctx context.Context, code, userID string) error
	SaveLobbySettings(ctx context.Context, code string, in LobbySettings) error
	SaveRematchCode(ctx context.Context, code, rematchCode string) (bool, error)
	DeleteLobby(ctx context.Context, code string) error
	DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error)

	// The game
	StartLobby(ctx context.Context, lobby *OOULobby, game *OOUMultiDeviceGame) error
	MultiDeviceGameByID(ctx context.Context, id uuid.UUID) (*OOUMultiDeviceGame, error)
	MultiDeviceGamesByUserID(ctx context.Context, userID string) ([]*OOUMultiDeviceGame, error)
	AbandonMultiDeviceGame(ctx context.Context, gameID uuid.UUID) error
	DeleteMultiDeviceGamesOlderThan(ctx context.Context, before time.Time) (int64, error)

	// Playing it
	SaveAnswer(ctx context.Context, in SaveAnswerInput) (int, error)
	OpenVoting(ctx context.Context, in OpenVotingInput) (bool, error)
	RecordVote(ctx context.Context, in RecordVoteInput) (int, error)
	CloseRound(ctx context.Context, in CloseRoundInput) (bool, error)
	OpenRound(ctx context.Context, in OpenRoundInput) (bool, error)
}

// SaveAnswerInput is one answer row going down, plus the round it has to land on.
type SaveAnswerInput struct {
	GameID      uuid.UUID
	RoundNumber int
	Answer      *OOUAnswer
}

// SlotAssignment is the position one answer is shown in once voting opens.
type SlotAssignment struct {
	RoundID uuid.UUID
	UserID  string
	Slot    int
}

// OpenVotingInput flips a round into its voting half and fixes the order the answers are shown in.
type OpenVotingInput struct {
	GameID      uuid.UUID
	RoundNumber int
	Slots       []SlotAssignment
}

// RecordVoteInput is one accusation going down.
type RecordVoteInput struct {
	GameID      uuid.UUID
	RoundNumber int
	Vote        *OOUVote
}

// CloseRoundInput is everything the elimination decided, worked out before the transaction so the store stays free of both randomness and rules.
type CloseRoundInput struct {
	GameID      uuid.UUID
	RoundID     uuid.UUID
	RoundNumber int

	EliminatedUserID string
	EliminatedRole   Role
	EliminatedVotes  int
	TieBrokenByMayor bool

	GameEnded    bool
	CiviliansWon bool

	// MayorOrder is who may take the chain when the elimination took the mayor, already shuffled. Empty when it stays where it is.
	MayorOrder []string
}

// OpenRoundInput is the next round, ready to be written the moment the phase flips.
type OpenRoundInput struct {
	GameID    uuid.UUID
	FromRound int
	Round     *OOURound
}

// SweepConfig is how long the two kinds of multi-device row are kept.
type SweepConfig struct {
	LobbyAge time.Duration
	GameAge  time.Duration
}

// SweepStaleMultiDevice deletes old rooms and games on a ticker until ctx is cancelled.
func (s *Service) SweepStaleMultiDevice(ctx context.Context, cfg SweepConfig, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now().UTC()

			if deleted, err := s.multi.DeleteLobbiesOlderThan(ctx, now.Add(-cfg.LobbyAge)); err != nil {
				log.Error("sweep stale one of us lobbies", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale one of us lobbies", "deleted", deleted)
			}

			if deleted, err := s.multi.DeleteMultiDeviceGamesOlderThan(ctx, now.Add(-cfg.GameAge)); err != nil {
				log.Error("sweep stale one of us multi device games", "err", err)
			} else if deleted > 0 {
				log.Info("swept stale one of us multi device games", "deleted", deleted)
			}
		}
	}
}

// CreateLobby opens a room and puts the caller in it as the host.
func (s *Service) CreateLobby(ctx context.Context, ownerID string, locale i18n.Locale) (*OOULobby, error) {
	return s.openLobby(ctx, ownerID, locale, DefaultMode, ImposterRoles())
}

// openLobby is the room itself: a free code, a host in seat nought, and settings to sit at until somebody moves them.
func (s *Service) openLobby(ctx context.Context, ownerID string, locale i18n.Locale, mode GameMode, roles RoleSet) (*OOULobby, error) {
	if ownerID == "" {
		return nil, fmt.Errorf("create lobby: %w: missing owner", ErrInvalidInput)
	}
	if !locale.Valid() {
		locale = i18n.Default
	}
	if !mode.Valid() {
		mode = DefaultMode
	}
	if !ImposterRoleSetOK(roles) {
		roles = ImposterRoles()
	}

	code, err := s.freeJoinCode(ctx)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	lobby := &OOULobby{
		ID:           code,
		OwnerID:      ownerID,
		Locale:       locale,
		GameMode:     mode,
		EnabledRoles: roles,
		Status:       LobbyWaiting,
		// The host is a player like any other, and the first one.
		Players:   []OOULobbyPlayer{{LobbyID: code, UserID: ownerID, Seat: 0, JoinedAt: now}},
		CreatedAt: now,
	}

	if err := s.multi.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}

	return lobby, nil
}

// freeJoinCode is a free code for this game, so an O-code and nothing else.
func (s *Service) freeJoinCode(ctx context.Context) (string, error) {
	return joincode.Free(ctx, joincode.OneOfUs, s.multi.LobbyCodeTaken)
}

// Lobby reads a room back by its code.
func (s *Service) Lobby(ctx context.Context, code string) (*OOULobby, error) {
	return s.multi.LobbyByCode(ctx, code)
}

// UpdateLobbySettings moves the room onto what the host has picked.
func (s *Service) UpdateLobbySettings(ctx context.Context, code, userID string, in LobbySettings) (*OOULobby, map[string]string, error) {
	lobby, err := s.multi.LobbyByCode(ctx, code)
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

	if err := s.multi.SaveLobbySettings(ctx, code, in); err != nil {
		return nil, nil, fmt.Errorf("save lobby settings: %w", err)
	}

	lobby.Locale = in.Locale
	lobby.GameMode = in.GameMode
	lobby.EnabledRoles = in.EnabledRoles

	return lobby, nil, nil
}

// JoinLobby steps into somebody else's room, and is safe to call again on a room you are already in.
func (s *Service) JoinLobby(ctx context.Context, code, userID string) (*OOULobby, error) {
	lobby, err := s.multi.LobbyByCode(ctx, code)
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

	player := &OOULobbyPlayer{
		LobbyID:  lobby.ID,
		UserID:   userID,
		Seat:     lobby.NextSeat(),
		JoinedAt: time.Now().UTC(),
	}
	if err := s.multi.AddLobbyPlayer(ctx, player); err != nil {
		return nil, fmt.Errorf("join lobby: %w", err)
	}
	lobby.Players = append(lobby.Players, *player)

	return lobby, nil
}

// LeaveLobby gives a seat back without closing the room.
func (s *Service) LeaveLobby(ctx context.Context, code, userID string) error {
	return s.multi.RemoveLobbyPlayer(ctx, code, userID)
}

// DeleteLobby closes a room for good.
func (s *Service) DeleteLobby(ctx context.Context, code, userID string) error {
	lobby, err := s.multi.LobbyByCode(ctx, code)
	if err != nil {
		if errors.Is(err, ErrLobbyNotFound) {
			return nil
		}

		return err
	}
	if lobby.OwnerID != userID {
		return ErrNotHost
	}

	return s.multi.DeleteLobby(ctx, code)
}

// AbandonLobby throws a room away for good, game and all.
func (s *Service) AbandonLobby(ctx context.Context, code, userID string) error {
	lobby, err := s.multi.LobbyByCode(ctx, code)
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
		if err := s.multi.AbandonMultiDeviceGame(ctx, *lobby.GameID); err != nil {
			return err
		}
	}

	return s.multi.DeleteLobby(ctx, code)
}

// CurrentLobby is the room this player is still on the hook for.
func (s *Service) CurrentLobby(ctx context.Context, userID string) (*OOULobby, error) {
	games, err := s.multi.MultiDeviceGamesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Newest first, and only the ones this player owns.
	for _, game := range games {
		if game.OwnerID != userID {
			continue
		}

		lobby, err := s.multi.LobbyByCode(ctx, game.LobbyID)
		if err != nil {
			// A game whose room has been deleted is not one anybody can be sent back to -- the board is reached by its join code.
			if errors.Is(err, ErrLobbyNotFound) {
				continue
			}

			return nil, err
		}

		return lobby, nil
	}

	return s.multi.WaitingLobbyByOwnerID(ctx, userID)
}

// StartLobby turns a room into a dealt game.
func (s *Service) StartLobby(ctx context.Context, code, userID string) (*OOULobby, *OOUMultiDeviceGame, error) {
	lobby, err := s.multi.LobbyByCode(ctx, code)
	if err != nil {
		return nil, nil, err
	}
	if lobby.OwnerID != userID {
		return nil, nil, ErrNotHost
	}
	if lobby.Status != LobbyWaiting {
		return nil, nil, ErrLobbyStarted
	}
	if len(lobby.Players) < MinPlayers {
		return nil, nil, ErrNotEnoughPlayers
	}
	if len(lobby.Players) > MaxPlayers {
		return nil, nil, ErrTooManyPlayers
	}

	// By seat before the shuffle, so the shuffle starts from a defined order rather than from whatever the preload happened to return.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b OOULobbyPlayer) int { return a.Seat - b.Seat })
	rand.Shuffle(len(seated), func(i, j int) { seated[i], seated[j] = seated[j], seated[i] })

	lines, err := GetContentLines(lobby.Locale, lobby.GameMode, 1)
	if err != nil {
		return nil, nil, fmt.Errorf("draw prompt: %w", err)
	}
	if len(lines) == 0 {
		return nil, nil, ErrNoContent
	}

	now := time.Now().UTC()
	game := &OOUMultiDeviceGame{
		ID:               uuid.New(),
		LobbyID:          lobby.ID,
		OwnerID:          lobby.OwnerID,
		Locale:           lobby.Locale,
		GameMode:         lobby.GameMode,
		ActualQuestion:   lines[0].RealLine,
		ImposterQuestion: lines[0].ImposterLine,
		Phase:            PhaseAnswer,
		CurrentRound:     1,
		Status:           GameInProgress,
		CreatedAt:        now,
	}

	game.Players = make([]OOUGamePlayer, len(seated))
	for seat, player := range seated {
		game.Players[seat] = OOUGamePlayer{
			GameID: game.ID,
			UserID: player.UserID,
			Seat:   seat,
			Role:   Civilian,
		}
	}

	// Dealt against a second shuffle rather than against the seats, because the seat is on the wire and the role is not.
	dealMultiDeviceRoles(game.Players, lobby.EnabledRoles)
	dealMultiDeviceMayor(game.Players)

	game.Rounds = []OOURound{{
		ID:          uuid.New(),
		GameID:      game.ID,
		Number:      1,
		LivingCount: len(game.Players),
		CreatedAt:   now,
	}}

	if err := s.multi.StartLobby(ctx, lobby, game); err != nil {
		return nil, nil, fmt.Errorf("start lobby: %w", err)
	}

	lobby.Status = LobbyStarted
	lobby.GameID = &game.ID

	return lobby, game, nil
}

// dealMultiDeviceRoles is assignRoles for a started multi-device table.
func dealMultiDeviceRoles(players []OOUGamePlayer, enabled RoleSet) {
	hand := RolesFor(len(players), enabled)
	if len(hand) == 0 {
		return
	}

	indices := rand.Perm(len(players))

	for seat, role := range hand {
		players[indices[seat]].Role = role
	}
}

// dealMultiDeviceMayor hands the chain to somebody still in the game, and takes it off whoever had it.
func dealMultiDeviceMayor(players []OOUGamePlayer) int {
	candidates := LivingSeats(players)

	for index := range players {
		players[index].IsMayor = false
	}

	if len(candidates) == 0 {
		return -1
	}

	chosen := candidates[rand.IntN(len(candidates))]
	players[chosen].IsMayor = true

	return chosen
}

// Rematch opens a fresh room for the table that just finished, and answers it.
func (s *Service) Rematch(ctx context.Context, code, userID string) (*OOULobby, error) {
	lobby, err := s.multi.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if lobby.OwnerID != userID {
		return nil, ErrNotHost
	}

	// Already opened, which is what a double-tapped button looks like from here.
	if lobby.RematchCode != nil {
		next, err := s.multi.LobbyByCode(ctx, *lobby.RematchCode)
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
	game, err := s.multi.MultiDeviceGameByID(ctx, *lobby.GameID)
	if err != nil {
		return nil, err
	}
	if !game.Over() {
		return nil, ErrGameNotOver
	}

	next, err := s.openLobby(ctx, userID, lobby.Locale, lobby.GameMode, lobby.EnabledRoles)
	if err != nil {
		return nil, err
	}

	claimed, err := s.multi.SaveRematchCode(ctx, lobby.ID, next.ID)
	if err != nil {
		return nil, fmt.Errorf("save rematch code: %w", err)
	}
	if !claimed {
		// Two presses that both got past the check above.
		_ = s.multi.DeleteLobby(ctx, next.ID)

		settled, err := s.multi.LobbyByCode(ctx, lobby.ID)
		if err != nil {
			return nil, err
		}
		if settled.RematchCode == nil {
			return nil, fmt.Errorf("rematch for lobby %s was claimed but is not recorded", lobby.ID)
		}

		return s.multi.LobbyByCode(ctx, *settled.RematchCode)
	}

	return next, nil
}

// MultiDeviceGame reads a game back for one of its players. Not at the table reads the same as no such game.
func (s *Service) MultiDeviceGame(ctx context.Context, id uuid.UUID, userID string) (*OOUMultiDeviceGame, error) {
	game, err := s.multi.MultiDeviceGameByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !game.Has(userID) {
		return nil, ErrGameNotFound
	}

	return game, nil
}

// MultiDeviceGamesByUserID is every unfinished game this player is at a table for.
func (s *Service) MultiDeviceGamesByUserID(ctx context.Context, userID string) ([]*OOUMultiDeviceGame, error) {
	return s.multi.MultiDeviceGamesByUserID(ctx, userID)
}

type SubmitAnswerInput struct {
	GameID      uuid.UUID
	UserID      string
	RoundNumber int
	Text        string
}

// AnswerOutcome is what one answer did, and where it left the game.
type AnswerOutcome struct {
	Game        *OOUMultiDeviceGame
	RoundNumber int

	// Answered is how many of the living have typed something, out of Expected.
	Answered int
	Expected int
	// VotingOpened is true for exactly one caller: whoever typed the last one.
	VotingOpened bool
}

// SubmitAnswer files one player's answer for the round the table is on.
func (s *Service) SubmitAnswer(ctx context.Context, in SubmitAnswerInput) (*AnswerOutcome, error) {
	game, err := s.MultiDeviceGame(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	if game.Over() {
		return nil, ErrGameFinished
	}
	if game.Phase != PhaseAnswer {
		return nil, ErrWrongPhase
	}

	round := game.Round(in.RoundNumber)
	if round == nil {
		return nil, ErrRoundNotFound
	}
	if round.Number != game.CurrentRound {
		return nil, ErrWrongRound
	}

	player := game.Player(in.UserID)
	if player == nil || player.IsVotedOut {
		return nil, ErrVotedOut
	}
	if round.AnswerBy(in.UserID) != nil {
		return nil, ErrAlreadyAnswered
	}

	text := NormaliseAnswer(in.Text)
	if !AnswerOK(text) {
		return nil, fmt.Errorf("%w: an answer is between 1 and %d characters", ErrInvalidInput, MaxAnswerRunes)
	}

	answered, err := s.multi.SaveAnswer(ctx, SaveAnswerInput{
		GameID:      game.ID,
		RoundNumber: round.Number,
		Answer: &OOUAnswer{
			RoundID:   round.ID,
			UserID:    in.UserID,
			Text:      text,
			Slot:      UnassignedSlot,
			CreatedAt: time.Now().UTC(),
		},
	})
	if err != nil {
		return nil, err
	}

	outcome := &AnswerOutcome{RoundNumber: round.Number, Answered: answered, Expected: round.LivingCount}

	// The last answer in is what opens the voting, and it is the writer's own request that does it.
	if answered >= round.LivingCount {
		opened, err := s.openVoting(ctx, game.ID, round.Number)
		if err != nil {
			return nil, err
		}

		outcome.VotingOpened = opened
	}

	// Re-read rather than patched by hand.
	fresh, err := s.MultiDeviceGame(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	outcome.Game = fresh

	return outcome, nil
}

// openVoting shuffles the round's answers, writes the order down, and flips the round into its voting half.
func (s *Service) openVoting(ctx context.Context, gameID uuid.UUID, roundNumber int) (bool, error) {
	game, err := s.multi.MultiDeviceGameByID(ctx, gameID)
	if err != nil {
		return false, err
	}
	if game.Phase != PhaseAnswer || game.CurrentRound != roundNumber {
		return false, nil
	}

	round := game.Round(roundNumber)
	if round == nil {
		return false, ErrRoundNotFound
	}

	order := rand.Perm(len(round.Answers))
	slots := make([]SlotAssignment, len(round.Answers))
	for i, answer := range round.Answers {
		slots[i] = SlotAssignment{RoundID: round.ID, UserID: answer.UserID, Slot: order[i]}
	}

	opened, err := s.multi.OpenVoting(ctx, OpenVotingInput{GameID: gameID, RoundNumber: roundNumber, Slots: slots})
	if err != nil {
		return false, fmt.Errorf("open voting: %w", err)
	}

	return opened, nil
}

type CastVoteInput struct {
	GameID      uuid.UUID
	UserID      string
	RoundNumber int
	// Slot is the position the answer was shown in, not whose it is.
	Slot int
}

// VoteOutcome is what one vote did, and where it left the game.
type VoteOutcome struct {
	Game        *OOUMultiDeviceGame
	RoundNumber int
	// Round is reloaded after the write, so its votes are the ones this call produced.
	Round *OOURound

	Votes       int
	VotesNeeded int
	RoundClosed bool
	GameOver    bool
}

// CastVote records one accusation, and closes the round when it was the last one it was waiting for.
func (s *Service) CastVote(ctx context.Context, in CastVoteInput) (*VoteOutcome, error) {
	game, err := s.MultiDeviceGame(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	if game.Over() {
		return nil, ErrGameFinished
	}
	if game.Phase != PhaseVote {
		return nil, ErrWrongPhase
	}

	round := game.Round(in.RoundNumber)
	if round == nil {
		return nil, ErrRoundNotFound
	}
	if round.Number != game.CurrentRound {
		return nil, ErrWrongRound
	}

	player := game.Player(in.UserID)
	if player == nil || player.IsVotedOut {
		return nil, ErrVotedOut
	}
	if round.VoteBy(in.UserID) != nil {
		return nil, ErrAlreadyVoted
	}

	answer := round.AnswerInSlot(in.Slot)
	if answer == nil {
		return nil, ErrAnswerNotFound
	}
	if !CanVoteForUser(in.UserID, answer.UserID) {
		return nil, ErrCannotVoteSelf
	}

	votes, err := s.multi.RecordVote(ctx, RecordVoteInput{
		GameID:      game.ID,
		RoundNumber: round.Number,
		Vote: &OOUVote{
			RoundID:       round.ID,
			VoterUserID:   in.UserID,
			AccusedUserID: answer.UserID,
			CreatedAt:     time.Now().UTC(),
		},
	})
	if err != nil {
		return nil, err
	}

	outcome := &VoteOutcome{RoundNumber: round.Number, Votes: votes, VotesNeeded: round.LivingCount}

	// The last vote in closes the round, and it is the voter's own request that does it.
	if votes >= round.LivingCount {
		closed, err := s.closeRound(ctx, game.ID, round.Number)
		if err != nil {
			return nil, err
		}

		outcome.RoundClosed = closed
	}

	// Re-read for the same reason SubmitAnswer does.
	fresh, err := s.MultiDeviceGame(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	outcome.Game = fresh
	outcome.Round = fresh.Round(round.Number)
	outcome.GameOver = fresh.Over()

	return outcome, nil
}

// closeRound counts the votes, takes whoever they name, and ends the game if that was the last liar or the last civilian.
func (s *Service) closeRound(ctx context.Context, gameID uuid.UUID, roundNumber int) (bool, error) {
	game, err := s.multi.MultiDeviceGameByID(ctx, gameID)
	if err != nil {
		return false, err
	}
	if game.Phase != PhaseVote || game.CurrentRound != roundNumber {
		return false, nil
	}

	round := game.Round(roundNumber)
	if round == nil {
		return false, ErrRoundNotFound
	}
	if round.ClosedAt != nil {
		return false, nil
	}

	accused, votes, tieBrokenByMayor := Eliminate(game.Players, round.Votes)
	if accused == "" {
		return false, fmt.Errorf("close round %d of game %s: nobody was named", roundNumber, gameID)
	}

	eliminated := game.Player(accused)
	if eliminated == nil {
		return false, fmt.Errorf("close round %d of game %s: %s is not at this table", roundNumber, gameID, accused)
	}

	civilians, active := livingAfter(game.Players, accused)
	ended, noMoreImposters := GameEnded(civilians, active)

	in := CloseRoundInput{
		GameID:           game.ID,
		RoundID:          round.ID,
		RoundNumber:      round.Number,
		EliminatedUserID: accused,
		EliminatedRole:   eliminated.Role,
		EliminatedVotes:  votes,
		TieBrokenByMayor: tieBrokenByMayor,
		GameEnded:        ended,
		CiviliansWon:     ended && noMoreImposters,
	}

	// The chain only moves when the vote took the person wearing it, and only while there is still a game to break a tie in.
	if !ended && eliminated.IsMayor {
		in.MayorOrder = shuffledLiving(game.Players, accused)
	}

	closed, err := s.multi.CloseRound(ctx, in)
	if err != nil {
		return false, fmt.Errorf("close round: %w", err)
	}

	return closed, nil
}

// livingAfter counts the table as it will stand once one more player is gone.
func livingAfter(players []OOUGamePlayer, eliminated string) (int, int) {
	civilians := 0
	active := 0

	for _, player := range players {
		if player.IsVotedOut || player.UserID == eliminated {
			continue
		}

		active++

		if player.Role.WithCivilians() {
			civilians++
		}
	}

	return civilians, active
}

// shuffledLiving is everybody still in the game once one more player is gone, in no particular order.
func shuffledLiving(players []OOUGamePlayer, eliminated string) []string {
	living := make([]string, 0, len(players))

	for _, player := range players {
		if player.IsVotedOut || player.UserID == eliminated {
			continue
		}

		living = append(living, player.UserID)
	}

	rand.Shuffle(len(living), func(i, j int) { living[i], living[j] = living[j], living[i] })

	return living
}

type ContinueInput struct {
	GameID      uuid.UUID
	UserID      string
	RoundNumber int
}

// ContinueOutcome is where the table went after the reveal.
type ContinueOutcome struct {
	Game *OOUMultiDeviceGame
	// Opened is true for exactly one caller: whoever tapped first.
	Opened      bool
	RoundNumber int
}

// ContinueToNextRound leaves the reveal and opens the next round on the same prompt.
func (s *Service) ContinueToNextRound(ctx context.Context, in ContinueInput) (*ContinueOutcome, error) {
	game, err := s.MultiDeviceGame(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	if game.Over() {
		return nil, ErrGameFinished
	}

	player := game.Player(in.UserID)
	if player == nil || player.IsVotedOut {
		return nil, ErrVotedOut
	}

	// Everybody taps, so a tap arriving after the round already opened is a no-op rather than a mistake.
	if game.Phase == PhaseAnswer && game.CurrentRound == in.RoundNumber+1 {
		return &ContinueOutcome{Game: game, Opened: false, RoundNumber: game.CurrentRound}, nil
	}
	if game.Phase != PhaseReveal {
		return nil, ErrWrongPhase
	}
	if game.CurrentRound != in.RoundNumber {
		return nil, ErrWrongRound
	}

	living := len(LivingSeats(game.Players))
	next := in.RoundNumber + 1

	opened, err := s.multi.OpenRound(ctx, OpenRoundInput{
		GameID:    game.ID,
		FromRound: in.RoundNumber,
		Round: &OOURound{
			ID:          uuid.New(),
			GameID:      game.ID,
			Number:      next,
			LivingCount: living,
			CreatedAt:   time.Now().UTC(),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("open round: %w", err)
	}

	fresh, err := s.MultiDeviceGame(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}

	return &ContinueOutcome{Game: fresh, Opened: opened, RoundNumber: fresh.CurrentRound}, nil
}

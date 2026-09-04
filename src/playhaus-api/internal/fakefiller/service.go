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

// The Fake Filler service: the lobby half is League of Letters' lobby with the words
// taken out, and the game half is not like League of Letters at all.
//
// The difference worth holding on to is that this game has no turn. League of Letters
// serialises every write behind "it is your turn", which is a lock with one holder; here
// the whole table writes at once and then the whole table votes at once, so the guard has
// to be something that works for N callers arriving together. That guard is the composite
// primary key on FFOption and FFVote -- see the notes on SubmitAnswer and CastVote, and
// on the Store methods that do the inserting.

// LobbySettings is what the host gets to decide once the room exists.
//
// Two knobs, and neither of them is a number: which language the prompts come out of,
// and which pile they come out of. Both are read exactly once, at StartLobby, which is
// the moment the prompts are dealt -- so a setting moved after that would be a card
// disagreeing with a board, which is why UpdateLobbySettings refuses once a room has
// started.
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

// DefaultGameMode is what a room plays until its host says otherwise. facts rather than
// creative because it is the mode with a right answer, and a table that has not chosen is
// better off with the one that can be scored.
const DefaultGameMode = GameModeFacts

// Store is declared next to its consumer, as everywhere else in this codebase. Three
// groups: the room, the game, and the two writes a player makes while playing it.
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
}

// SaveAnswerInput is one option row going down, plus what the game is waiting for.
//
// Expected is how many player-written answers a finished writing phase has, worked out
// from the roster by the service. The store counts what it can see after the insert and
// hands back the total, all inside the transaction the insert happened in -- so exactly
// one player is told they wrote the last one, and it is the player who did.
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

// RecordVoteInput is one vote going down, the points it pays out, and everything the
// store needs to decide whether it was the last one.
//
// The rules are all worked out before the call -- VotersNeeded, TotalRounds and the two
// scores come from package rules -- so the store only counts and compares. What it must
// do itself is the counting, because the count has to happen in the transaction that
// inserted the vote: two voters that both counted before either inserted would both
// think they were not the last.
type RecordVoteInput struct {
	GameID      uuid.UUID
	Vote        *FFVote
	RoundNumber int

	TotalRounds  int
	VotersNeeded int

	// GuesserID is paid GuesserPoints for finding the truth; AuthorID is paid
	// AuthorPoints for having been picked. Either may be empty, and empty means nobody
	// is paid -- the truth has no author, and a fake has no truth-finder.
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
	GameOver  bool
	// CurrentRound is the round the game is on afterwards, which is not RoundNumber if
	// this vote closed it.
	CurrentRound int
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

// SweepConfig is how long the two kinds of row are kept. Both are short: a Fake Filler
// game is one sitting, and nothing here is a result anybody comes back to days later.
type SweepConfig struct {
	LobbyAge time.Duration
	GameAge  time.Duration
}

// SweepStale deletes old rooms and games on a ticker until ctx is cancelled.
//
// A database-only delete is safe for the same reason it is in League of Letters: socket
// rooms are ephemeral and reap themselves once empty, so nothing live is still pointing
// at anything this old.
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

// ---------------------------------------------------------------------------
// Lobbies
// ---------------------------------------------------------------------------

// CreateLobby opens a room and puts the caller in it as the host.
//
// Takes a language and nothing else, for the same reason League of Letters does: a room
// is opened the moment its host walks onto the screen, because there has to be a code
// before there is anything to share, and that is well before anybody has been asked what
// to play. The mode sits at DefaultGameMode until the settings card moves it.
func (s *Service) CreateLobby(ctx context.Context, ownerID string, locale i18n.Locale) (*FFLobby, error) {
	return s.openLobby(ctx, ownerID, locale, DefaultGameMode)
}

// openLobby is the room itself: a free code, a host in seat nought, and a mode to sit at
// until somebody moves it.
//
// Shared with Rematch, which opens a room exactly this way but carries the last one's
// mode in rather than starting over at the default -- that table has already agreed what
// it is playing, and asking again is the setup the button exists to skip.
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
		// The host is a player like any other, and the first one -- which is what puts
		// them at the top of the list and at seat nought when the prompts are dealt.
		Players:   []FFLobbyPlayer{{LobbyID: code, UserID: ownerID, Seat: 0, JoinedAt: now}},
		CreatedAt: now,
	}

	if err := s.store.CreateLobby(ctx, lobby); err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}

	return lobby, nil
}

// freeJoinCode is a free code for this game.
//
// joincode.FakeFiller, not joincode.LeagueOfLetters: the letter on the front is the whole
// of what routes a typed code, and a room minting L codes would be a room the League of
// Letters screen opens -- into a socket namespace that will never publish to it.
func (s *Service) freeJoinCode(ctx context.Context) (string, error) {
	return joincode.Free(ctx, joincode.FakeFiller, s.store.LobbyCodeTaken)
}

// Lobby reads a room back by its code.
func (s *Service) Lobby(ctx context.Context, code string) (*FFLobby, error) {
	return s.store.LobbyByCode(ctx, code)
}

// UpdateLobbySettings moves the room onto what the host has picked. Host only.
//
// Answers the whole room rather than the settings back, because this is what the rest of
// the table is shown: the same snapshot a join or a leave produces, so whatever draws the
// room screen needs no second shape for "the settings changed".
//
// Refused once a game is running: the prompts were drawn from the mode and the locale at
// kickoff, and moving either now would be a settings card describing a board that does
// not exist.
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

// JoinLobby steps into somebody else's room, and is safe to call again on a room you are
// already in -- reopening the screen must not be a second seat.
func (s *Service) JoinLobby(ctx context.Context, code, userID string) (*FFLobby, error) {
	lobby, err := s.store.LobbyByCode(ctx, code)
	if err != nil {
		return nil, err
	}

	// Already in, which is the common case: anyone who backgrounded the app and came
	// back lands here, and so does the host arriving on the room screen. Checked before
	// the started test on purpose -- somebody already in a started game is coming back
	// to it, not trying to join one.
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

// LeaveLobby gives a seat back without closing the room. A room that is already gone is a
// no-op rather than a refusal: the screen fires this on its way out, where there is
// nobody left to tell.
func (s *Service) LeaveLobby(ctx context.Context, code, userID string) error {
	return s.store.RemoveLobbyPlayer(ctx, code, userID)
}

// DeleteLobby closes a room for good. Host only, and a code that is already gone is a
// no-op for the same reason LeaveLobby is.
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

// AbandonLobby throws a room away for good, game and all. Host only.
//
// The difference from DeleteLobby is the game: that one deliberately leaves a started
// room's game alone, because it is only ever the host stepping out of a room they are
// finished with. This is the host saying they are finished with the game itself.
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
		if err := s.store.AbandonGame(ctx, *lobby.GameID); err != nil {
			return err
		}
	}

	return s.store.DeleteLobby(ctx, code)
}

// CurrentLobby is the room this player is still on the hook for: one whose game is being
// played, or failing that one they opened and nobody has started.
//
// Exists because the room screen opens a fresh lobby the moment its host walks onto it,
// so without this a host who still has something running is given a second room rather
// than asked about the first. The game is preferred over the waiting room when a host
// somehow has both: other people are sitting at it, which an empty room nobody has joined
// cannot say.
//
// Answers ErrLobbyNotFound when there is nothing to come back to, which is the ordinary
// case.
func (s *Service) CurrentLobby(ctx context.Context, userID string) (*FFLobby, error) {
	games, err := s.store.GamesByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Newest first, and only the ones this player owns: being at somebody else's table
	// is not something opening a room of your own would disturb.
	for _, game := range games {
		if game.OwnerID != userID {
			continue
		}

		lobby, err := s.store.LobbyByCode(ctx, game.LobbyID)
		if err != nil {
			// A game whose room has been deleted is not one anybody can be sent back to
			// -- the board is reached by its join code. Keep looking.
			if errors.Is(err, ErrLobbyNotFound) {
				continue
			}
			return nil, err
		}

		return lobby, nil
	}

	return s.store.WaitingLobbyByOwnerID(ctx, userID)
}

// StartLobby turns a room into a game. Host only.
//
// Everything a game is made of is settled here and never again: who is playing, in what
// order, which prompts, and who writes for which. The roster is frozen because every
// prompt is dealt to two named people and every round waits for all its voters -- a table
// that could grow or shrink mid-game would be a game waiting on somebody who was never
// dealt anything, or holding a prompt nobody is left to write.
//
// The pairing is AuthorSeats over a shuffled seating: a single cycle, which is the
// simplest way to give every player exactly two prompts and every prompt exactly two
// players. Shuffled rather than taken in seat order so the host is not forever paired
// with whoever joined first.
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
	if len(lobby.Players) < MinLobbyPlayers {
		return nil, nil, ErrNotEnoughPlayers
	}
	if len(lobby.Players) > MaxLobbyPlayers {
		return nil, nil, ErrTooManyPlayers
	}

	// By seat before the shuffle, so the shuffle starts from a defined order rather than
	// from whatever the preload happened to return. A shuffle of an undefined order is
	// still undefined, and this one is written into the rows as TurnOrder.
	seated := slices.Clone(lobby.Players)
	slices.SortFunc(seated, func(a, b FFLobbyPlayer) int { return a.Seat - b.Seat })
	rand.Shuffle(len(seated), func(i, j int) { seated[i], seated[j] = seated[j], seated[i] })

	lines, err := GetContentLines(lobby.Locale, lobby.GameMode, RoundsFor(len(seated)))
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
		// Meaningless until voting opens -- every round is written at once -- but a
		// column that is 1 from the start is one nobody has to wonder about.
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
		first, second := AuthorSeats(number, len(seated))

		round := FFRound{
			ID:              uuid.New(),
			GameID:          game.ID,
			Number:          number,
			Line:            line.Line,
			Blanks:          line.Blanks,
			AuthorOneUserID: seated[first].UserID,
			AuthorTwoUserID: seated[second].UserID,
			CreatedAt:       now,
		}

		// The truth goes in as an option now rather than at the reveal, because it is one
		// of the things being shuffled: it has to be a row before there is an order to
		// put it in. In creative mode there is no truth, so there is no row -- which is
		// the whole of what makes that mode two options instead of three.
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
//
// A new room rather than the old one wound back, and the difference is who ends up in it.
// A room that was reset would still be holding everybody who was at the table when the
// last vote went in, including whoever shut the app on it. A new code is joined by
// whoever actually turns up.
func (s *Service) Rematch(ctx context.Context, code, userID string) (*FFLobby, error) {
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

// Game reads a game back for one of its players.
//
// Somebody who is not in it gets the same answer as somebody asking about a game that
// does not exist. Being at the table is the whole of the permission model, and saying
// which of the two it is would tell a stranger the game exists.
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

// GamesByUserID is every unfinished game this player is at a table for. Feeds the
// reconnect list, so the board is deliberately not loaded with it.
func (s *Service) GamesByUserID(ctx context.Context, userID string) ([]*FFMultiDeviceGame, error) {
	return s.store.GamesByUserID(ctx, userID)
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

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
//
// The read-and-check above the insert is a courtesy, not the guard: it turns the ordinary
// mistakes -- wrong phase, somebody else's prompt, the wrong number of fills -- into
// specific refusals rather than a constraint violation. What actually makes a second
// answer impossible is the (RoundID, AuthorID) primary key, because every player at the
// table may be writing at this instant and none of them holds a lock.
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

	expected := AnswersFor(len(game.Players))
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

	// The last answer in is what opens the voting, and it is the writer's own request
	// that does it -- there is no host button here, and nothing else is running to
	// notice that the table has finished writing.
	if answered >= expected {
		opened, err := s.openVoting(ctx, game.ID)
		if err != nil {
			return nil, err
		}
		outcome.VotingOpened = opened
	}

	// Re-read rather than patched by hand: several answers may have landed while this one
	// was in flight, and the phase may have moved underneath it. What comes back has to
	// be the game as it now is.
	fresh, err := s.Game(ctx, in.GameID, in.UserID)
	if err != nil {
		return nil, err
	}
	outcome.Game = fresh

	return outcome, nil
}

// normaliseFills trims an answer and holds it to the shape of the prompt.
//
// One value per blank, none of them empty: a prompt rendered with a blank still in it, or
// with a value missing from the middle, is not a fake anybody can vote on. The count is
// checked against the round's own Blanks rather than recounted from the line, so a game
// already in flight cannot be broken by changing the placeholder.
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

// openVoting shuffles every round's options, writes the order down, and flips the game
// into its second half.
//
// The order is persisted rather than shuffled per request, and that is the whole reason
// this is a write at all. A player whose connection blipped and came back would otherwise
// be looking at the same three options in a different order -- with no way to know that
// the one they had half decided on had moved.
//
// Reports whether this call was the one that opened it. The store's write is conditional
// on the game still being in the writing phase, so a second caller is told no rather than
// re-shuffling a table that is already voting.
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

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

type CastVoteInput struct {
	GameID      uuid.UUID
	UserID      string
	RoundNumber int
	// Slot is the position the option was shown in, not its author id. A vote names a
	// seat on the screen because naming the author would mean the screen had been sent
	// the authors -- and one of them is called "__truth__".
	Slot int
}

// VoteOutcome is what one vote did, and where it left the game.
type VoteOutcome struct {
	Game        *FFMultiDeviceGame
	RoundNumber int
	// Round is the round that was voted on, reloaded after the write so its votes are
	// the ones this call produced. The reveal is built from it.
	Round *FFRound

	Votes       int
	VotesNeeded int
	RoundOver   bool
	GameOver    bool
}

// CastVote records one player's pick on the round the table is on.
//
// Same shape as SubmitAnswer and for the same reason: the checks above turn the ordinary
// mistakes into specific refusals, and the (RoundID, VoterUserID) primary key is what
// makes a second vote impossible when every voter is pressing at once.
//
// The last vote in reveals the round and moves the game on, decided inside the same
// transaction as the insert -- so exactly one voter is told the round is over, and it is
// the one whose vote ended it.
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
		VotersNeeded: VotersFor(len(game.Players)),
	}
	if guesser != 0 {
		input.GuesserID, input.GuesserPoints = in.UserID, guesser
	}
	// The truth has no author to pay. ScoreVote already answers zero for it, and the
	// second test is here so that a future rule which did pay for it still could not
	// credit points to a user id that is not a user.
	if author != 0 && !option.IsTruth() {
		input.AuthorID, input.AuthorPoints = option.AuthorID, author
	}

	result, err := s.store.RecordVote(ctx, input)
	if err != nil {
		return nil, err
	}

	// Re-read for the same reason SubmitAnswer does: the scores, the phase and the round
	// this call moved all have to come back as they now are, not as they were read.
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
		GameOver:    result.GameOver,
	}, nil
}

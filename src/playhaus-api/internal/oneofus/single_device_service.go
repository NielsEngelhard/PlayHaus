package oneofus

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand"
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type Store interface {
	CreateOneDeviceGame(ctx context.Context, game *OneOfUsSingleDeviceGame) error
	GetOneDeviceGame(ctx context.Context, ownerID string, gameID uuid.UUID) (OneOfUsSingleDeviceGame, error)
	GetOneDeviceGames(ctx context.Context, ownerID string) ([]*OneOfUsSingleDeviceGame, error)
	GetOneDeviceGamePlayers(ctx context.Context, ownerID string, gameID uuid.UUID) ([]OneOfUsLocalPlayer, error)
	VoteOutPlayerOneDeviceGame(ctx context.Context, playerID uuid.UUID) error
	SetMayorOneDeviceGame(ctx context.Context, gameID uuid.UUID, playerID uuid.UUID) error
	FinishOneDeviceGame(ctx context.Context, gameID uuid.UUID, civiliansWon bool) error
	DeleteAllSingleDeviceGamesForSpecificUser(ctx context.Context, playerID string) error
	DeleteGamesOlderThan(ctx context.Context, before time.Time) (int64, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

// SweepStaleGames deletes games older than maxAge on a ticker until ctx is cancelled.
func (s *Service) SweepStaleGames(ctx context.Context, maxAge, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			deleted, err := s.store.DeleteGamesOlderThan(ctx, time.Now().UTC().Add(-maxAge))
			if err != nil {
				log.Error("sweep stale one of us games", "err", err)
				continue
			}
			if deleted > 0 {
				log.Info("swept stale one of us games", "deleted", deleted)
			}
		}
	}
}

type StartOneOfUsSingleDeviceGameInput struct {
	OwnerID      string
	Locale       i18n.Locale
	PlayerNames  []string
	GameMode     GameMode
	EnabledRoles []Role
}

type VotePlayerOutSingleDeviceGameInput struct {
	OwnerID  string
	GameID   uuid.UUID
	PlayerID uuid.UUID
}

type VotePlayerOutSingleDeviceGameResponse struct {
	PlayerID      uuid.UUID  `json:"playerId"`
	PlayerRole    Role       `json:"playerRole"`
	GameEnded     bool       `json:"gameEnded"`
	CiviliansWon  bool       `json:"civiliansWon"`
	MayorPlayerID *uuid.UUID `json:"mayorPlayerId"`
}

func (s *Service) StartSingleDeviceGame(ctx context.Context, in StartOneOfUsSingleDeviceGameInput) (*OneOfUsSingleDeviceGame, error) {
	gameID := uuid.New()
	now := time.Now().UTC()

	players := make([]OneOfUsLocalPlayer, len(in.PlayerNames))
	for seat, name := range in.PlayerNames {
		players[seat] = OneOfUsLocalPlayer{
			PlayerID:   uuid.New(),
			SessionID:  gameID,
			Name:       name,
			Role:       Civilian,
			CreatedAt:  now,
			IsVotedOut: false,
		}
	}

	assignRoles(players, in.EnabledRoles)
	assignMayor(players)

	lines, err := GetContentLines(in.Locale, in.GameMode, 1)
	if err != nil {
		return nil, err
	}

	if len(lines) == 0 {
		return nil, fmt.Errorf("no lines found for game %s", in.OwnerID)
	}

	game := &OneOfUsSingleDeviceGame{
		ID:               gameID,
		OwnerID:          in.OwnerID,
		Locale:           in.Locale,
		CreatedAt:        now,
		ActualQuestion:   lines[0].RealLine,
		ImposterQuestion: lines[0].ImposterLine,
		Players:          players,
	}

	err = s.store.DeleteAllSingleDeviceGamesForSpecificUser(ctx, in.OwnerID)
	if err != nil {
		return nil, fmt.Errorf("error deleting old games in CreateOneDeviceGame %w", err)
	}

	err = s.store.CreateOneDeviceGame(ctx, game)
	if err != nil {
		return nil, fmt.Errorf("error creating CreateOneDeviceGame %w", err)
	}

	return game, nil
}

func (s *Service) GetSingleDeviceOneOfUsGame(ctx context.Context, ownerID string, gameID uuid.UUID) (OneOfUsSingleDeviceGame, error) {
	return s.store.GetOneDeviceGame(ctx, ownerID, gameID)
}

func (s *Service) GetSingleDeviceOneOfUsGames(ctx context.Context, ownerID string) ([]*OneOfUsSingleDeviceGame, error) {
	return s.store.GetOneDeviceGames(ctx, ownerID)
}

func (s *Service) VotePlayerOutSingleDeviceGame(ctx context.Context, in VotePlayerOutSingleDeviceGameInput) (*VotePlayerOutSingleDeviceGameResponse, error) {
	players, err := s.store.GetOneDeviceGamePlayers(ctx, in.OwnerID, in.GameID)
	if err != nil {
		return nil, err
	}

	// The index, not the player. Ranging by value and handing back `&player` takes the
	// address of the loop's own copy, so the elimination below would be written to a
	// value nothing else can see -- and `determineGameEnded`, reading the slice, would
	// still count the player it just removed. That is a win condition that fires one
	// vote late, every time.
	seat := indexOfPlayer(in.PlayerID, players)
	if seat < 0 {
		return nil, fmt.Errorf("player not found")
	}

	if players[seat].IsVotedOut {
		return nil, fmt.Errorf("player is already voted out")
	}

	players[seat].IsVotedOut = true

	if err := s.store.VoteOutPlayerOneDeviceGame(ctx, players[seat].PlayerID); err != nil {
		return nil, err
	}

	gameEnded, noMoreImposters := determineGameEnded(players)
	civiliansWon := gameEnded && noMoreImposters

	if gameEnded {
		if err := s.store.FinishOneDeviceGame(ctx, in.GameID, civiliansWon); err != nil {
			return nil, fmt.Errorf("finish game %s: %w", in.GameID, err)
		}
	}

	// The chain only moves when the vote took the person wearing it, and only while
	// there is still a game to break a tie in. Redrawn rather than handed to a
	// neighbour -- see MayorCandidates for why -- and written before the response is
	// built so the app is told who has it in the same breath as who left.
	//
	// A mayor voted out of a game that has just ended is left where they are: the reveal
	// screen names everybody anyway, and moving an office nobody will use again would
	// only be a write that can fail on the last request of the game.
	mayor := mayorOf(players)
	if !gameEnded && players[seat].IsMayor {
		if next := assignMayor(players); next >= 0 {
			if err := s.store.SetMayorOneDeviceGame(ctx, in.GameID, players[next].PlayerID); err != nil {
				return nil, fmt.Errorf("hand the mayor's chain on in game %s: %w", in.GameID, err)
			}

			mayor = &players[next].PlayerID
		}
	}

	return &VotePlayerOutSingleDeviceGameResponse{
		PlayerID:      players[seat].PlayerID,
		PlayerRole:    players[seat].Role,
		GameEnded:     gameEnded,
		CiviliansWon:  civiliansWon,
		MayorPlayerID: mayor,
	}, nil
}

// mayorOf is whoever is wearing the chain in this slice, or nil for a table that has
// none. Nil rather than the zero uuid so the wire shape says "nobody" out loud: the app
// reads a missing mayor as a game with no tie-breaker to name, which is a real state on
// the last screen and must not be confused with a player whose id failed to parse.
func mayorOf(players []OneOfUsLocalPlayer) *uuid.UUID {
	for index, player := range players {
		if player.IsMayor && !player.IsVotedOut {
			return &players[index].PlayerID
		}
	}

	return nil
}

// assignMayor draws a new mayor out of everybody still in the game and takes the chain
// off whoever had it. Returns the index it landed on, or -1 for a table with nobody left
// to give it to.
//
// The draw is uniform over the survivors and blind to role, which is the office: an
// imposter is exactly as likely to be handed the casting vote as anybody else, and the
// table is never told which they are. Randomness lives here rather than in rules.go for
// the same reason assignRoles keeps rand.Perm out of ImpostersFor -- the rules stay pure
// and testable, and the service is the only thing that rolls dice.
func assignMayor(players []OneOfUsLocalPlayer) int {
	candidates := MayorCandidates(players)

	for index := range players {
		players[index].IsMayor = false
	}

	if len(candidates) == 0 {
		return -1
	}

	chosen := candidates[rand.Intn(len(candidates))]
	players[chosen].IsMayor = true

	return chosen
}

// indexOfPlayer is where a player sits in the slice, or -1 when they are not at this
// table. An index rather than a pointer so callers mutate the slice itself; see the note
// at the call site.
func indexOfPlayer(playerID uuid.UUID, players []OneOfUsLocalPlayer) int {
	for index, player := range players {
		if player.PlayerID == playerID {
			return index
		}
	}

	return -1
}

// determineGameEnded reads the table after an elimination and says whether it is over,
// and whether that is because the imposters are all gone.
//
// The two endings are not symmetrical. Civilians have to finish the job -- every imposter
// out -- while the imposters only have to survive to parity, because from there they can
// outvote the room and nothing the civilians do can change it.
func determineGameEnded(players []OneOfUsLocalPlayer) (bool, bool) {
	civilians := 0
	activePlayers := 0

	for _, player := range players {
		if player.IsVotedOut {
			continue
		}

		activePlayers++

		if player.Role.WithCivilians() {
			civilians++
		}
	}

	civiliansInMinority := civilians <= activePlayers/2
	noMoreImposters := activePlayers == civilians
	gameEnded := civiliansInMinority || noMoreImposters

	return gameEnded, noMoreImposters
}

// assignRoles deals the table: everybody arrives a civilian, some of them leave here
// lying, and depending on the table's size and its settings one of the liars leaves here
// with nothing at all.
//
// Which roles are dealt and how many of each is RolesFor's decision, not this function's
// -- the split is the package's usual one, with the rule pure and testable in rules.go
// and the randomness confined to the service. What is left here is the draw: a fair
// permutation, and the hand laid onto the front of it. That the hand happens to be
// ordered (nitwits first) does not bias anybody, because the seats it is laid onto are
// not -- indices[0] is as uniformly chosen as any other seat in the table.
func assignRoles(players []OneOfUsLocalPlayer, enabled []Role) {
	hand := RolesFor(len(players), enabled)
	if len(hand) == 0 {
		return
	}

	indices := rand.Perm(len(players))

	for seat, role := range hand {
		players[indices[seat]].Role = role
	}
}

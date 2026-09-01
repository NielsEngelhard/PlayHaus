package oneofus

import (
	"context"
	"fmt"
	"math/rand"
	"playhaus-api/internal/i18n"
	"time"

	"github.com/google/uuid"
)

type GameInputLine struct {
	RealLine     string
	ImposterLine string
}

type Store interface {
	CreateOneDeviceGame(ctx context.Context, game *OneOfUsSingleDeviceGame) error
	GetOneDeviceGame(ctx context.Context, ownerID string, gameID uuid.UUID) (OneOfUsSingleDeviceGame, error)
	GetOneDeviceGames(ctx context.Context, ownerID string) ([]*OneOfUsSingleDeviceGame, error)
	GetOneDeviceGamePlayers(ctx context.Context, ownerID string, gameID uuid.UUID) ([]OneOfUsLocalPlayer, error)
	VoteOutPlayerOneDeviceGame(ctx context.Context, playerID uuid.UUID) error
	FinishOneDeviceGame(ctx context.Context, gameID uuid.UUID, civiliansWon bool) error
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

type StartOneOfUsSingleDeviceGameInput struct {
	OwnerID     string
	Locale      i18n.Locale
	PlayerNames []string
	GameMode    GameMode
}

type VotePlayerOutSingleDeviceGameInput struct {
	OwnerID  string
	GameID   uuid.UUID
	PlayerID uuid.UUID
}

type VotePlayerOutSingleDeviceGameResponse struct {
	PlayerID     uuid.UUID `json:"playerId"`
	PlayerRole   Role      `json:"playerRole"`
	GameEnded    bool      `json:"gameEnded"`
	CiviliansWon bool      `json:"civiliansWon"`
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

	assignRoles(players)

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

	return &VotePlayerOutSingleDeviceGameResponse{
		PlayerID:     players[seat].PlayerID,
		PlayerRole:   players[seat].Role,
		GameEnded:    gameEnded,
		CiviliansWon: civiliansWon,
	}, nil
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
// lying, and on a big enough table one of the liars leaves here with nothing at all.
//
// The nitwit is promoted out of the imposters rather than drawn separately, which is
// what keeps the sides the size ImpostersFor promised. Drawing them from the civilians
// instead would quietly add a fourth liar to a nine-player game and move the win
// condition with it.
//
// The permutation is already a fair shuffle, so taking the nitwit off the front of the
// same draw needs no second round of randomness -- indices[0] is as uniformly chosen as
// any other seat in it.
func assignRoles(players []OneOfUsLocalPlayer) {
	amountOfImposters := ImpostersFor(len(players))

	if amountOfImposters <= 0 || amountOfImposters > len(players) {
		return
	}

	indices := rand.Perm(len(players))
	dealt := indices[:amountOfImposters]

	for _, index := range dealt {
		players[index].Role = Imposter
	}

	// Clamped against the draw rather than trusted: NitwitsFor only says yes once there
	// are three imposters to pick from, but a future change to either number should
	// deal a strange table rather than panic on one.
	for _, index := range dealt[:min(NitwitsFor(len(players)), len(dealt))] {
		players[index].Role = Nitwit
	}
}

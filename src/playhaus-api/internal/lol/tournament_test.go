package lol

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"playhaus-api/internal/i18n"
)

// seatTournament opens a tournament lobby and walks size players into it, host first.
func seatTournament(t *testing.T, service *Service, size int) (*MultiplayerLeagueOfLettersLobby, []string) {
	t.Helper()

	ctx := context.Background()
	lobby, err := service.CreateLobby(ctx, "host", i18n.NL, LobbyTournament)
	if err != nil {
		t.Fatalf("create tournament lobby: %v", err)
	}

	players := []string{"host"}
	for i := 1; i < size; i++ {
		userID := fmt.Sprintf("player-%d", i)
		if _, err := service.JoinLobby(ctx, lobby.ID, userID); err != nil {
			t.Fatalf("join as %s: %v", userID, err)
		}
		players = append(players, userID)
	}

	lobby, err = service.Lobby(ctx, lobby.ID)
	if err != nil {
		t.Fatalf("read tournament lobby: %v", err)
	}

	return lobby, players
}

// playOutStage runs every live match of the stage on the table out on the clock.
func playOutStage(t *testing.T, service *Service, tournament *Tournament) *Tournament {
	t.Helper()

	ctx := context.Background()
	for _, match := range tournament.MatchesInStage(tournament.Stage) {
		if match.Status != MatchLive || match.GameID == nil {
			continue
		}

		for turn := 0; ; turn++ {
			outcome, err := service.SkipTurn(ctx, *match.GameID)
			if err != nil {
				t.Fatalf("skip turn in match %s: %v", match.ID, err)
			}
			if outcome.GameOver {
				break
			}
			if turn > 200 {
				t.Fatalf("match %s never ended", match.ID)
			}
		}
	}

	tournament, err := service.TournamentByID(ctx, tournament.ID)
	if err != nil {
		t.Fatalf("reload tournament: %v", err)
	}
	return tournament
}

// readyEveryone presses READY for every player still in the bracket.
func readyEveryone(t *testing.T, service *Service, tournament *Tournament) *Tournament {
	t.Helper()

	ctx := context.Background()
	var latest *Tournament
	for _, player := range tournament.Players {
		if player.Eliminated() {
			continue
		}

		updated, err := service.ReadyUp(ctx, tournament.LobbyID, player.UserID)
		if err != nil {
			t.Fatalf("ready up as %s: %v", player.UserID, err)
		}
		latest = updated
	}

	return latest
}

func TestATournamentLobbyHoldsTwelvePlayers(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	lobby, _ := seatTournament(t, service, MaxTournamentPlayers)
	if len(lobby.Players) != MaxTournamentPlayers {
		t.Fatalf("seated %d players, want %d", len(lobby.Players), MaxTournamentPlayers)
	}

	_, err := service.JoinLobby(context.Background(), lobby.ID, "one-too-many")
	if !errors.Is(err, ErrLobbyFull) {
		t.Fatalf("the thirteenth player got %v, want %v", err, ErrLobbyFull)
	}
}

func TestATournamentNeedsFourPlayers(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	lobby, _ := seatTournament(t, service, MinTournamentPlayers-1)

	_, err := service.CreateTournament(context.Background(), lobby.ID, "host")
	if !errors.Is(err, ErrNotEnoughPlayers) {
		t.Fatalf("three players got %v, want %v", err, ErrNotEnoughPlayers)
	}
}

func TestTheHostCannotStartATournamentTwice(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	ctx := context.Background()
	lobby, _ := seatTournament(t, service, 4)

	if _, err := service.CreateTournament(ctx, lobby.ID, "host"); err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	_, err := service.CreateTournament(ctx, lobby.ID, "host")
	if !errors.Is(err, ErrLobbyStarted) {
		t.Fatalf("the second press got %v, want %v", err, ErrLobbyStarted)
	}
}

func TestOnlyTheHostStartsTheTournament(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	lobby, _ := seatTournament(t, service, 4)

	_, err := service.CreateTournament(context.Background(), lobby.ID, "player-1")
	if !errors.Is(err, ErrNotHost) {
		t.Fatalf("a guest got %v, want %v", err, ErrNotHost)
	}
}

func TestTheFirstStageOpensARoomPerMatch(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	ctx := context.Background()
	lobby, players := seatTournament(t, service, 4)

	tournament, err := service.CreateTournament(ctx, lobby.ID, "host")
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	matches := tournament.MatchesInStage(1)
	if len(matches) != 2 {
		t.Fatalf("stage 1 drew %d matches, want 2", len(matches))
	}

	seen := map[string]bool{}
	for _, match := range matches {
		if match.LobbyID == nil || match.GameID == nil {
			t.Fatalf("match %s opened no room", match.ID)
		}

		room, err := service.Lobby(ctx, *match.LobbyID)
		if err != nil {
			t.Fatalf("read match room: %v", err)
		}
		if room.Status != LobbyStarted {
			t.Fatalf("match room is %s, want %s", room.Status, LobbyStarted)
		}
		if room.TournamentID == nil || *room.TournamentID != tournament.ID {
			t.Fatal("match room does not point back at its bracket")
		}

		for _, player := range match.Players {
			seen[player.UserID] = true
		}
	}

	for _, userID := range players {
		if !seen[userID] {
			t.Fatalf("%s was not drawn into stage 1", userID)
		}
	}
}

func TestFinishingAMatchRecordsItsWinnerInTheBracket(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	ctx := context.Background()
	lobby, _ := seatTournament(t, service, 4)

	tournament, err := service.CreateTournament(ctx, lobby.ID, "host")
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	match := tournament.MatchesInStage(1)[0]
	// Every turn runs out, so the tie falls back to turn order and the first slot takes it.
	want := match.Players[0].UserID

	for {
		outcome, err := service.SkipTurn(ctx, *match.GameID)
		if err != nil {
			t.Fatalf("skip turn: %v", err)
		}
		if outcome.GameOver {
			if outcome.TournamentCode != lobby.ID {
				t.Fatalf("the finished match answered with %q, want %q", outcome.TournamentCode, lobby.ID)
			}
			break
		}
	}

	tournament, err = service.TournamentByID(ctx, tournament.ID)
	if err != nil {
		t.Fatalf("reload tournament: %v", err)
	}

	settled := tournament.MatchesInStage(1)[0]
	if settled.Status != MatchDone {
		t.Fatalf("match is %s, want %s", settled.Status, MatchDone)
	}
	if settled.WinnerID == nil || *settled.WinnerID != want {
		t.Fatalf("match winner is %v, want %s", settled.WinnerID, want)
	}
	for _, player := range settled.Players {
		if player.Place == 0 {
			t.Fatalf("%s was left without a place", player.UserID)
		}
	}

	loser := settled.Players[1].UserID
	if got := tournament.Player(loser); got.Losses != 1 {
		t.Fatalf("%s carries %d losses, want 1", loser, got.Losses)
	}
	if got := tournament.Player(want); got.Losses != 0 {
		t.Fatalf("the winner carries %d losses, want 0", got.Losses)
	}
}

func TestTheNextStageWaitsForEveryoneToBeReady(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	ctx := context.Background()
	lobby, _ := seatTournament(t, service, 4)

	tournament, err := service.CreateTournament(ctx, lobby.ID, "host")
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	// Nobody may ready while a match of the stage is still being played.
	if _, err := service.ReadyUp(ctx, lobby.ID, "host"); !errors.Is(err, ErrStageNotOver) {
		t.Fatalf("readying mid-stage got %v, want %v", err, ErrStageNotOver)
	}

	tournament = playOutStage(t, service, tournament)
	if !tournament.StageOver() {
		t.Fatal("the stage did not finish")
	}

	tournament, err = service.ReadyUp(ctx, lobby.ID, "host")
	if err != nil {
		t.Fatalf("ready up: %v", err)
	}
	if tournament.Stage != 1 {
		t.Fatalf("one press moved the bracket to stage %d", tournament.Stage)
	}

	tournament = readyEveryone(t, service, tournament)
	if tournament.Stage != 2 {
		t.Fatalf("the bracket sits on stage %d, want 2", tournament.Stage)
	}
	if len(tournament.MatchesInStage(2)) == 0 {
		t.Fatal("stage 2 drew no matches")
	}
}

func TestLosingTwiceEliminatesAPlayer(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	ctx := context.Background()
	lobby, _ := seatTournament(t, service, 4)

	tournament, err := service.CreateTournament(ctx, lobby.ID, "host")
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	for stage := 0; tournament.Status != TournamentCompleted; stage++ {
		tournament = playOutStage(t, service, tournament)
		if tournament.Status == TournamentCompleted {
			break
		}

		tournament = readyEveryone(t, service, tournament)
		if stage > 8 {
			t.Fatal("the bracket never crowned a champion")
		}
	}

	if tournament.WinnerID == nil {
		t.Fatal("the tournament finished without a champion")
	}

	placements := map[int]string{}
	for _, player := range tournament.Players {
		if player.UserID == *tournament.WinnerID {
			continue
		}
		if player.Placement == nil {
			t.Fatalf("%s finished without a placement", player.UserID)
		}
		if seated, taken := placements[*player.Placement]; taken {
			t.Fatalf("%s and %s both finished %d", seated, player.UserID, *player.Placement)
		}
		placements[*player.Placement] = player.UserID

		if player.Losses < TournamentLossesAllowed && *player.Placement != 2 {
			t.Fatalf("%s finished %d with only %d losses", player.UserID, *player.Placement, player.Losses)
		}
	}

	champion := tournament.Player(*tournament.WinnerID)
	if champion.Placement == nil || *champion.Placement != 1 {
		t.Fatalf("the champion placed %v, want 1", champion.Placement)
	}
}

func TestAnEliminatedPlayerDoesNotHoldUpTheReadyGate(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	ctx := context.Background()
	lobby, _ := seatTournament(t, service, 4)

	tournament, err := service.CreateTournament(ctx, lobby.ID, "host")
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	// Two stages is enough for somebody to have lost twice.
	tournament = playOutStage(t, service, tournament)
	tournament = readyEveryone(t, service, tournament)
	tournament = playOutStage(t, service, tournament)

	var out *TournamentPlayer
	for i := range tournament.Players {
		if tournament.Players[i].Eliminated() {
			out = &tournament.Players[i]
			break
		}
	}
	if out == nil {
		t.Fatal("nobody was knocked out in two stages")
	}

	// The knocked-out player never presses, and the stage moves on regardless.
	tournament = readyEveryone(t, service, tournament)
	if tournament.Stage != 3 {
		t.Fatalf("the bracket sits on stage %d, want 3", tournament.Stage)
	}

	// They may still ask, and are simply handed the bracket back.
	watching, err := service.ReadyUp(ctx, lobby.ID, out.UserID)
	if err != nil {
		t.Fatalf("an eliminated player readying got %v", err)
	}
	if watching.Stage != 3 {
		t.Fatalf("an eliminated player moved the bracket to stage %d", watching.Stage)
	}
}

func TestAMatchRoomIsNotThePlayersToClose(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	ctx := context.Background()
	lobby, _ := seatTournament(t, service, 4)

	tournament, err := service.CreateTournament(ctx, lobby.ID, "host")
	if err != nil {
		t.Fatalf("create tournament: %v", err)
	}

	room := *tournament.MatchesInStage(1)[0].LobbyID
	if err := service.DeleteLobby(ctx, room, "host"); !errors.Is(err, ErrTournamentRoom) {
		t.Fatalf("deleting a match room got %v, want %v", err, ErrTournamentRoom)
	}
	if _, err := service.Rematch(ctx, room, "host"); !errors.Is(err, ErrTournamentRoom) {
		t.Fatalf("a rematch of a match room got %v, want %v", err, ErrTournamentRoom)
	}
}

func TestATournamentLobbyIsNotStartedLikeAGame(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Options{DevMode: true})

	lobby, _ := seatTournament(t, service, 4)

	_, _, err := service.StartLobby(context.Background(), lobby.ID, "host")
	if !errors.Is(err, ErrTournamentRoom) {
		t.Fatalf("starting a tournament lobby got %v, want %v", err, ErrTournamentRoom)
	}
}

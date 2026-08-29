package oneofus

import (
	"playhaus-api/internal/i18n"
	"testing"

	"github.com/google/uuid"
)

// Every list the game can deal from has to be readable, in both languages and both
// modes. This is pinned because the path template used to carry a placeholder nothing
// substituted, so every lookup missed and every game failed to start with a 500 -- a
// break that no test caught because nothing read the files.
func TestGetContentLinesReadsEveryList(t *testing.T) {
	for _, locale := range []i18n.Locale{i18n.EN, i18n.NL} {
		for _, mode := range []GameMode{Word, Sentence} {
			lines, err := GetContentLines(locale, mode, 1)
			if err != nil {
				t.Errorf("GetContentLines(%s, %s): %v", locale, mode, err)
				continue
			}

			if len(lines) != 1 {
				t.Errorf("GetContentLines(%s, %s) returned %d lines, want 1", locale, mode, len(lines))
				continue
			}

			if lines[0].RealLine == "" || lines[0].ImposterLine == "" {
				t.Errorf("GetContentLines(%s, %s) returned a half-empty pair: %+v", locale, mode, lines[0])
			}
		}
	}
}

// table builds a game of `civilians` civilians and `imposters` imposters.
func table(civilians, imposters int) []OneOfUsLocalPlayer {
	players := make([]OneOfUsLocalPlayer, 0, civilians+imposters)

	for range civilians {
		players = append(players, OneOfUsLocalPlayer{PlayerID: uuid.New(), Role: Civilian})
	}
	for range imposters {
		players = append(players, OneOfUsLocalPlayer{PlayerID: uuid.New(), Role: Imposter})
	}

	return players
}

// voteOut is the half of VotePlayerOutSingleDeviceGame that decides the game, without
// the store: find the seat, mark it, ask whether that ended things. Mirroring the
// service this closely is the point -- the bug it guards against was an aliasing
// mistake between exactly these two steps.
func voteOut(t *testing.T, players []OneOfUsLocalPlayer, playerID uuid.UUID) (ended bool, civiliansWon bool) {
	t.Helper()

	seat := indexOfPlayer(playerID, players)
	if seat < 0 {
		t.Fatalf("player %s is not at this table", playerID)
	}

	players[seat].IsVotedOut = true

	ended, noMoreImposters := determineGameEnded(players)
	return ended, ended && noMoreImposters
}

// firstAlive is the next player of a role still in the game.
func firstAlive(t *testing.T, players []OneOfUsLocalPlayer, role Role) uuid.UUID {
	t.Helper()

	for _, player := range players {
		if !player.IsVotedOut && player.Role == role {
			return player.PlayerID
		}
	}

	t.Fatalf("no living player with role %d", role)
	return uuid.Nil
}

// The civilians' ending: it takes every imposter, and it does not arrive early.
//
// Six players and two imposters, so the first imposter out leaves 4 civilians against 1
// -- nowhere near parity, and the game has to carry on. The elimination has to be
// visible to the count for that to come out right, which is what the old code got
// wrong: it marked a copy, so the tally still saw the player it had just removed.
func TestCiviliansWinOnlyWhenTheLastImposterGoes(t *testing.T) {
	players := table(4, 2)

	ended, civiliansWon := voteOut(t, players, firstAlive(t, players, Imposter))
	if ended {
		t.Fatalf("game ended with an imposter still in it (civiliansWon=%v)", civiliansWon)
	}

	ended, civiliansWon = voteOut(t, players, firstAlive(t, players, Imposter))
	if !ended || !civiliansWon {
		t.Errorf("last imposter out: ended=%v civiliansWon=%v, want true/true", ended, civiliansWon)
	}
}

// The imposters' ending: parity, not elimination. Four players and one imposter -- two
// civilians out leaves 1 against 1, from where the imposter can outvote the room.
func TestImpostersWinAtParity(t *testing.T) {
	players := table(3, 1)

	if ended, _ := voteOut(t, players, firstAlive(t, players, Civilian)); ended {
		t.Fatal("game ended at 2 civilians against 1 imposter")
	}

	ended, civiliansWon := voteOut(t, players, firstAlive(t, players, Civilian))
	if !ended {
		t.Fatal("game did not end at parity")
	}
	if civiliansWon {
		t.Error("civilians won a game that reached parity with an imposter alive")
	}
}

// A dealt table always has somebody lying and somebody to lie to.
func TestAssignImpostersDealsBothSides(t *testing.T) {
	for size := MinPlayers; size <= MaxPlayers; size++ {
		players := table(size, 0)
		assignImposters(players)

		imposters := 0
		for _, player := range players {
			if player.Role == Imposter {
				imposters++
			}
		}

		if want := ImpostersFor(size); imposters != want {
			t.Errorf("%d players: dealt %d imposters, want %d", size, imposters, want)
		}

		if imposters == 0 || imposters == size {
			t.Errorf("%d players: dealt a one-sided table (%d imposters)", size, imposters)
		}
	}
}

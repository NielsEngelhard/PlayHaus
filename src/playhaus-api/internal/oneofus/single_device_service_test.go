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

// dealt counts a table by role.
func dealt(players []OneOfUsLocalPlayer) (civilians, imposters, nitwits int) {
	for _, player := range players {
		switch player.Role {
		case Civilian:
			civilians++
		case Imposter:
			imposters++
		case Nitwit:
			nitwits++
		}
	}

	return civilians, imposters, nitwits
}

// A dealt table always has somebody lying and somebody to lie to.
//
// The count that matters is imposters *and* nitwits against civilians: the nitwit is
// dealt out of the imposters' share, so a table that grew one has exactly as many people
// in the dark as it did before the role existed.
func TestAssignRolesDealsBothSides(t *testing.T) {
	for size := MinPlayers; size <= MaxPlayers; size++ {
		players := table(size, 0)
		assignRoles(players)

		civilians, imposters, nitwits := dealt(players)
		lying := imposters + nitwits

		if want := ImpostersFor(size); lying != want {
			t.Errorf("%d players: dealt %d in the dark, want %d", size, lying, want)
		}

		if lying == 0 || civilians == 0 {
			t.Errorf("%d players: dealt a one-sided table (%d lying, %d civilians)",
				size, lying, civilians)
		}
	}
}

// The nitwit shows up exactly where NitwitsFor says it should, and never twice.
func TestAssignRolesDealsAtMostOneNitwit(t *testing.T) {
	for size := MinPlayers; size <= MaxPlayers; size++ {
		// Dealt from a shuffle, so one deal proves nothing. Repeating it is what makes
		// "never two" a claim about the rule rather than about one lucky permutation.
		for range 200 {
			players := table(size, 0)
			assignRoles(players)

			_, imposters, nitwits := dealt(players)

			if want := NitwitsFor(size); nitwits != want {
				t.Fatalf("%d players: dealt %d nitwits, want %d", size, nitwits, want)
			}

			// The role is only worth having while somebody else still knows the word.
			if nitwits > 0 && imposters == 0 {
				t.Fatalf("%d players: the nitwit is the whole imposter side", size)
			}
		}
	}
}

// A nitwit is an imposter as far as winning goes. Nothing in determineGameEnded spells
// the roles out any more, and this is the test that says it must not start: a nitwit
// counted as a civilian would end the game a vote early and hand it to the wrong side.
func TestNitwitCountsAgainstTheCivilians(t *testing.T) {
	players := table(4, 1)
	players = append(players, OneOfUsLocalPlayer{PlayerID: uuid.New(), Role: Nitwit})

	// Four civilians, one imposter, one nitwit. Taking the imposter leaves 4 against 1,
	// which is neither parity nor a clean sweep.
	if ended, _ := voteOut(t, players, firstAlive(t, players, Imposter)); ended {
		t.Fatal("game ended with the nitwit still in it")
	}

	ended, civiliansWon := voteOut(t, players, firstAlive(t, players, Nitwit))
	if !ended || !civiliansWon {
		t.Errorf("nitwit out last: ended=%v civiliansWon=%v, want true/true", ended, civiliansWon)
	}
}

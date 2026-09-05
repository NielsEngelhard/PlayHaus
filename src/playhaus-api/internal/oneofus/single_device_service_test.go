package oneofus

import (
	"playhaus-api/internal/i18n"
	"slices"
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
		assignRoles(players, nil)

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
			assignRoles(players, nil)

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

// The imposter can land on any seat, not just the last one dealt.
//
// assignRoles lays a hand onto a Fisher-Yates permutation of the seats
// (`indices[seat]`, not `seat` itself), so nothing about seat order should favour any one
// player. This is the test that would have caught it if it did: four players and one
// imposter, dealt four thousand times, with every seat expected to come up roughly a
// quarter of the time. The tolerance is wide on purpose -- five-plus standard deviations
// around the expected count -- so this fails on a real bias (say, always the last seat)
// and not on ordinary shuffle noise.
func TestAssignRolesPicksAnyImposterSeatUniformly(t *testing.T) {
	const trials = 4000
	const seats = 4

	var landedOn [seats]int

	for range trials {
		players := table(seats, 0)
		assignRoles(players, nil)

		for seat, player := range players {
			if player.Role == Imposter {
				landedOn[seat]++
			}
		}
	}

	want := trials / seats
	tolerance := want / 4 // generous: a real "always seat N" bug misses by the whole width.

	for seat, count := range landedOn {
		if count < want-tolerance || count > want+tolerance {
			t.Errorf("seat %d was dealt the imposter %d/%d times, want roughly %d", seat, count, trials, want)
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

// Exactly one chain at the deal, whatever the table size.
func TestAssignMayorDealsExactlyOne(t *testing.T) {
	for size := MinPlayers; size <= MaxPlayers; size++ {
		players := table(size, 0)
		assignMayor(players)

		mayors := 0
		for _, player := range players {
			if player.IsMayor {
				mayors++
			}
		}

		if mayors != MayorsPerTable {
			t.Errorf("table of %d was dealt %d mayors, want %d", size, mayors, MayorsPerTable)
		}
	}
}

// Redrawing takes the chain off whoever had it. Two mayors on one table is two casting
// votes, which is the tie the office exists to settle.
func TestAssignMayorTakesTheChainOffTheLastOne(t *testing.T) {
	players := table(4, 1)
	players[0].IsMayor = true
	players[0].IsVotedOut = true

	next := assignMayor(players)
	if next < 0 {
		t.Fatal("assignMayor found nobody to hand the chain to on a table with four seats left")
	}

	if players[0].IsMayor {
		t.Error("the voted-out mayor is still wearing the chain")
	}

	if !players[next].IsMayor {
		t.Errorf("assignMayor returned seat %d but did not mark it", next)
	}
}

// The new mayor is somebody still in the game -- never the seat that has just left.
func TestAssignMayorNeverPicksSomebodyVotedOut(t *testing.T) {
	// Repeated because the draw is random: one pass proves very little about a uniform
	// pick over three survivors, and this is the invariant that a bad candidate list
	// would break only sometimes.
	for range 200 {
		players := table(3, 2)
		players[0].IsVotedOut = true
		players[1].IsVotedOut = true

		next := assignMayor(players)
		if next < 0 {
			t.Fatal("assignMayor found nobody on a table with three seats left")
		}

		if players[next].IsVotedOut {
			t.Fatalf("assignMayor handed the chain to seat %d, who is voted out", next)
		}
	}
}

// The last screen of the game: everybody is out, so there is nobody to break a tie for
// and assignMayor says so rather than picking a seat that has left.
func TestAssignMayorOnAnEmptiedTable(t *testing.T) {
	players := table(2, 0)
	for index := range players {
		players[index].IsVotedOut = true
	}
	players[0].IsMayor = true

	if next := assignMayor(players); next >= 0 {
		t.Errorf("assignMayor returned seat %d on a table with nobody left, want -1", next)
	}

	if players[0].IsMayor {
		t.Error("the chain is still on a table with nobody left to wear it")
	}
}

// Over enough deals the chain lands on a liar, because it is drawn from the whole room.
// A mayor that could only ever be a civilian would be a free reading of somebody's role.
func TestAssignMayorEventuallyLandsOnAnImposter(t *testing.T) {
	for range 500 {
		players := table(2, 1)
		next := assignMayor(players)

		if next >= 0 && !players[next].Role.WithCivilians() {
			return
		}
	}

	t.Error("500 deals of a three-player table never made the imposter mayor")
}

// A role that was switched off never reaches a seat.
//
// Every set the row can produce, at every table size, repeated because the deal is a
// shuffle -- the same reason TestAssignRolesDealsAtMostOneNitwit runs its 200. The
// counts are RolesFor's business and are pinned in rules_test.go; what this proves is
// that the draw actually lays that hand down instead of dealing its own.
func TestAssignRolesNeverDealsADisabledRole(t *testing.T) {
	sets := [][]Role{
		{Imposter},
		{Nitwit},
		{Imposter, Nitwit},
	}

	for _, enabled := range sets {
		for size := MinPlayers; size <= MaxPlayers; size++ {
			for range 50 {
				players := table(size, 0)
				assignRoles(players, enabled)

				for _, player := range players {
					if player.Role == Civilian {
						continue
					}

					if !slices.Contains(enabled, player.Role) {
						t.Fatalf("%d players, enabled %v: dealt role %d", size, enabled, player.Role)
					}
				}
			}
		}
	}
}

// A table with the imposter switched off still has two sides to it.
//
// The one deal where the counts and the win condition could come apart: every liar is a
// nitwit, so nothing on that side knows the word, and determineGameEnded has to keep
// reading them as the side to be found. If WithCivilians ever stopped covering the
// nitwit this is the test that would catch it, because this is the game where the nitwit
// is the whole of the opposition.
func TestATableOfNothingButNitwitsStillHasTwoSides(t *testing.T) {
	for size := MinPlayers; size <= MaxPlayers; size++ {
		players := table(size, 0)
		assignRoles(players, []Role{Nitwit})

		civilians, imposters, nitwits := dealt(players)

		if imposters != 0 {
			t.Errorf("%d players: dealt %d imposters with the role switched off", size, imposters)
		}

		if want := ImpostersFor(size); nitwits != want {
			t.Errorf("%d players: dealt %d nitwits, want %d", size, nitwits, want)
		}

		if civilians == 0 {
			t.Errorf("%d players: nobody left to lie to", size)
		}
	}
}

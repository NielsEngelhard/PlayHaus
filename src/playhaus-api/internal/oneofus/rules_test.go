package oneofus

import (
	"slices"
	"testing"
)

// The rules, asked directly.
//
// These carry more weight here than in the other two games, because most of what they
// pin has no caller yet: there is no voting path, no reveal and no scoring, so this file
// is the only thing standing between the design in rules.go and a comment nobody
// noticed had drifted. When those paths do get written, they should be written against
// these answers rather than working them out again.

func TestPlayerCountOK(t *testing.T) {
	for _, n := range []int{MinPlayers, MinPlayers + 1, MaxPlayers} {
		if !PlayerCountOK(n) {
			t.Errorf("PlayerCountOK(%d) = false, want true", n)
		}
	}
	// Two is out on purpose: an imposter with exactly one accuser is a coin toss.
	for _, n := range []int{0, 1, 2, MaxPlayers + 1} {
		if PlayerCountOK(n) {
			t.Errorf("PlayerCountOK(%d) = true, want false", n)
		}
	}
}

func TestImpostersForSpreadsOneInThree(t *testing.T) {
	// Pins today's answers. A change here changes how hard a round is to read, so it
	// should be a deliberate edit to this table rather than a surprise.
	for _, tc := range []struct {
		players, want int
	}{
		{3, 1}, // the smallest table: exactly one
		{5, 1}, // still one -- five is not two threes
		{6, 2}, // and now two
		{9, 3},
		{MaxPlayers, 3}, // nine is exactly three threes
	} {
		if got := ImpostersFor(tc.players); got != tc.want {
			t.Errorf("ImpostersFor(%d) = %d, want %d", tc.players, got, tc.want)
		}
	}
}

// A round with nobody lying has nothing to vote on. MinPlayers is checked in the HTTP
// layer only, so the service can be reached with a table too small to divide -- and
// players/3 on its own would deal exactly that round.
func TestImpostersForNeverDealsARoundWithNobodyLying(t *testing.T) {
	for _, players := range []int{0, 1, 2} {
		if got := ImpostersFor(players); got != MinImposters {
			t.Errorf("ImpostersFor(%d) = %d, want the floor of %d", players, got, MinImposters)
		}
	}
}

// Every table that is allowed to play has to have somebody to catch and somebody to do
// the catching. An imposter count that reached the table size would be a round where
// everybody was lying and the vote meant nothing.
func TestEveryLegalTableHasBothSides(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		imposters := ImpostersFor(players)
		if imposters < MinImposters {
			t.Errorf("a table of %d has %d imposters", players, imposters)
		}
		if imposters >= players {
			t.Errorf("a table of %d is %d imposters -- nobody is telling the truth", players, imposters)
		}
		// It takes two to catch one, so a table has to be able to raise them.
		if players-imposters < MinVotesToCatch {
			t.Errorf("a table of %d leaves %d honest players, too few to reach %d votes",
				players, players-imposters, MinVotesToCatch)
		}
	}
}

// The nitwit only appears once a table is dealing enough imposters to give one up.
func TestNitwitsForArrivesWithTheThirdImposter(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		want := 0
		if ImpostersFor(players) >= MinImpostersForNitwit {
			want = MaxNitwits
		}

		if got := NitwitsFor(players); got != want {
			t.Errorf("NitwitsFor(%d) = %d, want %d (%d imposters)",
				players, got, want, ImpostersFor(players))
		}
	}
}

// Pins where the line actually falls today, which is the thing a player notices: only a
// full table of nine gets one. Moving it should be an edit to this table.
func TestNitwitsForIsTheNinePlayerRole(t *testing.T) {
	for _, tc := range []struct {
		players, want int
	}{
		{3, 0},
		{5, 0},
		{6, 0}, // two imposters, and giving one up would leave a single liar who knows
		{8, 0},
		{9, 1},
		{MaxPlayers, 1},
	} {
		if got := NitwitsFor(tc.players); got != tc.want {
			t.Errorf("NitwitsFor(%d) = %d, want %d", tc.players, got, tc.want)
		}
	}
}

// Whenever a nitwit is dealt there are still imposters left who were given the word.
// A side made up entirely of people with nothing to go on is not a side.
func TestANitwitNeverEatsTheWholeImposterSide(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		if knowing := ImpostersFor(players) - NitwitsFor(players); knowing < 1 {
			t.Errorf("a table of %d leaves %d imposters holding the word", players, knowing)
		}
	}
}

// The role numbers are column contents and the JSON the app switches on, so they are
// pinned: renaming a constant is free, renumbering one is a migration plus an app that
// reads every stored game wrong.
func TestRoleValuesAreStable(t *testing.T) {
	if Civilian != 0 || Imposter != 1 || Nitwit != 2 {
		t.Errorf("role values changed: %d, %d, %d", Civilian, Imposter, Nitwit)
	}
}

func TestWhichSideARoleIsOn(t *testing.T) {
	if !Civilian.WithCivilians() {
		t.Error("a civilian is not with the civilians")
	}
	for _, role := range []Role{Imposter, Nitwit} {
		if role.WithCivilians() {
			t.Errorf("role %d counts for the civilians", role)
		}
	}
}

// The one thing that separates the nitwit from an ordinary imposter.
func TestOnlyTheNitwitGetsNoWord(t *testing.T) {
	for _, role := range []Role{Civilian, Imposter} {
		if !role.KnowsAWord() {
			t.Errorf("role %d was given nothing to read", role)
		}
	}
	if Nitwit.KnowsAWord() {
		t.Error("the nitwit was given a word")
	}
}

func TestModeFor(t *testing.T) {
	if got := ModeFor(true); got != Word {
		t.Errorf("ModeFor(true) = %q, want %q", got, Word)
	}
	// Sentence is the default, so the flag being absent is the longer game.
	if got := ModeFor(false); got != Sentence {
		t.Errorf("ModeFor(false) = %q, want %q", got, Sentence)
	}
	if DefaultMode != Sentence {
		t.Errorf("DefaultMode = %q, want %q", DefaultMode, Sentence)
	}
}

// The strings are column contents and the JSON the app sends, so they are pinned
// separately from the rules: re-pricing the game is free, renaming these is a migration.
func TestGameModeValuesAreStable(t *testing.T) {
	if Word != "word" || Sentence != "sentence" {
		t.Errorf("game mode values changed: %q, %q", Word, Sentence)
	}
}

func TestNextPhaseRunsTheRoundInOrder(t *testing.T) {
	for _, tc := range []struct{ from, want Phase }{
		{PhaseDeal, PhaseAnswer},
		{PhaseAnswer, PhaseDiscuss},
		{PhaseDiscuss, PhaseVote},
		{PhaseVote, PhaseReveal},
	} {
		if got := NextPhase(tc.from); got != tc.want {
			t.Errorf("NextPhase(%q) = %q, want %q", tc.from, got, tc.want)
		}
	}
}

// The last phase returns itself rather than wrapping round: what follows a reveal is the
// next round or the end of the game, and a rule cannot tell those apart.
func TestNextPhaseStopsAtTheReveal(t *testing.T) {
	if got := NextPhase(PhaseReveal); got != PhaseReveal {
		t.Errorf("NextPhase(%q) = %q, want it to stay put", PhaseReveal, got)
	}
	// An unknown phase is also left alone, so a row written by an older build cannot
	// silently restart the round.
	if got := NextPhase(Phase("nonsense")); got != Phase("nonsense") {
		t.Errorf("NextPhase of an unknown phase = %q, want it unchanged", got)
	}
}

// Phases hands out a copy. A screen drawing a progress bar off it must not be able to
// reorder the game for everybody after it.
func TestPhasesCannotBeReordered(t *testing.T) {
	got := Phases()
	if len(got) != 5 || got[0] != PhaseDeal || got[4] != PhaseReveal {
		t.Fatalf("Phases() = %v", got)
	}

	got[0] = PhaseReveal
	if again := Phases(); again[0] != PhaseDeal {
		t.Errorf("Phases() starts on %q after a caller wrote to the last one", again[0])
	}
}

func TestCaught(t *testing.T) {
	// One vote is a hunch.
	for votes := range MinVotesToCatch {
		if Caught(votes) {
			t.Errorf("Caught(%d) = true, want false", votes)
		}
	}
	// Two is the table agreeing, and more than two is still caught.
	for _, votes := range []int{MinVotesToCatch, MinVotesToCatch + 1, MaxPlayers} {
		if !Caught(votes) {
			t.Errorf("Caught(%d) = false, want true", votes)
		}
	}
}

func TestCanVoteFor(t *testing.T) {
	if CanVoteFor(2, 2) {
		t.Error("a player can vote for themselves")
	}
	if !CanVoteFor(0, 1) {
		t.Error("a player cannot vote for the seat next to them")
	}
}

func TestVotePoints(t *testing.T) {
	if got := VotePoints(true); got != CorrectVotePoints {
		t.Errorf("a correct vote paid %d, want %d", got, CorrectVotePoints)
	}
	if got := VotePoints(false); got != 0 {
		t.Errorf("a wrong vote paid %d, want 0", got)
	}
}

func TestImposterPoints(t *testing.T) {
	if got := ImposterPoints(false); got != ImposterEscapePoints {
		t.Errorf("getting away with it paid %d, want %d", got, ImposterEscapePoints)
	}
	if got := ImposterPoints(true); got != ImposterCaughtPoints {
		t.Errorf("being caught paid %d, want %d", got, ImposterCaughtPoints)
	}
}

// The shape of the scale, rather than its numbers: surviving a vote has to beat landing
// one, or there is no reason to want to be the imposter.
func TestGettingAwayWithItBeatsCatchingSomebody(t *testing.T) {
	if ImposterEscapePoints <= CorrectVotePoints {
		t.Errorf("escaping pays %d and a correct vote pays %d -- being the imposter is the worse job",
			ImposterEscapePoints, CorrectVotePoints)
	}
	if ImposterCaughtPoints >= ImposterEscapePoints {
		t.Errorf("being caught pays %d and escaping pays %d -- there is nothing to play for",
			ImposterCaughtPoints, ImposterEscapePoints)
	}
}

// The chain is drawn from everybody still playing, and from nobody else.
func TestMayorCandidatesAreTheSurvivors(t *testing.T) {
	players := []OneOfUsLocalPlayer{
		{Name: "Niels"},
		{Name: "Sanne", IsVotedOut: true},
		{Name: "Tom"},
		{Name: "Eva", IsVotedOut: true},
	}

	got := MayorCandidates(players)
	want := []int{0, 2}

	if len(got) != len(want) {
		t.Fatalf("MayorCandidates returned %v, want %v", got, want)
	}

	for index, seat := range want {
		if got[index] != seat {
			t.Errorf("MayorCandidates returned %v, want %v", got, want)
			break
		}
	}
}

// The rule the table has to be told about: the mayor is drawn from the whole room, so
// the person breaking a tie can be the person the room is hunting. A candidate list that
// quietly skipped the liars would make the office a tell.
func TestMayorCanBeAnImposter(t *testing.T) {
	players := []OneOfUsLocalPlayer{
		{Name: "Niels", Role: Civilian},
		{Name: "Sanne", Role: Imposter},
		{Name: "Tom", Role: Nitwit},
	}

	if got := len(MayorCandidates(players)); got != len(players) {
		t.Fatalf("MayorCandidates returned %d seats, want all %d -- role must not narrow the draw", got, len(players))
	}

	if !MayorMayBeAnImposter {
		t.Error("MayorMayBeAnImposter is false, but MayorCandidates draws from every role")
	}
}

// A table with nobody left has nobody to give the chain to, and says so with an empty
// list rather than a seat that does not exist.
func TestMayorCandidatesOfAnEmptiedTable(t *testing.T) {
	players := []OneOfUsLocalPlayer{
		{Name: "Niels", IsVotedOut: true},
		{Name: "Sanne", IsVotedOut: true},
	}

	if got := MayorCandidates(players); len(got) != 0 {
		t.Errorf("MayorCandidates returned %v, want nothing", got)
	}
}

// The set a host is offered is the imposter side and nothing else.
//
// Pinned rather than left to read off the var, because the two roles that are missing
// are missing on purpose and both of them are one careless append away from being
// switchable: a civilian, which would let a table deal itself no honest players, and
// the mayor, which is not a Role at all -- it is the flag on the seat, and it has to
// stay off this list for the same reason it stays off WithCivilians.
func TestOnlyTheImposterSideCanBeSwitchedOff(t *testing.T) {
	got := ImposterRoles()

	if !slices.Equal(got, []Role{Imposter, Nitwit}) {
		t.Errorf("ImposterRoles() = %v, want [Imposter Nitwit]", got)
	}

	if slices.Contains(got, Civilian) {
		t.Error("the civilian can be switched off")
	}

	// A copy, so a caller filtering its own view of the set cannot quietly narrow what
	// every table after it is dealt from.
	ImposterRoles()[0] = Civilian
	if !slices.Equal(ImposterRoles(), got) {
		t.Error("ImposterRoles() hands out the package's own slice")
	}
}

func TestWhichRoleSetsAreDealable(t *testing.T) {
	cases := []struct {
		name  string
		roles []Role
		ok    bool
	}{
		{"the whole set", []Role{Imposter, Nitwit}, true},
		{"imposters only", []Role{Imposter}, true},
		{"nitwits only", []Role{Nitwit}, true},
		{"the other way round", []Role{Nitwit, Imposter}, true},
		// A table with nobody to find is a table with no win condition: the civilians
		// only ever win by voting the last imposter out.
		{"nothing at all", []Role{}, false},
		{"nil", nil, false},
		// The two that are always in the game arriving as switches, and a number from a
		// client that knows about a role this build does not.
		{"the civilian", []Role{Imposter, Civilian}, false},
		{"an unknown role", []Role{Imposter, Role(7)}, false},
		// Not an error worth being lenient about: a set that says the same thing twice
		// is a client with a bug in it, and the next thing it sends may not be harmless.
		{"the same role twice", []Role{Imposter, Imposter}, false},
	}

	for _, test := range cases {
		if got := ImposterRoleSetOK(test.roles); got != test.ok {
			t.Errorf("%s: ImposterRoleSetOK(%v) = %v, want %v", test.name, test.roles, got, test.ok)
		}
	}
}

// Switching a role off changes what the liars are, never how many of them there are.
//
// The invariant the win condition rests on: determineGameEnded is priced off the ratio
// ImpostersFor promises, so a hand that came back short would hand the civilians a game
// they had not finished.
func TestEveryRoleSetDealsTheSameNumberOfLiars(t *testing.T) {
	sets := [][]Role{
		{Imposter},
		{Nitwit},
		{Imposter, Nitwit},
		// The two an unusable set falls back to the full game from, since RolesFor has
		// no way to report a problem and a table with no liars on it is worse than one
		// dealt the default.
		nil,
		{Civilian},
	}

	for _, enabled := range sets {
		for players := MinPlayers; players <= MaxPlayers; players++ {
			hand := RolesFor(players, enabled)

			if want := ImpostersFor(players); len(hand) != want {
				t.Errorf("%d players, enabled %v: dealt %d liars, want %d",
					players, enabled, len(hand), want)
			}
		}
	}
}

func TestRolesForDealsOnlyWhatIsSwitchedOn(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		// The nitwit off is the setting a table reaches for when it wants the game the
		// role was added to, without the role.
		for _, role := range RolesFor(players, []Role{Imposter}) {
			if role != Imposter {
				t.Errorf("%d players, nitwit off: dealt role %d", players, role)
			}
		}

		// The imposter off is the harder direction. MaxNitwits caps the mixed deal at
		// one, but that cap exists to keep the nitwit beside imposters who do know the
		// word -- with none to be beside, the whole side plays blind, which is the game
		// the switch was thrown for.
		blind := RolesFor(players, []Role{Nitwit})
		for _, role := range blind {
			if role != Nitwit {
				t.Errorf("%d players, imposter off: dealt role %d", players, role)
			}
		}
	}
}

// With both on, the deal is exactly the one the game had before the setting existed.
func TestTheWholeSetDealsTheOriginalHand(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		nitwits, imposters := 0, 0

		for _, role := range RolesFor(players, ImposterRoles()) {
			switch role {
			case Nitwit:
				nitwits++
			case Imposter:
				imposters++
			default:
				t.Fatalf("%d players: dealt role %d to the imposter side", players, role)
			}
		}

		if want := NitwitsFor(players); nitwits != want {
			t.Errorf("%d players: dealt %d nitwits, want %d", players, nitwits, want)
		}

		if want := ImpostersFor(players) - NitwitsFor(players); imposters != want {
			t.Errorf("%d players: dealt %d imposters, want %d", players, imposters, want)
		}
	}
}

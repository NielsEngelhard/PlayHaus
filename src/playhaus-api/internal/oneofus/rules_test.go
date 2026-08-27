package oneofus

import "testing"

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
		{MaxPlayers, 3}, // ten is three threes and a spare
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

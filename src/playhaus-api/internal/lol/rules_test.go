package lol

import "testing"

// The rules, asked directly. Everything in rules.go is pure, so these need no game,
// no store and no clock -- which is most of why the rules live there.

func TestRoundsForScalesWithTheTable(t *testing.T) {
	// Pins today's answers. A change here is a change to how long an evening is, so
	// it should be a deliberate edit to this table rather than a surprise.
	for _, tc := range []struct {
		players, want int
	}{
		{1, 3},  // solo: a sitting, not a session
		{2, 4},  // two at two each
		{3, 6},  // three at two each -- still the small-table rate
		{4, 12}, // four crosses over to three each
		{6, 18}, // a full room
	} {
		if got := RoundsFor(tc.players); got != tc.want {
			t.Errorf("RoundsFor(%d) = %d, want %d", tc.players, got, tc.want)
		}
	}
}

// A table of zero is not a game, but generateRounds asking for a negative number of
// rounds would be a panic rather than a refusal, so the floor is worth pinning.
func TestRoundsForNeverAsksForNothing(t *testing.T) {
	for _, players := range []int{0, -1} {
		if got := RoundsFor(players); got != SoloRounds {
			t.Errorf("RoundsFor(%d) = %d, want the solo count %d", players, got, SoloRounds)
		}
	}
}

func TestValidWordLength(t *testing.T) {
	for _, length := range []int{MinWordLength, DefaultWordLength, MaxWordLength} {
		if !ValidWordLength(length) {
			t.Errorf("ValidWordLength(%d) = false, want true", length)
		}
	}
	// Three is out on purpose: with the opening letter given away it would be a
	// two-letter puzzle, and no list ships for it.
	for _, length := range []int{0, 3, MaxWordLength + 1} {
		if ValidWordLength(length) {
			t.Errorf("ValidWordLength(%d) = true, want false", length)
		}
	}
}

func TestRoundIsOver(t *testing.T) {
	if RoundIsOver(false, 0) {
		t.Error("a fresh round is over")
	}
	if RoundIsOver(false, MaxGuesses-1) {
		t.Error("a round with a row left is over")
	}
	// Two ways to end and no third.
	if !RoundIsOver(false, MaxGuesses) {
		t.Error("a full board is not over")
	}
	if !RoundIsOver(true, 1) {
		t.Error("a solved round is not over")
	}
}

func TestOpenerSeatRotatesRoundTheTable(t *testing.T) {
	const players = 3

	// Round one opens on seat nought -- the host -- and then it moves on, so going
	// first is shared out rather than always landing on whoever made the room.
	for round, want := range map[int]int{1: 0, 2: 1, 3: 2, 4: 0, 5: 1} {
		if got := OpenerSeat(round, players); got != want {
			t.Errorf("OpenerSeat(%d, %d) = %d, want %d", round, players, got, want)
		}
	}
}

func TestSeatAfterWrapsAround(t *testing.T) {
	const players = 3
	for seat, want := range map[int]int{0: 1, 1: 2, 2: 0} {
		if got := SeatAfter(seat, players); got != want {
			t.Errorf("SeatAfter(%d, %d) = %d, want %d", seat, players, got, want)
		}
	}
}

// An empty table has no seats to point at. Both of these are reached only through a
// game whose players have gone, which cannot happen today -- but a modulo by zero
// would take the process with it, so the guard is worth a test.
func TestSeatRulesSurviveAnEmptyTable(t *testing.T) {
	if got := OpenerSeat(1, 0); got != 0 {
		t.Errorf("OpenerSeat(1, 0) = %d, want 0", got)
	}
	if got := SeatAfter(0, 0); got != 0 {
		t.Errorf("SeatAfter(0, 0) = %d, want 0", got)
	}
}

func TestHintLetter(t *testing.T) {
	if got := HintLetter("melk"); got != "m" {
		t.Errorf("HintLetter(%q) = %q, want %q", "melk", got, "m")
	}
	// A round whose word has not been drawn yet gives nothing away, which is what
	// lets an unplayed round go over the wire.
	if got := HintLetter(""); got != "" {
		t.Errorf("HintLetter(\"\") = %q, want empty", got)
	}
}

func TestAlreadyGuessed(t *testing.T) {
	guesses := []LeagueOfLettersGuess{{Word: "melk"}, {Word: "kelm"}}

	if !AlreadyGuessed(guesses, "kelm") {
		t.Error("a word the table has played is not a repeat")
	}
	if AlreadyGuessed(guesses, "vocht") {
		t.Error("an unplayed word counts as a repeat")
	}
	if AlreadyGuessed(nil, "melk") {
		t.Error("the first guess of a round counts as a repeat")
	}
}

// A skipped row carries an empty word. Without the exemption a second timeout in
// the same round would come back as a duplicate guess rather than a lost turn.
func TestAlreadyGuessedIgnoresSkippedRows(t *testing.T) {
	guesses := []LeagueOfLettersGuess{{Word: "", Skipped: true}}

	if AlreadyGuessed(guesses, "") {
		t.Error("a skipped row blocks the next skip")
	}
}

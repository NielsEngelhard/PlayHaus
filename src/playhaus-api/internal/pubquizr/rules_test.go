package pubquizr

import "testing"

// The rules, asked directly. Everything in rules.go is pure, so these need no session
// and no store -- which is most of the reason they live there.

func TestPlayerCountOK(t *testing.T) {
	for _, n := range []int{MinPlayers, MinPlayers + 1, MaxPlayers} {
		if !PlayerCountOK(n) {
			t.Errorf("PlayerCountOK(%d) = false, want true", n)
		}
	}
	// Below MinPlayers a missed hot seat question has nowhere to go at all -- not even
	// the only other person, because there is no other person.
	for _, n := range []int{0, MinPlayers - 1, MaxPlayers + 1} {
		if PlayerCountOK(n) {
			t.Errorf("PlayerCountOK(%d) = true, want false", n)
		}
	}
}

// A round that pays for holding the seat has to let you hold it. Round 2 pays flat and
// moves on every question, so it does not.
func TestRoundKeepsTheSeat(t *testing.T) {
	if !RoundKeepsTheSeat(RoundOpen) {
		t.Error("round 1 does not keep the seat, so nothing is worth staying in for")
	}
	for _, round := range []int{RoundChoice, RoundClosest, RoundDescribe, RoundList, RoundFinale} {
		if RoundKeepsTheSeat(round) {
			t.Errorf("round %d keeps the seat", round)
		}
	}
	// The two halves have to agree: a round with no hot seat cannot keep one.
	for round := 1; round <= Rounds; round++ {
		if RoundKeepsTheSeat(round) && !IsHotSeatRound(round) {
			t.Errorf("round %d keeps a seat it never had", round)
		}
	}
}

func TestOpensOnTheReader(t *testing.T) {
	if !OpensOnTheReader(RoundDescribe) {
		t.Error("round 4 opens on the seat being asked, but nobody is being asked")
	}
	for _, round := range []int{RoundOpen, RoundChoice, RoundClosest, RoundList, RoundFinale} {
		if OpensOnTheReader(round) {
			t.Errorf("round %d opens on its reader", round)
		}
	}
}

// A word pays the describer once and every player who shouted it once more. Spelled out
// of the two rates so that re-pricing either moves this with it.
func TestDescribeWordPointsFor(t *testing.T) {
	for _, winners := range []int{0, 1, MaxPlayers - 1} {
		want := DescribeWordPoints + winners*DescribeGuessPoints
		if got := DescribeWordPointsFor(winners); got != want {
			t.Errorf("DescribeWordPointsFor(%d) = %d, want %d", winners, got, want)
		}
	}

	// A word nobody got still pays the describer: they did their thirty seconds.
	if got := DescribeWordPointsFor(0); got != DescribeWordPoints {
		t.Errorf("an unguessed word was worth %d, want %d", got, DescribeWordPoints)
	}
	// Not reachable through matchAwards, which only ever counts seats -- but a negative
	// count must not pay less than the describer earned.
	if got := DescribeWordPointsFor(-1); got != DescribeWordPoints {
		t.Errorf("DescribeWordPointsFor(-1) = %d, want %d", got, DescribeWordPoints)
	}
}

// DescribeWordsPerPlayer is the rule the round 4 deal is built on. Pinned here as well
// as through the deal, because the deal only shows the answers it happens to ask for.
func TestDescribeWordsPerPlayer(t *testing.T) {
	for _, tc := range []struct {
		players, available, want int
	}{
		{MaxPlayers, 80, DescribeWordsPerTurn},   // plenty: the cap holds
		{MaxPlayers, MinDescribeWords, 2},        // the content floor: two each
		{MaxPlayers, MaxPlayers, 1},              // one each, which is still a round
		{MaxPlayers, 1, MinDescribeWordsPerTurn}, // less than one each, rounded up to the floor
		{3, 12, DescribeWordsPerTurn},            // a small table gets its four
		{0, 40, 0},                               // nobody at the table
	} {
		if got := DescribeWordsPerPlayer(tc.players, tc.available); got != tc.want {
			t.Errorf("DescribeWordsPerPlayer(%d, %d) = %d, want %d",
				tc.players, tc.available, got, tc.want)
		}
	}
}

// Only the smallest table lets its round 3 reader guess -- everywhere else that would
// be the reader marking their own homework.
func TestClosestQuizmasterGuesses(t *testing.T) {
	if !ClosestQuizmasterGuesses(MinPlayers) {
		t.Errorf("ClosestQuizmasterGuesses(%d) = false, want true", MinPlayers)
	}
	for _, n := range []int{MinPlayers + 1, MaxPlayers} {
		if ClosestQuizmasterGuesses(n) {
			t.Errorf("ClosestQuizmasterGuesses(%d) = true, want false", n)
		}
	}
}

package fakefiller

import "testing"

// A game has exactly as many rounds as it has players, which falls out of every player
// writing twice and every prompt taking two writers.
func TestAGameHasAsManyRoundsAsPlayers(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		if got := RoundsFor(players); got != players {
			t.Errorf("RoundsFor(%d) = %d, want %d", players, got, players)
		}
	}
}

func TestATableTooSmallToPairHasNoRounds(t *testing.T) {
	for _, players := range []int{0, 1} {
		if got := RoundsFor(players); got != 0 {
			t.Errorf("RoundsFor(%d) = %d, want 0", players, got)
		}
	}
}

// The property the whole pairing exists for: over every table size the game allows, the
// author graph is 2-regular. Asserted rather than the specific cycle, because the cycle is
// an implementation of this and this is the rule.
func TestEveryPlayerIsDealtExactlyTwoPrompts(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		dealt := make([]int, players)

		for round := 1; round <= RoundsFor(players); round++ {
			first, second := AuthorSeats(round, players)
			dealt[first]++
			dealt[second]++
		}

		for seat, count := range dealt {
			if count != AnswersPerPlayer {
				t.Errorf("%d players: seat %d was dealt %d prompts, want %d",
					players, seat, count, AnswersPerPlayer)
			}
		}
	}
}

// A round written twice by the same person would have one option where it should have two,
// and nobody to be fooled by it.
func TestNoRoundIsDealtToTheSamePlayerTwice(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		for round := 1; round <= RoundsFor(players); round++ {
			first, second := AuthorSeats(round, players)
			if first == second {
				t.Errorf("%d players: round %d was dealt to seat %d twice", players, round, first)
			}
			if first < 0 || first >= players || second < 0 || second >= players {
				t.Errorf("%d players: round %d was dealt to seats %d and %d, which are not at the table",
					players, round, first, second)
			}
		}
	}
}

// No two rounds may have the same pair of authors, or two prompts would be answered by the
// same two people and voted on by exactly the same voters.
func TestNoTwoRoundsAreDealtToTheSamePair(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		type pair struct{ a, b int }
		seen := map[pair]int{}

		for round := 1; round <= RoundsFor(players); round++ {
			first, second := AuthorSeats(round, players)
			if first > second {
				first, second = second, first
			}
			key := pair{first, second}
			if before, taken := seen[key]; taken {
				t.Errorf("%d players: rounds %d and %d were both dealt to seats %d and %d",
					players, before, round, key.a, key.b)
			}
			seen[key] = round
		}
	}
}

// Three is the floor because a round is written by two and voted on by everybody else: a
// table of two would leave nobody to vote.
func TestEveryAllowedTableSizeLeavesSomebodyToVote(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		if got := VotersFor(players); got < 1 {
			t.Errorf("VotersFor(%d) = %d, want at least 1", players, got)
		}
	}
}

func TestOptionsPerRoundIsThreeOnlyWhereThereIsATruth(t *testing.T) {
	if got := OptionsPerRound(GameModeFacts); got != 3 {
		t.Errorf("OptionsPerRound(facts) = %d, want 3", got)
	}
	if got := OptionsPerRound(GameModeCreative); got != 2 {
		t.Errorf("OptionsPerRound(creative) = %d, want 2", got)
	}
}

func TestAnswersForIsTwoPerPlayer(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		want := players * AnswersPerPlayer
		if got := AnswersFor(players); got != want {
			t.Errorf("AnswersFor(%d) = %d, want %d", players, got, want)
		}
	}
}

func TestValidPlayerCount(t *testing.T) {
	for players := 0; players <= MaxLobbyPlayers+2; players++ {
		want := players >= MinLobbyPlayers && players <= MaxLobbyPlayers
		if got := ValidPlayerCount(players); got != want {
			t.Errorf("ValidPlayerCount(%d) = %v, want %v", players, got, want)
		}
	}
}

// Picking the truth pays the voter and nobody else -- there is no author to pay. Picking a
// fake pays its author and not the voter, who got it wrong.
func TestFindingTheTruthPaysTheVoterAndBeingPickedPaysTheAuthor(t *testing.T) {
	guesser, author := ScoreVote(GameModeFacts, TruthAuthorID)
	if guesser != TruthPoints || author != 0 {
		t.Errorf("ScoreVote(facts, truth) = (%d, %d), want (%d, 0)", guesser, author, TruthPoints)
	}

	guesser, author = ScoreVote(GameModeFacts, "player-1")
	if guesser != 0 || author != FooledPoints {
		t.Errorf("ScoreVote(facts, fake) = (%d, %d), want (0, %d)", guesser, author, FooledPoints)
	}
}

// creative has no truth, so there is nothing to find and nothing to pay for finding it.
// The only points in that mode are for being picked.
func TestCreativeModePaysNothingForTheTruth(t *testing.T) {
	guesser, author := ScoreVote(GameModeCreative, TruthAuthorID)
	if guesser != 0 || author != 0 {
		t.Errorf("ScoreVote(creative, truth) = (%d, %d), want (0, 0)", guesser, author)
	}

	guesser, author = ScoreVote(GameModeCreative, "player-1")
	if guesser != 0 || author != FooledPoints {
		t.Errorf("ScoreVote(creative, fake) = (%d, %d), want (0, %d)", guesser, author, FooledPoints)
	}
}

func TestOnlyTheTwoAuthorsAreKeptFromVoting(t *testing.T) {
	round := FFRound{AuthorOneUserID: "a", AuthorTwoUserID: "b"}

	for _, userID := range []string{"a", "b"} {
		if EligibleVoter(round, userID) {
			t.Errorf("EligibleVoter(round, %q) = true, want false -- they wrote for it", userID)
		}
	}
	if !EligibleVoter(round, "c") {
		t.Error("EligibleVoter(round, \"c\") = false, want true")
	}
}

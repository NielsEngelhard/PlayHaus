package fakefiller

import "testing"

// A game has exactly as many rounds as it has players, which falls out of every player
// writing twice and every prompt taking two writers.
func TestAGameHasAsManyRoundsAsPlayers(t *testing.T) {
	for players := MinPlayersWithoutTruth; players <= MaxLobbyPlayers; players++ {
		if got := RoundsFor(players); got != players {
			t.Errorf("RoundsFor(%d) = %d, want %d", players, got, players)
		}
	}
}

// A table of two has nobody to pair a writer with, so every prompt takes one writer and the
// game deals twice as many of them.
func TestATableOfTwoDealsAPromptPerAnswer(t *testing.T) {
	if got := AuthorsPerRound(2); got != 1 {
		t.Errorf("AuthorsPerRound(2) = %d, want 1", got)
	}
	if got := RoundsFor(2); got != 2*AnswersPerPlayer {
		t.Errorf("RoundsFor(2) = %d, want %d", got, 2*AnswersPerPlayer)
	}
}

func TestATableTooSmallToPlayHasNoRounds(t *testing.T) {
	for _, players := range []int{0, 1} {
		if got := RoundsFor(players); got != 0 {
			t.Errorf("RoundsFor(%d) = %d, want 0", players, got)
		}
	}
}

// The property the whole pairing exists for: over every table size the game allows, every
// player is dealt the same amount of writing. Asserted rather than the specific cycle,
// because the cycle is an implementation of this and this is the rule.
func TestEveryPlayerIsDealtExactlyTwoPrompts(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		dealt := make([]int, players)

		for round := 1; round <= RoundsFor(players); round++ {
			for _, seat := range AuthorSeats(round, players) {
				dealt[seat]++
			}
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
			seats := AuthorSeats(round, players)
			if len(seats) != AuthorsPerRound(players) {
				t.Errorf("%d players: round %d was dealt to %d seats, want %d",
					players, round, len(seats), AuthorsPerRound(players))
			}

			seen := map[int]bool{}
			for _, seat := range seats {
				if seen[seat] {
					t.Errorf("%d players: round %d was dealt to seat %d twice", players, round, seat)
				}
				seen[seat] = true

				if seat < 0 || seat >= players {
					t.Errorf("%d players: round %d was dealt to seat %d, which is not at the table",
						players, round, seat)
				}
			}
		}
	}
}

// No two rounds may have the same pair of authors, or two prompts would be answered by the
// same two people and voted on by exactly the same voters. A table of two is exempt: there
// is only one writer per prompt, so every round pairs the same two people by construction.
func TestNoTwoRoundsAreDealtToTheSamePair(t *testing.T) {
	for players := MinPlayersWithoutTruth; players <= MaxLobbyPlayers; players++ {
		type pair struct{ a, b int }
		seen := map[pair]int{}

		for round := 1; round <= RoundsFor(players); round++ {
			seats := AuthorSeats(round, players)
			first, second := seats[0], seats[1]
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

// Somebody is left to vote on every round at every table size the game allows, which is the
// whole reason a table of two writes one fake per prompt rather than two.
func TestEveryAllowedTableSizeLeavesSomebodyToVote(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxLobbyPlayers; players++ {
		if got := VotersFor(players); got < 1 {
			t.Errorf("VotersFor(%d) = %d, want at least 1", players, got)
		}
	}
}

// A voter is never shown fewer than two things to pick between, in either mode.
func TestAVoterAlwaysHasSomethingToChooseBetween(t *testing.T) {
	for _, mode := range []FFGameMode{GameModeFacts, GameModeCreative} {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			if got := OptionsPerRound(mode, players); got < 2 {
				t.Errorf("OptionsPerRound(%s, %d) = %d, want at least 2", mode, players, got)
			}
		}
	}
}

func TestOptionsPerRoundCountsTheTruthOnlyWhereThereIsOne(t *testing.T) {
	if got := OptionsPerRound(GameModeFacts, 3); got != 3 {
		t.Errorf("OptionsPerRound(facts, 3) = %d, want 3", got)
	}
	if got := OptionsPerRound(GameModeCreative, 3); got != 2 {
		t.Errorf("OptionsPerRound(creative, 3) = %d, want 2", got)
	}
	// The two a table of two is shown: the real answer, and the other player's fake.
	if got := OptionsPerRound(GameModeFacts, 2); got != 2 {
		t.Errorf("OptionsPerRound(facts, 2) = %d, want 2", got)
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

// A mode with no truth in the line-up cannot be played by two: the one fake written would be
// the only thing on offer.
func TestOnlyTheModeWithATruthCanBePlayedByTwo(t *testing.T) {
	if got := MinPlayersFor(GameModeFacts); got != MinLobbyPlayers {
		t.Errorf("MinPlayersFor(facts) = %d, want %d", got, MinLobbyPlayers)
	}
	if got := MinPlayersFor(GameModeCreative); got != MinPlayersWithoutTruth {
		t.Errorf("MinPlayersFor(creative) = %d, want %d", got, MinPlayersWithoutTruth)
	}
}

func TestValidPlayerCount(t *testing.T) {
	for _, mode := range []FFGameMode{GameModeFacts, GameModeCreative} {
		for players := 0; players <= MaxLobbyPlayers+2; players++ {
			want := players >= MinPlayersFor(mode) && players <= MaxLobbyPlayers
			if got := ValidPlayerCount(mode, players); got != want {
				t.Errorf("ValidPlayerCount(%s, %d) = %v, want %v", mode, players, got, want)
			}
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
		t.Error("EligibleVoter(round, c) = false, want true")
	}
}

// The empty second author of a one-author round is not a player, and must not keep anybody from voting.
func TestTheOnlyAuthorOfAOneAuthorRoundIsTheOnlyOneKeptFromVoting(t *testing.T) {
	round := FFRound{AuthorOneUserID: "a"}

	if EligibleVoter(round, "a") {
		t.Error("EligibleVoter(round, a) = true, want false -- they wrote for it")
	}
	if !EligibleVoter(round, "b") {
		t.Error("EligibleVoter(round, b) = false, want true")
	}
	if !EligibleVoter(round, "") {
		t.Error("EligibleVoter(round, empty) = false, want true -- the empty author is nobody")
	}

	if got := round.Authors(); len(got) != 1 || got[0] != "a" {
		t.Errorf("round.Authors() = %v, want [a]", got)
	}
}

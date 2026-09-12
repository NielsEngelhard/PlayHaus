package fakefiller

import "testing"

// allModes is every mode a table can be dealt, so a rule can be asserted over both of them.
var allModes = []FFGameMode{GameModeFacts, GameModeCreative}

// Where a prompt takes two writers, a game has exactly as many rounds as it has players,
// which falls out of every player writing twice.
func TestAGameHasAsManyRoundsAsPlayers(t *testing.T) {
	for _, mode := range allModes {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			if AuthorsPerRound(mode, players) != 2 {
				continue
			}
			if got := RoundsFor(mode, players); got != players {
				t.Errorf("RoundsFor(%s, %d) = %d, want %d", mode, players, got, players)
			}
		}
	}
}

// A small table in the mode with a truth is shown one fake beside the real answer, so every
// prompt takes one writer and the game deals twice as many of them.
func TestASmallTableDealsAPromptPerAnswer(t *testing.T) {
	for players := MinLobbyPlayers; players <= MaxPlayersWithOneFake; players++ {
		if got := AuthorsPerRound(GameModeFacts, players); got != 1 {
			t.Errorf("AuthorsPerRound(facts, %d) = %d, want 1", players, got)
		}
		if got := RoundsFor(GameModeFacts, players); got != players*AnswersPerPlayer {
			t.Errorf("RoundsFor(facts, %d) = %d, want %d", players, got, players*AnswersPerPlayer)
		}
	}
}

// Above that the line-up goes back to two fakes and a truth.
func TestABigTableIsShownTwoFakes(t *testing.T) {
	for players := MaxPlayersWithOneFake + 1; players <= MaxLobbyPlayers; players++ {
		if got := AuthorsPerRound(GameModeFacts, players); got != 2 {
			t.Errorf("AuthorsPerRound(facts, %d) = %d, want 2", players, got)
		}
	}
}

// A mode with no truth to pad the line-up always takes two writers, however small the table.
func TestTheModeWithoutATruthAlwaysDealsTwoFakes(t *testing.T) {
	for players := MinPlayersWithoutTruth; players <= MaxLobbyPlayers; players++ {
		if got := AuthorsPerRound(GameModeCreative, players); got != 2 {
			t.Errorf("AuthorsPerRound(creative, %d) = %d, want 2", players, got)
		}
	}
}

func TestATableTooSmallToPlayHasNoRounds(t *testing.T) {
	for _, mode := range allModes {
		for _, players := range []int{0, 1} {
			if got := RoundsFor(mode, players); got != 0 {
				t.Errorf("RoundsFor(%s, %d) = %d, want 0", mode, players, got)
			}
		}
	}
}

// The property the whole pairing exists for: over every table size the game allows, every
// player is dealt the same amount of writing. Asserted rather than the specific cycle,
// because the cycle is an implementation of this and this is the rule.
func TestEveryPlayerIsDealtExactlyTwoPrompts(t *testing.T) {
	for _, mode := range allModes {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			dealt := make([]int, players)

			for round := 1; round <= RoundsFor(mode, players); round++ {
				for _, seat := range AuthorSeats(mode, round, players) {
					dealt[seat]++
				}
			}

			for seat, count := range dealt {
				if count != AnswersPerPlayer {
					t.Errorf("%s, %d players: seat %d was dealt %d prompts, want %d",
						mode, players, seat, count, AnswersPerPlayer)
				}
			}
		}
	}
}

// A round written twice by the same person would have one option where it should have two,
// and nobody to be fooled by it.
func TestNoRoundIsDealtToTheSamePlayerTwice(t *testing.T) {
	for _, mode := range allModes {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			for round := 1; round <= RoundsFor(mode, players); round++ {
				seats := AuthorSeats(mode, round, players)
				if len(seats) != AuthorsPerRound(mode, players) {
					t.Errorf("%s, %d players: round %d was dealt to %d seats, want %d",
						mode, players, round, len(seats), AuthorsPerRound(mode, players))
				}

				seen := map[int]bool{}
				for _, seat := range seats {
					if seen[seat] {
						t.Errorf("%s, %d players: round %d was dealt to seat %d twice", mode, players, round, seat)
					}
					seen[seat] = true

					if seat < 0 || seat >= players {
						t.Errorf("%s, %d players: round %d was dealt to seat %d, which is not at the table",
							mode, players, round, seat)
					}
				}
			}
		}
	}
}

// No two rounds may have the same pair of authors, or two prompts would be answered by the
// same two people and voted on by exactly the same voters. A one-fake table is exempt:
// there is only one writer per prompt, so there is no pair to repeat.
func TestNoTwoRoundsAreDealtToTheSamePair(t *testing.T) {
	for _, mode := range allModes {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			if AuthorsPerRound(mode, players) != 2 {
				continue
			}
			type pair struct{ a, b int }
			seen := map[pair]int{}

			for round := 1; round <= RoundsFor(mode, players); round++ {
				seats := AuthorSeats(mode, round, players)
				first, second := seats[0], seats[1]
				if first > second {
					first, second = second, first
				}
				key := pair{first, second}
				if before, taken := seen[key]; taken {
					t.Errorf("%s, %d players: rounds %d and %d were both dealt to seats %d and %d",
						mode, players, before, round, key.a, key.b)
				}
				seen[key] = round
			}
		}
	}
}

// Somebody is left to vote on every round at every table size the game allows, which is the
// whole reason a small table writes one fake per prompt rather than two.
func TestEveryAllowedTableSizeLeavesSomebodyToVote(t *testing.T) {
	for _, mode := range allModes {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			if got := VotersFor(mode, players); got < 1 {
				t.Errorf("VotersFor(%s, %d) = %d, want at least 1", mode, players, got)
			}
		}
	}
}

// A voter is never shown fewer than two things to pick between, in either mode.
func TestAVoterAlwaysHasSomethingToChooseBetween(t *testing.T) {
	for _, mode := range allModes {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			if got := OptionsPerRound(mode, players); got < 2 {
				t.Errorf("OptionsPerRound(%s, %d) = %d, want at least 2", mode, players, got)
			}
		}
	}
}

func TestOptionsPerRoundCountsTheTruthOnlyWhereThereIsOne(t *testing.T) {
	if got := OptionsPerRound(GameModeFacts, 5); got != 3 {
		t.Errorf("OptionsPerRound(facts, 5) = %d, want 3", got)
	}
	if got := OptionsPerRound(GameModeCreative, 3); got != 2 {
		t.Errorf("OptionsPerRound(creative, 3) = %d, want 2", got)
	}
	// The two a small table is shown: the real answer, and one other player's fake.
	for players := MinLobbyPlayers; players <= MaxPlayersWithOneFake; players++ {
		if got := OptionsPerRound(GameModeFacts, players); got != 2 {
			t.Errorf("OptionsPerRound(facts, %d) = %d, want 2", players, got)
		}
	}
}

func TestAnswersForIsTwoPerPlayer(t *testing.T) {
	for _, mode := range allModes {
		for players := MinPlayersFor(mode); players <= MaxLobbyPlayers; players++ {
			want := players * AnswersPerPlayer
			if got := AnswersFor(mode, players); got != want {
				t.Errorf("AnswersFor(%s, %d) = %d, want %d", mode, players, got, want)
			}
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
	for _, mode := range allModes {
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

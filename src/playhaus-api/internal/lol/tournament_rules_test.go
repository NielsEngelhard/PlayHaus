package lol

import (
	"fmt"
	"slices"
	"testing"

	"github.com/google/uuid"
)

// playStage settles every draw by handing the win to the first player listed.
func playStage(winners, losers []string, draws []Draw) (nextWinners, nextLosers []string) {
	beaten := map[string]bool{}
	dropped := map[string]bool{}

	for _, draw := range draws {
		for _, userID := range draw.Players[1:] {
			beaten[userID] = true
			if draw.Bracket == BracketWinners {
				dropped[userID] = true
			}
		}
	}

	for _, userID := range winners {
		switch {
		case dropped[userID]:
			nextLosers = append(nextLosers, userID)
		default:
			nextWinners = append(nextWinners, userID)
		}
	}
	for _, userID := range losers {
		if !beaten[userID] {
			nextLosers = append(nextLosers, userID)
		}
	}

	return nextWinners, nextLosers
}

func TestEveryTournamentSizeReachesAChampion(t *testing.T) {
	for size := MinTournamentPlayers; size <= MaxTournamentPlayers; size++ {
		winners := make([]string, size)
		for i := range winners {
			winners[i] = fmt.Sprintf("player-%d", i)
		}
		var losers []string

		stages := 0
		for !TournamentFinished(winners, losers) {
			draws := NextStage(winners, losers)
			if len(draws) == 0 {
				t.Fatalf("%d players: stage %d drew no matches with %d/%d left", size, stages+1, len(winners), len(losers))
			}

			winners, losers = playStage(winners, losers, draws)

			stages++
			if stages > 10 {
				t.Fatalf("%d players: bracket never ended, %d winners and %d losers left", size, len(winners), len(losers))
			}
		}

		if len(winners)+len(losers) != 1 {
			t.Fatalf("%d players: ended with %d standing", size, len(winners)+len(losers))
		}
		if stages < 3 {
			t.Fatalf("%d players: %d stages is too few for a double elimination bracket", size, stages)
		}
	}
}

func TestAnOddPoolPlaysExactlyOneThreePlayerMatch(t *testing.T) {
	draws := NextStage([]string{"a", "b", "c", "d", "e"}, []string{"f", "g", "h"})

	threes := 0
	seated := 0
	for _, draw := range draws {
		seated += len(draw.Players)
		if len(draw.Players) == 3 {
			threes++
		}
		if len(draw.Players) != 2 && len(draw.Players) != 3 {
			t.Fatalf("a match seats %d players", len(draw.Players))
		}
	}

	if threes != 2 {
		t.Fatalf("two odd pools drew %d three-player matches, want 2", threes)
	}
	if seated != 8 {
		t.Fatalf("%d of 8 players were drawn", seated)
	}
}

func TestALoneWinnerWaitsWhileTheLosersPlayOn(t *testing.T) {
	draws := NextStage([]string{"a"}, []string{"b", "c", "d"})

	if len(draws) != 1 {
		t.Fatalf("drew %d matches, want the losers' three-way alone", len(draws))
	}
	if draws[0].Bracket != BracketLosers {
		t.Fatalf("drew a %s match, want %s", draws[0].Bracket, BracketLosers)
	}
	if slices.Contains(draws[0].Players, "a") {
		t.Fatal("the lone winner was drawn into the losers bracket")
	}
}

func TestTheLastTwoPlayTheFinal(t *testing.T) {
	draws := NextStage([]string{"a"}, []string{"b"})

	if len(draws) != 1 {
		t.Fatalf("drew %d matches, want one final", len(draws))
	}
	if draws[0].Bracket != BracketFinal {
		t.Fatalf("drew a %s match, want %s", draws[0].Bracket, BracketFinal)
	}
}

func TestATiedScoreIsBrokenByCorrectGuesses(t *testing.T) {
	roundID := uuid.New()
	game := &MultiplayerLeagueOfLettersGame{
		Players: []MultiplayerGamePlayer{
			{UserID: "sloppy", Score: 10, TurnOrder: 0},
			{UserID: "sharp", Score: 10, TurnOrder: 1},
		},
		Rounds: []LeagueOfLettersRound{{
			ID: roundID,
			Guesses: []LeagueOfLettersGuess{
				{RoundID: roundID, OwnerID: "sharp", Letters: []LeagueOfLettersValidatedLetter{
					{Letter: "a", Status: LetterCorrect},
				}},
				{RoundID: roundID, OwnerID: "sloppy", Letters: []LeagueOfLettersValidatedLetter{
					{Letter: "b", Status: LetterAbsent},
				}},
			},
		}},
	}

	ranked := RankMatch(game)
	if len(ranked) != 2 || ranked[0] != "sharp" {
		t.Fatalf("ranked %v, want sharp first", ranked)
	}
}

func TestAFullyTiedMatchFallsBackToTurnOrder(t *testing.T) {
	game := &MultiplayerLeagueOfLettersGame{
		Players: []MultiplayerGamePlayer{
			{UserID: "second", Score: 0, TurnOrder: 1},
			{UserID: "first", Score: 0, TurnOrder: 0},
		},
	}

	ranked := RankMatch(game)
	if len(ranked) != 2 || ranked[0] != "first" {
		t.Fatalf("ranked %v, want first first", ranked)
	}
}

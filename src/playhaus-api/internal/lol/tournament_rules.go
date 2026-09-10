package lol

import "sort"

// Draw is one match a stage asks for, before any room has been opened for it.
type Draw struct {
	Bracket Bracket
	Players []string
}

// TournamentFinished reports whether the bracket has nothing left to play.
func TournamentFinished(winners, losers []string) bool {
	return len(winners)+len(losers) <= 1
}

// NextStage draws the matches for one round of the bracket.
//
// Everyone with no losses is paired against everyone else with no losses, and the same
// again among those carrying one; an odd pool plays a single three-way, and a pool of one
// sits the stage out. When one player is left in each pool it is the final.
func NextStage(winners, losers []string) []Draw {
	if TournamentFinished(winners, losers) {
		return nil
	}
	if len(winners) == 1 && len(losers) == 1 {
		return []Draw{{Bracket: BracketFinal, Players: []string{winners[0], losers[0]}}}
	}

	draws := pairPool(BracketWinners, winners)
	return append(draws, pairPool(BracketLosers, losers)...)
}

// pairPool splits one pool into matches of two, with a single three-way when it is odd.
func pairPool(bracket Bracket, pool []string) []Draw {
	// One player has nobody to play, so they carry their record into the next stage.
	if len(pool) < 2 {
		return nil
	}

	var draws []Draw
	rest := pool
	if len(rest)%2 == 1 {
		draws = append(draws, Draw{Bracket: bracket, Players: []string{rest[0], rest[1], rest[2]}})
		rest = rest[3:]
	}
	for i := 0; i < len(rest); i += 2 {
		draws = append(draws, Draw{Bracket: bracket, Players: []string{rest[i], rest[i+1]}})
	}

	return draws
}

// RankMatch places a finished match's players best first.
//
// Score decides it; a tie is broken by who landed more words, then by who let fewer turns
// run out, and finally by turn order so the answer never depends on map iteration.
func RankMatch(game *MultiplayerLeagueOfLettersGame) []string {
	type record struct {
		userID  string
		score   int
		correct int
		skipped int
		order   int
	}

	records := make([]record, len(game.Players))
	for i, player := range game.Players {
		records[i] = record{userID: player.UserID, score: player.Score, order: player.TurnOrder}
	}

	at := func(userID string) *record {
		for i := range records {
			if records[i].userID == userID {
				return &records[i]
			}
		}
		return nil
	}

	for _, round := range game.Rounds {
		for _, guess := range round.Guesses {
			player := at(guess.OwnerID)
			if player == nil {
				continue
			}
			switch {
			case guess.Skipped:
				player.skipped++
			case guess.Correct():
				player.correct++
			}
		}
	}

	sort.SliceStable(records, func(i, j int) bool {
		a, b := records[i], records[j]
		switch {
		case a.score != b.score:
			return a.score > b.score
		case a.correct != b.correct:
			return a.correct > b.correct
		case a.skipped != b.skipped:
			return a.skipped < b.skipped
		default:
			return a.order < b.order
		}
	})

	ranked := make([]string, len(records))
	for i, player := range records {
		ranked[i] = player.userID
	}

	return ranked
}

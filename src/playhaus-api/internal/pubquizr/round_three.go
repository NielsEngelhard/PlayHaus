package pubquizr

import "math"

// Round 3: a number, and whoever lands nearest it.
//
// Nothing about this round is a hot seat. The quizmaster reads one question out and
// everybody else says a number -- once each, and never a number somebody has already
// said, because copying is not guessing. Nearest takes the points, the reading moves one
// seat on, and the round is over when everybody has read one out.
//
// So there is no attempt count here and no ring to walk. The whole turn arrives in one
// piece and this file is the arithmetic for settling it, kept out of the service so it
// can be read and tested without a database in the way.

// SeatGuess is one player's number.
type SeatGuess struct {
	Seat  int
	Value float64
}

// GuessingSeats is everybody but the reader, in table order starting from the seat the
// question opened on.
//
// The order the screen puts its rows in, and the order a table actually answers in: the
// question goes to the quizmaster's left and round from there.
func GuessingSeats(quizMasterSeat, hotSeat, players int) []int {
	if players <= 1 {
		return nil
	}

	seats := make([]int, 0, players-1)
	for step := 0; step < players; step++ {
		seat := wrap(hotSeat+step, players)
		if seat == wrap(quizMasterSeat, players) {
			continue
		}
		seats = append(seats, seat)
	}

	return seats
}

// ClosestWinners is who takes the points: every seat whose guess is nearest the answer.
//
// Every one of them, at the full price. Two people equally close either side of it are
// both right, a pub table would not accept anything else, and splitting two points in
// half is an argument rather than a rule. It cannot happen often -- two players may not
// say the same number in the first place.
//
// In seat order, so the answer is the same one twice.
func ClosestWinners(target float64, guesses []SeatGuess) []int {
	best := math.Inf(1)
	for _, guess := range guesses {
		if distance := math.Abs(guess.Value - target); distance < best {
			best = distance
		}
	}
	if math.IsInf(best, 1) {
		return nil
	}

	var winners []int
	for seat := 0; seat < MaxPlayers; seat++ {
		for _, guess := range guesses {
			if guess.Seat == seat && math.Abs(guess.Value-target) == best {
				winners = append(winners, seat)
				break
			}
		}
	}

	return winners
}

// DuplicateGuessSeat is the first seat that said a number somebody had already said, or
// -1 when everybody guessed for themselves.
//
// Not a technicality: a table where the second player may repeat the first has one
// player guessing and the rest waiting to tie. The screen stops it before the button is
// pressed and this stops it if the screen does not.
func DuplicateGuessSeat(guesses []SeatGuess) int {
	said := make(map[float64]struct{}, len(guesses))

	for _, guess := range guesses {
		if _, taken := said[guess.Value]; taken {
			return guess.Seat
		}
		said[guess.Value] = struct{}{}
	}

	return -1
}

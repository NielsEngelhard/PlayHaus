package pubquizr

import (
	"math"
	"slices"
)

const (
	MinPlayers = 2
	MaxPlayers = 8
	Rounds     = 6
)

func PlayerCountOK(n int) bool {
	return n >= MinPlayers && n <= MaxPlayers
}

const (
	RoundOpen     = 1 // classic trivia, asked and answered out loud
	RoundChoice   = 2 // ABCD, hard on purpose
	RoundClosest  = 3 // a number; nearest wins
	RoundDescribe = 4 // 30 seconds -- describe your words, the table guesses
	RoundList     = 5 // one question, four answers we are looking for
	RoundFinale   = 6 // head to head between the two highest scores, read by a third where the table has one to spare
)

// Modes are the toggles a table sets before the first question is read.
type Modes struct {
	// Zen leaves out round 4, the one round played against a stopwatch.
	Zen bool
	// Trivia leaves out both rounds that are not simply a question with an answer.
	Trivia bool
}

// RoundIsTrivia is whether a round is a question read out and answered, the shape rounds 1, 2, 3 and 6 all share.
func RoundIsTrivia(round int) bool {
	return round != RoundDescribe && round != RoundList
}

func RunningOrder(m Modes) []int {
	order := make([]int, 0, Rounds)

	for _, round := range []int{RoundOpen, RoundChoice, RoundClosest, RoundDescribe, RoundList, RoundFinale} {
		if m.Zen && round == RoundDescribe {
			continue
		}
		if m.Trivia && !RoundIsTrivia(round) {
			continue
		}

		order = append(order, round)
	}

	return order
}

func PlaysRound(m Modes, round int) bool {
	return slices.Contains(RunningOrder(m), round)
}

func NextRound(m Modes, round int) int {
	order := RunningOrder(m)

	at := slices.Index(order, round)
	if at < 0 || at+1 >= len(order) {
		return -1
	}

	return order[at+1]
}

const (
	OpenQuestionPoints  = 1
	OpenScoresEvery     = 2
	ChoicePoints        = 2
	ClosestPoints       = 2
	DescribeWordPoints  = 1
	DescribeGuessPoints = 1
	// ListAnswerPoints is what one of round 5's four answers pays whoever gets credit for it.
	ListAnswerPoints = 1
	// FinalePoints is what a correct finale question pays, onto the same Score every other round adds to.
	FinalePoints = 100

	// ChoiceOptions is the A, B, C, D of round 2.
	ChoiceOptions          = 4
	ListAnswersPerQuestion = 4
	ChoiceCorrectOptions   = 1
	OpenAnswersPerQuestion = 1

	DescribeWordsPerTurn    = 4
	MinDescribeWordsPerTurn = 1

	// FinalistCount is how many players reach the finale, and so also how many goes a finale question has in it.
	FinalistCount = 2

	DescribeSeconds = 30

	// ListSeconds is round 5's clock, and it belongs to one player rather than to the table.
	ListSeconds = 20

	// ZenListGuesses is what replaces round 5's clock in zen mode.
	ZenListGuesses = 8
)

// IsHotSeatRound is whether a round is played on the hot seat.
func IsHotSeatRound(round int) bool {
	return round == RoundOpen || round == RoundChoice
}

// RoundKeepsTheSeat is whether taking a question in a hot seat round buys you the next
func RoundKeepsTheSeat(round int) bool {
	return IsHotSeatRound(round) && round != RoundChoice
}

// HotSeatPointsAt is what the question in one slot of a hot seat round is worth.
func HotSeatPointsAt(round, position int) int {
	switch round {
	case RoundOpen:
		return OpenPointsAt(position)
	case RoundChoice:
		return ChoicePoints
	default:
		return 0
	}
}

// OpenPointsAt is what the round 1 question in one slot is worth.
func OpenPointsAt(position int) int {
	if position < 0 {
		return 0
	}
	if (position+1)%OpenScoresEvery != 0 {
		return 0
	}

	return OpenQuestionPoints
}

func DescribeWordPointsFor(winners int) int {
	return DescribeWordPoints + max(winners, 0)*DescribeGuessPoints
}

// WholeCyclesOf is how many turns a round plays when the reading has to go round the table a whole number of times.
func WholeCyclesOf(players, available int) int {
	if players <= 0 || available <= 0 {
		return 0
	}

	return players * (available / players)
}

// ClosestQuizmasterGuesses is whether round 3 lets its reader guess too, rather than only reading the question out.
func ClosestQuizmasterGuesses(players int) bool {
	return players == MinPlayers
}

func DescribeWordsPerPlayer(players, available int) int {
	if players <= 0 {
		return 0
	}

	return min(max(available/players, MinDescribeWordsPerTurn), DescribeWordsPerTurn)
}

// DescribeWordsFor is how many round 4 words this table needs in total.
func DescribeWordsFor(players, available int) int {
	return players * DescribeWordsPerPlayer(players, available)
}

// FinaleHasReferee is whether this table has a seat spare to read the finale without playing it.
func FinaleHasReferee(players int) bool {
	return players > FinalistCount
}

// FinalePointsFor is what a correct finale question pays at this table.
func FinalePointsFor(players int) int {
	if FinaleHasReferee(players) {
		return FinalePoints
	}
	return ClosestPoints
}

const (
	MinOpenQuestions = 20
	// The three floors below belong to the three rounds WholeCyclesOf governs, and they are all the same number for the same reason.
	MinChoiceQuestions           = MaxPlayers
	MinClosestQuestions          = MaxPlayers
	MinListQuestions             = MaxPlayers
	MinDescribeWordsAtAFullTable = 2
	MinDescribeWords             = MaxPlayers * MinDescribeWordsAtAFullTable
	MinFinaleQuestions           = 4
)

// MinQuestionsIn is the smallest number of questions a round may carry.
func MinQuestionsIn(round int) int {
	switch round {
	case RoundOpen:
		return MinOpenQuestions
	case RoundChoice:
		return MinChoiceQuestions
	case RoundClosest:
		return MinClosestQuestions
	case RoundDescribe:
		return MinDescribeWords
	case RoundList:
		return MinListQuestions
	case RoundFinale:
		return MinFinaleQuestions
	default:
		return 0
	}
}

// KindOf is the one kind of question a round is made of.
func KindOf(round int) QuestionKind {
	switch round {
	case RoundChoice:
		return KindMultipleChoice
	case RoundClosest:
		return KindClosest
	case RoundDescribe:
		return KindDescribe
	case RoundList:
		return KindList
	default:
		// Round 1 and the finale are both asked out loud.
		return KindOpen
	}
}

func wrap(n, size int) int {
	return ((n % size) + size) % size
}

func ReaderFor(seat, players int) int {
	if players <= 0 {
		return -1
	}

	return wrap(seat-1, players)
}

// RotatesEachTurn is whether a round walks the table a seat at a time rather than leaving the reading where the last answer put it.
func RotatesEachTurn(round int) bool {
	return round == RoundClosest || round == RoundDescribe || round == RoundList
}

func OpensOnTheReader(round int) bool {
	return round == RoundDescribe
}

// HasBonusRound is whether a round ends with whatever is left over going round the rest of the table, one guess each.
func HasBonusRound(round int) bool {
	return round == RoundDescribe || round == RoundList
}

func AnsweringSeat(quizMasterSeat, hotSeat, attempts, players int) int {
	if players <= 1 || attempts < 0 {
		return -1
	}

	if attempts >= players-1 {
		return -1
	}

	first := wrap(quizMasterSeat+1, players)

	start := wrap(hotSeat-first, players)

	return wrap(first+(start+attempts)%(players-1), players)
}

// PassLine is everybody a hot seat question has still to be asked to, in order; it must agree with remainingSeatsOf in the app's hot-seat.ts.
func PassLine(quizMasterSeat, hotSeat, attempts, players int) []int {
	if players <= 1 || attempts < 0 {
		return nil
	}

	line := make([]int, 0, players-1)
	for step := attempts; ; step++ {
		seat := AnsweringSeat(quizMasterSeat, hotSeat, step, players)
		if seat < 0 {
			break
		}

		line = append(line, seat)
	}

	return line
}

type SeatGuess struct {
	Seat  int
	Value float64
}

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
	for _, guess := range guesses {
		if math.Abs(guess.Value-target) == best {
			winners = append(winners, guess.Seat)
		}
	}

	slices.Sort(winners)

	return slices.Compact(winners)
}

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

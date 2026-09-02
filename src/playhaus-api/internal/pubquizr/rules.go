package pubquizr

import (
	"math"
	"slices"
)

const (
	MinPlayers = 3
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
	RoundFinale   = 6 // head to head between the two highest scores, read by a third
)

func RunningOrder(zen bool) []int {
	if zen {
		return []int{RoundOpen, RoundChoice, RoundClosest, RoundList, RoundFinale}
	}

	return []int{RoundOpen, RoundChoice, RoundClosest, RoundDescribe, RoundList, RoundFinale}
}

func PlaysRound(zen bool, round int) bool {
	return slices.Contains(RunningOrder(zen), round)
}

func NextRound(zen bool, round int) int {
	order := RunningOrder(zen)

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
	// ListAnswerPoints is what one of round 5's four answers pays whoever gets credit
	// for it.
	ListAnswerPoints = 1
	// FinalePoints is what a correct finale question pays, onto the same Score every
	// other round adds to. A hundred, against the ones and twos the first five rounds
	// hand out, because the finale is the round that decides the night and a tally of
	// its own would say that twice.
	FinalePoints = 100

	// ChoiceOptions is the A, B, C, D of round 2.
	ChoiceOptions          = 4
	ListAnswersPerQuestion = 4
	ChoiceCorrectOptions   = 1
	OpenAnswersPerQuestion = 1

	DescribeWordsPerTurn    = 4
	MinDescribeWordsPerTurn = 1

	// FinalistCount is how many players reach the finale, and so also how many goes a
	// finale question has in it: the seat it opens on, then the other one.
	FinalistCount = 2

	DescribeSeconds = 30

	// ListSeconds is round 5's clock, and it belongs to one player rather than to the
	// table: the round is played the way round 4 is, so the seat on the reader's left
	// gets the whole of it and everybody else waits for the bonus round.
	//
	// Shorter than DescribeSeconds because the two rounds ask different work of the
	// clock. Thirty seconds is a describer talking their way round four words; twenty is
	// somebody reciting what they already know, and a longer window there is mostly
	// silence with the answers still on screen.
	ListSeconds = 20

	// ZenListGuesses is what replaces round 5's clock in zen mode: the seat on the
	// reader's left gets this many guesses instead of ListSeconds, and the round moves
	// on when they run out rather than when time does.
	//
	// Comfortably more than ListAnswersPerQuestion. A budget as tight as the number of
	// answers there are to find would make the untimed round the harder one to play,
	// which is the opposite of what a table asks for when it turns the timers off.
	ZenListGuesses = 8
)

// IsHotSeatRound is whether a round is played on the hot seat: read to one seat,
// passed along on a miss, and held by whoever takes it.
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

func ChoiceQuestionsFor(players int) int {
	return max(players, 0)
}

// ListQuestionsFor is how many round 5 questions this table plays: one each, the same
// rule ChoiceQuestionsFor gives round 2. Every player reads exactly once -- the reading
// rotates one seat per settled question, see Service.RecordListAward -- and every player
// starts as the first guesser exactly once, which only comes out even if the round is
// exactly as long as the table is wide.
func ListQuestionsFor(players int) int {
	return max(players, 0)
}

func ClosestQuestionsFor(players, available int) int {
	return max(min(players, available), 0)
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

const (
	MinOpenQuestions             = 20
	MinChoiceQuestions           = MaxPlayers
	MinClosestQuestions          = 1
	MinDescribeWordsAtAFullTable = 2
	MinDescribeWords             = MaxPlayers * MinDescribeWordsAtAFullTable
	// MinListQuestions is what a full table of round 5 needs -- one per player, the
	// same MinChoiceQuestions is for round 2.
	MinListQuestions   = MaxPlayers
	MinFinaleQuestions = 4
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

// RotatesEachTurn is whether a round walks the table a seat at a time rather than
// leaving the reading where the last answer put it.
//
// Rounds 3, 4 and 5 all do: everybody guesses once, everybody describes once, everybody
// reads once. The hot seat rounds do not, because there taking a question buys you the
// next one.
func RotatesEachTurn(round int) bool {
	return round == RoundClosest || round == RoundDescribe || round == RoundList
}

func OpensOnTheReader(round int) bool {
	return round == RoundDescribe
}

// HasBonusRound is whether a round ends with whatever is left over going round the rest
// of the table, one guess each.
//
// Rounds 4 and 5, which are the two played to a single seat against a clock and so the
// two that can have anything left when it stops. It is what TurnGuesser and BonusSeats
// are asking when they decide whether this round has such a seat at all.
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

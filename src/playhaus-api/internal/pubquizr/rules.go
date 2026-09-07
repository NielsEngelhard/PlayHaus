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

// Modes are the toggles a table sets before the first question is read, and between
// them they decide which of the six rounds the evening actually plays.
//
// One struct rather than a pair of bare bools threaded through every function below:
// they are always passed together, and two unlabelled booleans at a call site is a
// swap waiting to happen. It is also the shape a third toggle would join without
// touching a signature.
//
// Frozen onto the session at the deal, because the running order decides what is dealt
// -- turning a mode on halfway through an evening would ask for questions nobody wrote
// down. See Session.Modes.
type Modes struct {
	// Zen leaves out round 4, the one round played against a stopwatch, and unwinds
	// round 5's clock into a budget of guesses. See ZenListGuesses.
	Zen bool
	// Trivia leaves out both rounds that are not simply a question with an answer:
	// the describing game and the four-answer list. What is left is asking and
	// answering, which is the whole of what a table turns this on for.
	Trivia bool
}

// RoundIsTrivia is whether a round is a question read out and answered, the shape
// rounds 1, 2, 3 and 6 all share.
//
// The two that are not: round 4 is a describing game against a clock, and round 5 is
// one question with four answers hunted at once by a single seat. They are the rounds
// trivia mode drops, and they are also the two rounds that need a rule of their own
// everywhere else in this package -- which is the same observation twice.
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

// WholeCyclesOf is how many turns a round plays when the reading has to go round the
// table a whole number of times: as much of what the quiz carries as divides evenly by
// the table, and no more.
//
// The one rule rounds 2, 3 and 5 all play by, and the reason none of them needs a special
// case for a particular table size. All three move the reading on one seat per question
// -- round 2 because taking a question never keeps the seat, rounds 3 and 5 because
// RotatesEachTurn says so -- so a round that stops part-way round the ring leaves the
// seats it reached one reading ahead of the ones it did not. A whole number of laps is
// the only length that comes out even at every table, and taking as many laps as the quiz
// carries is the most of it that can be played while staying that way.
//
// Zero for a round carrying fewer questions than the table is wide, which has no whole
// lap in it at all. MinQuestionsIn keeps that out of a started game: every round this
// rule governs needs MaxPlayers questions to pass validation, and no table the game
// seats is wider than that.
func WholeCyclesOf(players, available int) int {
	if players <= 0 || available <= 0 {
		return 0
	}

	return players * (available / players)
}

// ClosestQuizmasterGuesses is whether round 3 lets its reader guess too, rather than
// only reading the question out.
//
// Everywhere else the reader sits a question out and the rest of the table competes for
// it, and with three or more players that still leaves somebody to win it. At the
// smallest table the game allows there is only one other seat, so sitting the reader out
// would leave a single guess to land on the number by default -- not a round, just a
// formality. So there the reader guesses too.
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

// FinaleHasReferee is whether this table has a seat spare to read the finale without
// playing it. False only at the smallest table the game allows, where the two players
// have already been finaling each other since round one and there is nobody left over.
func FinaleHasReferee(players int) bool {
	return players > FinalistCount
}

// FinalePointsFor is what a correct finale question pays at this table.
//
// The full hundred needs a neutral reader to mean anything -- it is what lets the round
// stand apart as the one that can decide a night the first five rounds left close. A
// table with no spare seat for one has already been playing these two players against
// each other all evening, so its finale pays the same as any other round's question
// rather than pretending to be the one that decides everything.
func FinalePointsFor(players int) int {
	if FinaleHasReferee(players) {
		return FinalePoints
	}
	return ClosestPoints
}

const (
	MinOpenQuestions = 20
	// The three floors below belong to the three rounds WholeCyclesOf governs, and they
	// are all the same number for the same reason: those rounds play whole laps of the
	// table, so a round carrying fewer questions than the widest table the game seats
	// would have no whole lap in it and be played not at all.
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

// PassLine is everybody a hot seat question has still to be asked to, in the order it
// will reach them: whoever is answering right now first, then round the table, the
// reader stepped over, ending when it arrives back at the seat the question opened on.
//
// This is the whole of the round's ordering as one list rather than one step at a time,
// and it exists because the app now settles a whole turn in a single request -- a run
// of seats that missed it and then, perhaps, the seat that took it. RecordHotSeatTurn
// checks the body against this line, which is what keeps a client naming seats to
// exactly the freedom it always had by pressing Wrong over and over.
//
// The app draws the same list from the same arithmetic (`remainingSeatsOf` in
// `hot-seat.ts`), and the two must agree. That is a real requirement now rather than a
// cosmetic one -- see the note on RecordHotSeatTurn -- so this is written in terms of
// AnsweringSeat rather than beside it, and the two cannot drift apart.
//
// attempts is what the store counted for the question, so a question a previous build
// left part way down the line picks up from where those rows left it rather than
// starting again at the top.
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

package pubquizr

// The shape of a pub quiz evening, in one place.
//
// The five rounds and the finale are fixed -- they are what the game *is*, and the
// screens are drawn one per round. What a quiz is free to vary is how much of each
// it carries, so long as it carries enough to seat a full table of eight.

const (
	MinPlayers = 3
	MaxPlayers = 8
	Rounds     = 6
)

const (
	RoundOpen     = 1 // classic trivia, asked and answered out loud
	RoundChoice   = 2 // ABCD, hard on purpose
	RoundClosest  = 3 // a number; nearest wins
	RoundDescribe = 4 // 30 seconds -- describe your words, the table guesses
	RoundList     = 5 // one question, four answers we are looking for
	RoundFinale   = 6 // head to head between the two highest scores
)

const (
	// OpenQuestionPoints is what a scoring round 1 question is worth. Flat, however
	// far down the table it had to travel before somebody took it: at a pub table
	// the score has to be explainable out loud, and "one each" is.
	OpenQuestionPoints = 1

	// OpenScoresEvery is how often a round 1 question is worth anything: every
	// second one.
	//
	// Taking a question keeps you in the hot seat, so without this the round is a
	// player who knows the first answer holding the seat for nothing in particular.
	// The odd questions are the ones you have to survive to reach a paying one,
	// which is what makes staying in a thing worth wanting.
	OpenScoresEvery = 2

	// ChoicePoints is what a round 2 question is worth, every one of them.
	//
	// Round 1's every-second rhythm is what makes holding the seat through a
	// scoreless question worth anything. Round 2 is one question per player and hard
	// on purpose, so there is no lap to survive: each of them simply pays, and it
	// pays double because getting a hard one right off four options is worth more
	// than getting an easy one right off none.
	ChoicePoints = 2

	// ClosestPoints is what the nearest number takes in round 3.
	//
	// Equally close guesses each take the whole of it rather than splitting it. A pub
	// table can add two and two; arguing about halves is not what the round is for.
	ClosestPoints = 2

	// DescribeWordPoints is what a word guessed inside the thirty seconds pays the
	// player who was describing it, and DescribeGuessPoints is what the same word
	// pays whoever shouted it.
	//
	// Both, on the same word, on purpose: the describer wants the room shouting and
	// the room wants to be first, so the round only works if guessing pays too.
	DescribeWordPoints  = 1
	DescribeGuessPoints = 1

	// ChoiceOptions is the A, B, C, D of round 2.
	ChoiceOptions = 4
	// ListAnswersPerQuestion is how many answers round 5 is searching for.
	ListAnswersPerQuestion = 4

	// DescribeWordsPerTurn is how many words round 4 wants to hand each player, and
	// MinDescribeWordsPerTurn is what it will settle for.
	//
	// Four is the turn thirty seconds is written for. A quiz that cannot hand out
	// four each gives everybody the same smaller number rather than giving the last
	// two seats nothing -- see DescribeWordsPerPlayer.
	DescribeWordsPerTurn    = 4
	MinDescribeWordsPerTurn = 1

	// FinalistCount is how many make the finale.
	FinalistCount = 2

	// DescribeSeconds is how long you get to describe your two words.
	DescribeSeconds = 30
	// ListSecondsPerTurn is how long a player has on a round 5 question before the
	// turn moves on to the next person -- who can still claim whatever is left.
	ListSecondsPerTurn = 25
)

// IsHotSeatRound is whether a round is played on the hot seat: read to one seat,
// passed along on a miss, and held by whoever takes it.
//
// Rounds 1 and 2, and nothing else. This is the one predicate that says so, and
// everything that reads an attempt count has to ask it first -- AttemptsOn counts
// answer rows, which is a count of seats only in these two rounds. Rounds 3 and 4
// write a row per guess and up to two rows per word.
func IsHotSeatRound(round int) bool {
	return round == RoundOpen || round == RoundChoice
}

// HotSeatPointsAt is what the question in one slot of a hot seat round is worth.
//
// Deliberately not a general PointsAt. Round 4 pays per word and pays twice -- once
// to whoever described it and once to whoever got it -- so a function that looked
// like it answered for every round would be answering wrongly for that one.
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
//
// position is 0-based, so this pays out on the even-numbered questions -- 2, 4, 6 --
// and the ones in between are worth nothing but the seat.
func OpenPointsAt(position int) int {
	if position < 0 {
		return 0
	}
	if (position+1)%OpenScoresEvery != 0 {
		return 0
	}

	return OpenQuestionPoints
}

// ChoiceQuestionsFor is how many round 2 questions a table of n plays: one each.
//
// Everybody gets asked exactly one ABCD question and the round is over -- except
// that they do not, quite, because the round is a hot seat and a player who keeps
// answering keeps being asked. One per player is the length of the round, not a
// promise about whose turn it is.
func ChoiceQuestionsFor(players int) int {
	return max(players, 0)
}

// ClosestQuestionsFor is how many round 3 questions this table plays.
//
// One per player, so everybody reads one out -- or all the quiz carries, when it
// carries fewer than that. Closest-guess questions are hard to write and most
// quizzes ship a couple, and a short round everybody can play beats refusing the
// quiz.
func ClosestQuestionsFor(players, available int) int {
	return max(min(players, available), 0)
}

// DescribeWordsPerPlayer is how many words each player describes in round 4.
//
// DescribeWordsPerTurn is what the round wants. A quiz that cannot hand out that
// many each gives everybody the same smaller number rather than giving the last two
// seats nothing: a round where two people never get a turn is not a shorter round,
// it is a broken one.
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

// The least a quiz can carry and still seat eight people. A quiz may hold more of
// any kind -- a session deals what it needs and leaves the rest -- but below these
// a full table would run out mid-round, so the seed loader refuses the file.
const (
	MinOpenQuestions   = 20
	MinChoiceQuestions = MaxPlayers // one each, and a full table is eight
	// Closest questions are hard to write and the round shrinks to fit rather than
	// refusing the quiz -- see ClosestQuestionsFor. One is the least that is still a
	// round.
	MinClosestQuestions = 1
	// MinDescribeWordsAtAFullTable is the floor content is held to: eight people
	// should get at least two words each. Below that the round is over before the
	// table has worked out what anybody is doing.
	MinDescribeWordsAtAFullTable = 2
	MinDescribeWords             = MaxPlayers * MinDescribeWordsAtAFullTable // 16
	MinListQuestions             = 8
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

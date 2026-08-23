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
	// OpenQuestionPoints is what a round 1 question is worth. Flat, however far
	// down the table it had to travel before somebody took it: at a pub table the
	// score has to be explainable out loud, and "one each" is.
	OpenQuestionPoints = 1

	// ChoiceOptions is the A, B, C, D of round 2.
	ChoiceOptions = 4
	// ListAnswersPerQuestion is how many answers round 5 is searching for.
	ListAnswersPerQuestion = 4
	// DescribeWordsPerPlayer is how many words round 4 hands each player.
	DescribeWordsPerPlayer = 2
	// FinalistCount is how many make the finale.
	FinalistCount = 2

	// DescribeSeconds is how long you get to describe your two words.
	DescribeSeconds = 30
	// ListSecondsPerTurn is how long a player has on a round 5 question before the
	// turn moves on to the next person -- who can still claim whatever is left.
	ListSecondsPerTurn = 25
)

// ChoiceQuestionsFor is how many round 2 questions a table of n needs.
//
// One each at a full table of eight, two each below that, so the round is roughly
// the same length however many of you turned up.
func ChoiceQuestionsFor(players int) int {
	if players >= MaxPlayers {
		return players
	}
	return players * 2
}

// DescribeWordsFor is how many round 4 words a table of n needs.
func DescribeWordsFor(players int) int {
	return players * DescribeWordsPerPlayer
}

// The least a quiz can carry and still seat eight people. A quiz may hold more of
// any kind -- a session deals what it needs and leaves the rest -- but below these
// a full table would run out mid-round, so the seed loader refuses the file.
const (
	MinOpenQuestions    = 20
	MinChoiceQuestions  = 14 // seven players taking two each; eight take one
	MinClosestQuestions = 1
	MinDescribeWords    = MaxPlayers * DescribeWordsPerPlayer // 16
	MinListQuestions    = 8
	MinFinaleQuestions  = 4
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

package pubquizr

// Round 1: who is being asked, and who reads next.
//
// The whole round is one rule said twice. The quizmaster reads a question to the
// person on their left; if that person misses it, it passes on round the table --
// still the same question, still the same reader -- until somebody takes it or it
// comes back to the reader, who does not get to answer their own question.
//
// Kept apart from the service so the ordering can be read, and tested, without a
// database in the way. Everything here is arithmetic on seat numbers.

// AnsweringSeat is whose turn it is to answer, given how many seats have already
// tried this question.
//
// attempts is the number of goes already had: 0 is the person the quizmaster
// originally asked, 1 is the next one along, and so on. Returns -1 once the pass
// has come all the way back round to the quizmaster, which is the question running
// out rather than a seat to ask.
func AnsweringSeat(quizMasterSeat, attempts, players int) int {
	if players <= 1 || attempts < 0 {
		return -1
	}
	// Everybody except the reader gets at most one go, so there are players-1 of
	// them and the next attempt after that is nobody.
	if attempts >= players-1 {
		return -1
	}

	return (quizMasterSeat + 1 + attempts) % players
}

// QuestionsIn is how many questions a round of this session holds.
//
// Read off the deal rather than off the quiz: what this table plays was frozen when
// the game started, and the quiz behind it may hold more than they were dealt.
func (s *Session) QuestionsInRound(round int) int {
	count := 0

	for _, question := range s.Questions {
		if question.Round == round {
			count++
		}
	}

	return count
}

// QuestionAt is the dealt question in one slot, or nil when the round is over.
func (s *Session) QuestionAt(round, position int) *SessionQuestion {
	for i := range s.Questions {
		if s.Questions[i].Round == round && s.Questions[i].Position == position {
			return &s.Questions[i]
		}
	}

	return nil
}

// PlayerAt is whoever is sitting in one seat, or nil for a seat that is not at this
// table.
func (s *Session) PlayerAt(seat int) *SessionPlayer {
	for i := range s.Players {
		if s.Players[i].Seat == seat {
			return &s.Players[i]
		}
	}

	return nil
}

// CurrentAnsweringSeat is whose turn it is to answer right now, or -1 when nobody
// is being asked anything -- a finished session, or a round this file has no say
// over.
//
// attempts is what the store counted for the current question.
func (s *Session) CurrentAnsweringSeat(attempts int) int {
	if s.Status != SessionInProgress || s.CurrentRound != RoundOpen {
		return -1
	}
	if s.QuestionAt(s.CurrentRound, s.CurrentPosition) == nil {
		return -1
	}

	return AnsweringSeat(s.QuizMasterSeat, attempts, len(s.Players))
}

package pubquizr

// The hot seat, which is how rounds 1 and 2 are played.
//
// The quizmaster reads a question to whoever is in the seat; if they miss it, it passes
// on round the table -- still the same question, still the same reader -- until somebody
// takes it or everybody but the reader has had their one go. Taking it puts you in the
// seat for the next question too, which is how a player holds it: the reading only moves
// when a question dies unanswered, or when somebody further down the table takes one.
//
// The seat is therefore not something that can be worked out from who is reading, and
// `Session.HotSeat` is where it lives. Everything here is arithmetic around it.
//
// Rounds 3 and 4 are not played this way at all -- everybody guesses at once, everybody
// describes in turn -- so nothing in this file applies to them. `IsHotSeatRound` in
// rules.go is the predicate that says which rounds it does apply to, and
// `AttemptsOn`'s meaning depends on the answer.
//
// Kept apart from the service so the ordering can be read, and tested, without a
// database in the way.

// HotSeatOrFirst is where the current question started.
//
// The stored seat, except for the two cases where it cannot be believed: a session
// dealt before the column existed carries -1, and a seat that has ended up being the
// reader's own is a table that could not be asked anything. Both fall back to the
// seat on the quizmaster's left, which is where a fresh question starts anyway.
func (s *Session) HotSeatOrFirst() int {
	players := len(s.Players)
	if players == 0 {
		return -1
	}

	if s.HotSeat < 0 || s.HotSeat >= players || s.HotSeat == s.QuizMasterSeat {
		return wrap(s.QuizMasterSeat+1, players)
	}

	return s.HotSeat
}

// CurrentAnsweringSeat is whose turn it is to answer right now, or -1 when nobody
// is being asked anything -- a finished session, or a round this file has no say
// over.
//
// Rounds 3 and 4 are always -1, and that is the truth rather than a gap: everybody
// guesses at once and everybody describes in turn, so there is no one seat being
// asked.
//
// attempts is what the store counted for the current question.
func (s *Session) CurrentAnsweringSeat(attempts int) int {
	if s.Status != SessionInProgress || !IsHotSeatRound(s.CurrentRound) {
		return -1
	}
	if s.QuestionAt(s.CurrentRound, s.CurrentPosition) == nil {
		return -1
	}

	return AnsweringSeat(s.QuizMasterSeat, s.HotSeatOrFirst(), attempts, len(s.Players))
}

// ReaderFor is who reads to one seat: the player on their right, which is the seat
// before them in table order.
//
// The round's whole ordering, in one line. A question is read by the neighbour of
// whoever it opens on, so naming the seat that starts names the reader too -- and
// every way the game moves on works by moving the start and letting the reading
// follow it.

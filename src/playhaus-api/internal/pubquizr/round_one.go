package pubquizr

// Round 1: who is being asked, and who reads next.
//
// The round is a hot seat. The quizmaster reads a question to whoever is in it; if
// they miss it, it passes on round the table -- still the same question, still the
// same reader -- until somebody takes it or everybody but the reader has had their
// one go. Taking it puts you in the seat for the next question too, which is how a
// player holds it: the reading only moves when a question dies unanswered.
//
// The seat is therefore not something that can be worked out from who is reading,
// and `Session.HotSeat` is where it lives. Everything here is arithmetic around it.
//
// Kept apart from the service so the ordering can be read, and tested, without a
// database in the way.

// AnsweringSeat is whose turn it is to answer, given where the question started and
// how many seats have already tried it.
//
// hotSeat is the seat the question was first asked to. attempts is the number of
// goes already had: 0 is that seat, 1 is the next one along, and so on. Returns -1
// once every seat but the reader has had a go, which is the question running out
// rather than a seat to ask.
//
// The walk skips the quizmaster rather than stopping at them. A question can now
// start anywhere, so "back at the reader" is a seat to step over on the way round
// and no longer says anything about how much of the table is left.
func AnsweringSeat(quizMasterSeat, hotSeat, attempts, players int) int {
	if players <= 1 || attempts < 0 {
		return -1
	}
	// Everybody except the reader gets at most one go, so there are players-1 of
	// them and the next attempt after that is nobody.
	if attempts >= players-1 {
		return -1
	}

	// The seats that can be asked are every seat but the reader, in table order from
	// their left. Working along that ring rather than in seat numbers is what makes
	// skipping the quizmaster fall out instead of needing a loop that steps over
	// them.
	first := wrap(quizMasterSeat+1, players)

	// Where the hot seat sits in that ring. A hot seat that is somehow the reader --
	// or one never set -- lands on players-1, which is 0 once it is taken round the
	// ring, so the question starts to the reader's left the way it always used to.
	start := wrap(hotSeat-first, players)

	return wrap(first+(start+attempts)%(players-1), players)
}

// wrap is n modulo size, always non-negative. Go's % keeps the sign of its left
// operand, which is not what walking backwards round a table wants.
func wrap(n, size int) int {
	return ((n % size) + size) % size
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
// attempts is what the store counted for the current question.
func (s *Session) CurrentAnsweringSeat(attempts int) int {
	if s.Status != SessionInProgress || s.CurrentRound != RoundOpen {
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
func ReaderFor(seat, players int) int {
	if players <= 0 {
		return -1
	}

	return wrap(seat-1, players)
}

// OpenOn puts the next question on one seat and the reading on the seat to its
// right.
//
// The only thing that should ever write either of the two columns, because they are
// one fact: a hot seat with somebody other than its right-hand neighbour reading to
// it is a table nobody at it could describe.
func (s *Session) OpenOn(seat int) {
	players := len(s.Players)
	if players == 0 {
		return
	}

	s.HotSeat = wrap(seat, players)
	s.QuizMasterSeat = ReaderFor(s.HotSeat, players)
}

// LowestScoringSeat is whoever has the fewest points, ties going to whoever sits
// nearest the head of the table.
//
// Every round but the first and the finale opens on them: the round starts with the
// person who most needs it to. Ties break on the seat rather than at random so the
// answer is the same one twice, which is what lets a table argue with it.
func (s *Session) LowestScoringSeat() int {
	seat, score := -1, 0

	for _, player := range s.Players {
		if seat < 0 || player.Score < score || (player.Score == score && player.Seat < seat) {
			seat, score = player.Seat, player.Score
		}
	}

	return seat
}

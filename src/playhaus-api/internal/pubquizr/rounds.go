package pubquizr

// What every round shares: where a turn sits, whose it is, and how the table moves
// between them.
//
// The one fact underneath all of it is that you are read to by the player on your right.
// So naming the seat a turn opens on names the reader too, and every way the game moves
// works by moving one of the two and letting the other follow. `OpenOn` and `ReadBy` are
// the two ends of that sentence and the only things that may write either column.
//
// hot_seat.go holds what only rounds 1 and 2 do; round_three.go and round_four.go hold
// what only those rounds do. Everything here is arithmetic, with no database in the way,
// so the ordering can be read and tested on its own.

// wrap is n modulo size, always non-negative. Go's % keeps the sign of its left
// operand, which is not what walking backwards round a table wants.
func wrap(n, size int) int {
	return ((n % size) + size) % size
}

// QuestionsIn is how many questions a round of this session holds.
//
// Read off the deal rather than off the quiz: what this table plays was frozen when
// the game started, and the quiz behind it may hold more than they were dealt.

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

// ReadBy puts the reading on one seat and the next question on the seat to its left.
//
// The mirror of OpenOn, for the one round that names its reader rather than the person
// being asked: in round 4 the describer holds the phone, so the describer *is* the
// quizmaster. Same single fact underneath, written from the other end.
func (s *Session) ReadBy(seat int) {
	s.OpenOn(seat + 1)
}

// RotateOneSeat moves the whole table on by one: whoever was reading is now the one
// being asked.
//
// One rule for both of the rounds that go round. Round 3's "the next player reads it
// out" and round 4's "the next player describes" look like different rules and are the
// same movement -- OpenOn(hotSeat+1) and ReadBy(quizMasterSeat+1) land on the same two
// seats, because the reader is always one behind the seat.
func (s *Session) RotateOneSeat() {
	s.OpenOn(s.HotSeatOrFirst() + 1)
}

// RotatesEachTurn is whether a round moves the table on by itself.
//
// Rounds 1 and 2 do not: where they go next is decided by the verdict, because taking a
// question keeps you in the seat. Rounds 3 and 4 simply go round -- everybody guesses
// once, everybody describes once -- so the turn moves whether anybody scored or not.
func RotatesEachTurn(round int) bool {
	return round == RoundClosest || round == RoundDescribe
}

// OpenRoundOn starts a round on one seat: whoever plays first.
//
// Round 4 reads that as the describer, because a describer holds the phone; everywhere
// else it is the seat being asked. The finale is left alone -- it is only the top two,
// and who starts it is that round's own business.
func (s *Session) OpenRoundOn(round, seat int) {
	switch round {
	case RoundFinale:
	case RoundDescribe:
		s.ReadBy(seat)
	default:
		s.OpenOn(seat)
	}
}

// TurnsInRound is how many goes a round holds -- which is not always how many questions
// it was dealt.
//
// Round 4 is one turn per player and several words per turn: you describe all of yours
// inside the same thirty seconds. So there, CurrentPosition counts turns and the words
// hang off the seat rather than off the slot -- which is why nothing may look a round 4
// question up by CurrentPosition. It would find a word belonging to somebody else's
// thirty seconds.
func (s *Session) TurnsInRound(round int) int {
	if round == RoundDescribe {
		return len(s.Players)
	}

	return s.QuestionsInRound(round)
}

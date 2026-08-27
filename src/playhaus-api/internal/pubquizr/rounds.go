package pubquizr

// What every round shares: where a turn sits, whose it is, and how the table moves
// between them.
//
// The one fact underneath all of it is that you are read to by the player on your right.
// So naming the seat a turn opens on names the reader too, and every way the game moves
// works by moving one of the two and letting the other follow. `OpenOn` and `ReadBy` are
// the two ends of that sentence and the only things that may write either column.
//
// The ordering rules themselves -- wrap, ReaderFor, RotatesEachTurn -- moved to rules.go,
// with everything else a rule change touches. What is left here is the Session methods
// that write the two columns.

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

// LowestScoringSeat is whoever has the fewest points, ties going to whoever sits
// nearest the head of the table.
//
// Every round but the first and the finale opens on them: the round starts with the
// person who most needs it to. Ties break on the seat rather than at random so the
// answer is the same one twice, which is what lets a table argue with it.
//
// A rule, but not one rules.go can hold: it has to read the scoreboard.
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

// OpenRoundOn starts a round on one seat: whoever plays first.
//
// Round 4 reads that as the describer, because a describer holds the phone; everywhere
// else it is the seat being asked. The finale is left alone -- it is only the top two,
// and who starts it is that round's own business.
func (s *Session) OpenRoundOn(round, seat int) {
	switch {
	case round == RoundFinale:
	case OpensOnTheReader(round):
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
//
// Stays here because the answer for every other round is however many questions this
// session was dealt, which only the session knows.
func (s *Session) TurnsInRound(round int) int {
	if round == RoundDescribe {
		return len(s.Players)
	}

	return s.QuestionsInRound(round)
}

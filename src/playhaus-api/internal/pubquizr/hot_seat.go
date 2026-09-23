package pubquizr

// The hot seat, which is how rounds 1 and 2 are played, and the pass line round 6 borrows from them.

// HotSeatOrFirst is where the current question started.
func (s *Session) HotSeatOrFirst() int {
	players := len(s.Players)
	if players == 0 {
		return -1
	}

	reader := s.PassLineReader()
	if s.HotSeat < 0 || s.HotSeat >= players || s.HotSeat == reader {
		return wrap(reader+1, players)
	}

	return s.HotSeat
}

// PassLineReader is the seat a hot seat question skips, and -1 in round 2 on phones with no shared screen, where nobody reads it out.
func (s *Session) PassLineReader() int {
	if s.CurrentRound == RoundChoice && s.Seated() && !s.HostScreen {
		return -1
	}

	return s.QuizMasterSeat
}

// CurrentAnsweringSeat is whose turn it is to answer right now, or -1 when nobody is being asked anything.
func (s *Session) CurrentAnsweringSeat(attempts int) int {
	if s.Status != SessionInProgress || !PassesRoundTheTable(s.CurrentRound) {
		return -1
	}
	// Round 6 counts CurrentPosition in turns rather than in questions, so what is left to ask is the pool and not the slot.
	if s.CurrentRound == RoundDoubleDown {
		if len(s.PendingIn(RoundDoubleDown)) == 0 {
			return -1
		}
	} else if s.QuestionAt(s.CurrentRound, s.CurrentPosition) == nil {
		return -1
	}

	return AnsweringSeat(s.PassLineReader(), s.HotSeatOrFirst(), attempts, len(s.Players))
}

// ReaderFor is who reads to one seat: the player on their right, which is the seat before them in table order.

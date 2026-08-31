package pubquizr

import "sort"

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

// TurnGuesser is the one seat whose answer counts while the clock is running, or -1 in
// the rounds that are not played to a single seat.
//
// Rounds 4 and 5 both are -- round 4 describes its words to them, round 5 asks them for
// the four answers -- and in both it is the seat on the reader's left, which is the same
// "you are read to by the player on your right" the whole game is built on. So this is
// the seat OpenOn already wrote, read back out rather than worked out a second time: two
// answers to one question is two things waiting to disagree.
func (s *Session) TurnGuesser() int {
	if s.Status != SessionInProgress || !HasBonusRound(s.CurrentRound) {
		return -1
	}

	players := len(s.Players)
	if players == 0 {
		return -1
	}

	return wrap(s.QuizMasterSeat+1, players)
}

// BonusSeats is everybody who gets one guess at whatever the clock left behind, in the
// order their go comes round: from the guesser's left onwards, the reader and the guesser
// themselves left out. Empty in the rounds that have no bonus round.
//
// Ordered, because the order is part of the rule rather than a way of drawing it -- one
// try each, taken in turn, and a leftover is gone once somebody has it. It is also the
// list a settle is allowed to spend only once per name; see bonusLedger.
//
// Empty too at a table of two, which neither round ever sees: MinPlayers is three.
func (s *Session) BonusSeats() []int {
	guesser := s.TurnGuesser()
	if guesser < 0 {
		return nil
	}

	reader := s.QuizMasterSeat
	players := len(s.Players)
	seats := make([]int, 0, max(players-2, 0))

	for step := 1; step < players; step++ {
		seat := wrap(guesser+step, players)
		if seat == reader || seat == guesser {
			continue
		}
		seats = append(seats, seat)
	}

	return seats
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
// else it is the seat being asked. The finale is left alone -- it is two players and a
// quizmaster who is neither of them, and who starts it is that round's own business. See
// OpenFinale, which advance calls instead of this on the way into round 6.
func (s *Session) OpenRoundOn(round, seat int) {
	switch {
	case round == RoundFinale:
	case OpensOnTheReader(round):
		s.ReadBy(seat)
	default:
		s.OpenOn(seat)
	}
}

// SeatFinale names the three people round 6 is played by: the two finalists, and the
// quizmaster who reads to both of them for the whole round.
//
// Not OpenOn, on purpose. OpenOn writes one fact -- you are read to by the player on
// your right -- and the finale is the one round where that is not true: the reading
// does not follow the seat round the table, it sits still on somebody who is not
// playing. So the two columns are written straight, and which finalist is on the
// question is then OpenFinaleQuestion's business rather than the quizmaster's.
func (s *Session) SeatFinale(a, b, master int) {
	s.FinalistSeatA, s.FinalistSeatB = a, b
	s.QuizMasterSeat = master

	s.OpenFinaleQuestion()
}

// OpenFinaleQuestion puts the next finale question on whichever finalist is behind.
//
// Every question, not just the first: the score moves by a hundred at a time in round 6,
// so who is behind changes as the round is played, and the rule the whole finale hangs
// on is that the question always opens on whoever most needs it to. It is the same rule
// LowestScoringSeat gives every other round, read across two seats instead of the table.
func (s *Session) OpenFinaleQuestion() {
	if seat := s.FinaleOpener(); seat >= 0 {
		s.HotSeat = seat
	}
}

// Finalists is the pair round 6 is between, and false before it has opened.
//
// Two different seats or none: the same seat twice is a Session built in Go rather than
// read back from a row, where the columns start at zero instead of at the -1 the schema
// gives them. Everything downstream asks this rather than the columns, so that reads as
// "no finale yet" the same way an unplayed session does.
func (s *Session) Finalists() (int, int, bool) {
	if s.FinalistSeatA < 0 || s.FinalistSeatB < 0 || s.FinalistSeatA == s.FinalistSeatB {
		return -1, -1, false
	}

	return s.FinalistSeatA, s.FinalistSeatB, true
}

// FinaleRival is the finalist who is not this one, or -1 for a seat that is not in the
// finale at all.
func (s *Session) FinaleRival(seat int) int {
	a, b, ok := s.Finalists()
	if !ok {
		return -1
	}

	switch seat {
	case a:
		return b
	case b:
		return a
	default:
		return -1
	}
}

// FinaleOpener is whichever finalist has the fewer points, ties going the way
// LowestScoringSeat's do -- to whoever sits nearest the head of the table.
func (s *Session) FinaleOpener() int {
	a, b, ok := s.Finalists()
	if !ok {
		return -1
	}

	first, second := s.PlayerAt(a), s.PlayerAt(b)
	if first == nil || second == nil {
		return -1
	}

	if first.Score != second.Score {
		if first.Score < second.Score {
			return a
		}
		return b
	}

	return min(a, b)
}

// FinaleAnsweringSeat is which finalist a round 6 question is on after `attempts` goes
// at it: the seat it opened on, then the other one, then nobody.
//
// The pass is what makes the finale worth watching from the losing end -- a question the
// player in front misses is still worth its full hundred to the player behind. Two goes
// and no more, because there are only two of them.
func (s *Session) FinaleAnsweringSeat(attempts int) int {
	switch {
	case attempts < 0 || attempts >= FinalistCount:
		return -1
	case attempts == 0:
		return s.HotSeat
	default:
		return s.FinaleRival(s.HotSeat)
	}
}

// OpenFinale seats the finale for the first time: the top two scores play it, and the
// best score that did not make it reads to them.
//
// Ties go the way LowestScoringSeat's do, to whoever sits nearest the head of the table.
// Third place gets the quizmaster's chair because somebody has to hold the phone and it
// cannot be either of the two people being asked -- and of everybody left, they are the
// one the table has just watched come closest.
//
// Called by advance in place of OpenRoundOn on the way into round 6, which is why
// OpenRoundOn leaves the finale alone: this is the round's own business, and it needs
// the scoreboard OpenRoundOn's callers do not carry.
func (s *Session) OpenFinale() {
	type ranked struct{ seat, score int }

	ranks := make([]ranked, 0, len(s.Players))
	for _, player := range s.Players {
		ranks = append(ranks, ranked{player.Seat, player.Score})
	}

	sort.Slice(ranks, func(i, j int) bool {
		if ranks[i].score != ranks[j].score {
			return ranks[i].score > ranks[j].score
		}
		return ranks[i].seat < ranks[j].seat
	})

	if len(ranks) <= FinalistCount {
		// A table with nobody spare to read is below MinPlayers, which cannot happen
		// through the setup form -- but this is arithmetic on a slice, not a rule about
		// how many people may sit down, so it declines rather than seating a finalist
		// as their own quizmaster.
		return
	}

	s.SeatFinale(ranks[0].seat, ranks[1].seat, ranks[FinalistCount].seat)
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

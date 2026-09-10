package pubquizr

import (
	"sort"

	"github.com/google/uuid"
)

// What every round shares: where a turn sits, whose it is, and how the table moves between them.

// Modes is how this evening was set up, in the shape the running order rules ask for.
func (s *Session) Modes() Modes {
	return Modes{Zen: s.ZenMode, Trivia: s.TriviaMode}
}

// OpenOn puts the next question on one seat and the reading on the seat to its right.
func (s *Session) OpenOn(seat int) {
	players := len(s.Players)
	if players == 0 {
		return
	}

	s.HotSeat = wrap(seat, players)
	s.QuizMasterSeat = ReaderFor(s.HotSeat, players)
}

// QuestionsIn is how many questions a round of this session holds.
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

// PendingIn are one round's dealt questions that are still to be played, in the order they were dealt.
func (s *Session) PendingIn(round int) []*SessionQuestion {
	var pending []*SessionQuestion

	for i := range s.Questions {
		if s.Questions[i].Round == round && s.Questions[i].Status == QuestionPending {
			pending = append(pending, &s.Questions[i])
		}
	}

	return pending
}

// PendingQuestion is one of a round's unplayed questions by id, and nil for anything else -- another round's, another session's, or one already scored.
func (s *Session) PendingQuestion(round int, id uuid.UUID) *SessionQuestion {
	for _, question := range s.PendingIn(round) {
		if question.ID == id {
			return question
		}
	}

	return nil
}

// ActiveQuestion is the question a round 6 player pinned by asking for its difficulty, and nil until one of them has.
func (s *Session) ActiveQuestion(round int) *SessionQuestion {
	for i := range s.Questions {
		if s.Questions[i].Round == round && s.Questions[i].Status == QuestionActive {
			return &s.Questions[i]
		}
	}

	return nil
}

// OfferedQuestion is what this round will take a ruling on: whatever a player has pinned, and any of the pool until somebody has.
func (s *Session) OfferedQuestion(round int, id uuid.UUID) *SessionQuestion {
	if active := s.ActiveQuestion(round); active != nil {
		if active.ID != id {
			return nil
		}

		return active
	}

	return s.PendingQuestion(round, id)
}

// PlayerAt is whoever is sitting in one seat, or nil for a seat that is not at this table.
func (s *Session) PlayerAt(seat int) *SessionPlayer {
	for i := range s.Players {
		if s.Players[i].Seat == seat {
			return &s.Players[i]
		}
	}

	return nil
}

// Seated is whether the seats at this table belong to individual phones, which is what makes a seat something to authorise against.
func (s *Session) Seated() bool {
	for _, player := range s.Players {
		if player.UserID != nil {
			return true
		}
	}

	return false
}

// SeatFor is where somebody's phone is sitting at this table, and -1 for the shared screen and anybody else who is not.
func (s *Session) SeatFor(userID string) int {
	if userID == "" {
		return -1
	}
	for _, player := range s.Players {
		if player.UserID != nil && *player.UserID == userID {
			return player.Seat
		}
	}

	return -1
}

// LowestScoringSeat is whoever has the fewest points, ties going to whoever sits nearest the head of the table.
func (s *Session) LowestScoringSeat() int {
	seat, score := -1, 0

	for _, player := range s.Players {
		if seat < 0 || player.Score < score || (player.Score == score && player.Seat < seat) {
			seat, score = player.Seat, player.Score
		}
	}

	return seat
}

// GuessingSeats is everybody round 3 lets type a number, which is the whole table bar its reader at all but the smallest.
func (s *Session) GuessingSeats() []int {
	guessing := make([]int, 0, len(s.Players))

	for _, player := range s.Players {
		if player.Seat == s.QuizMasterSeat && !ClosestQuizmasterGuesses(len(s.Players)) {
			continue
		}
		guessing = append(guessing, player.Seat)
	}

	return guessing
}

// ReadBy puts the reading on one seat and the next question on the seat to its left.
func (s *Session) ReadBy(seat int) {
	s.OpenOn(seat + 1)
}

// TurnGuesser is the one seat whose answer counts while the clock is running, or -1 in the rounds that are not played to a single seat.
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

// BonusSeats is everybody who gets one guess at whatever the clock left behind, in the order their go comes round.
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

// RotateOneSeat moves the whole table on by one: whoever was reading is now the one being asked.
func (s *Session) RotateOneSeat() {
	s.OpenOn(s.HotSeatOrFirst() + 1)
}

// OpenRoundOn starts a round on one seat: whoever plays first.
func (s *Session) OpenRoundOn(round, seat int) {
	switch {
	case round == RoundFinale:
	case OpensOnTheReader(round):
		s.ReadBy(seat)
	default:
		s.OpenOn(seat)
	}
}

// SeatFinale names the three people the finale is played by.
func (s *Session) SeatFinale(a, b, master int) {
	s.FinalistSeatA, s.FinalistSeatB = a, b
	s.QuizMasterSeat = master

	s.OpenFinaleQuestion()
}

// OpenFinaleQuestion puts the next finale question on whichever finalist is behind.
func (s *Session) OpenFinaleQuestion() {
	if !FinaleHasReferee(len(s.Players)) {
		seat := s.FinaleRival(s.HotSeat)
		if seat < 0 {
			// The very first question, or a hot seat that was not already a finalist's.
			seat = s.FinaleOpener()
		}
		if seat < 0 {
			return
		}

		s.HotSeat = seat
		// No neutral reader to leave the chair with, so it moves with the hot seat instead -- the same rule every hot seat round already plays by.
		s.QuizMasterSeat = ReaderFor(seat, len(s.Players))
		return
	}

	seat := s.FinaleOpener()
	if seat < 0 {
		return
	}

	s.HotSeat = seat
}

// Finalists is the pair the finale is between, and false before it has opened.
func (s *Session) Finalists() (int, int, bool) {
	if s.FinalistSeatA < 0 || s.FinalistSeatB < 0 || s.FinalistSeatA == s.FinalistSeatB {
		return -1, -1, false
	}

	return s.FinalistSeatA, s.FinalistSeatB, true
}

// FinaleRival is the finalist who is not this one, or -1 for a seat that is not in the finale at all.
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

// FinaleOpener is whichever finalist has the fewer points, ties going the way LowestScoringSeat's do.
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

// FinaleAnsweringSeat is which finalist a finale question is on after `attempts` goes at it.
func (s *Session) FinaleAnsweringSeat(attempts int) int {
	switch {
	case attempts < 0 || attempts >= FinalistCount:
		return -1
	case attempts == 0:
		return s.HotSeat
	case !FinaleHasReferee(len(s.Players)):
		// The only other seat is the one that was just holding the phone.
		return -1
	default:
		return s.FinaleRival(s.HotSeat)
	}
}

// FinaleLine is the finale's PassLine.
func (s *Session) FinaleLine(attempts int) []int {
	if attempts < 0 {
		return nil
	}

	line := make([]int, 0, FinalistCount)
	for step := attempts; ; step++ {
		seat := s.FinaleAnsweringSeat(step)
		if seat < 0 {
			break
		}

		line = append(line, seat)
	}

	return line
}

// OpenFinale seats the finale for the first time.
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

	if len(ranks) < FinalistCount {
		// Arithmetic on a slice, not a rule about how many people may sit down -- but there is nobody to seat a finale between.
		return
	}

	if !FinaleHasReferee(len(ranks)) {
		// The smallest table the game allows: both players are already the finale, and there is nobody spare to hold the phone.
		s.FinalistSeatA, s.FinalistSeatB = ranks[0].seat, ranks[1].seat
		s.OpenFinaleQuestion()
		return
	}

	s.SeatFinale(ranks[0].seat, ranks[1].seat, ranks[FinalistCount].seat)
}

// TurnsInRound is how many goes a round holds -- which is not always how many questions it was dealt.
func (s *Session) TurnsInRound(round int) int {
	// Rounds 4 and 6 are both dealt more than they play, so their turns are counted off the table rather than off the pool.
	if round == RoundDescribe || round == RoundDoubleDown {
		if !PlaysRound(s.Modes(), round) {
			return 0
		}

		return len(s.Players)
	}

	return s.QuestionsInRound(round)
}

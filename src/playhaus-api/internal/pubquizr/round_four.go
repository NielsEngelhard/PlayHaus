package pubquizr

// Round 4: thirty seconds to describe your own words without saying them.
//
// One turn per player, several words inside it. That is the thing about this round that
// everything else has to bend around: `CurrentPosition` counts turns here, not words, so
// nothing may look a round 4 question up by it -- `QuestionAt(RoundDescribe, position)`
// would happily hand back a word out of somebody else's thirty seconds. `WordsFor` is the
// only way in, and it goes by seat.
//
// The describer holds the phone, because the words are on it and they are the only person
// who may see them. So the describer is the quizmaster, which is why the round opens with
// `ReadBy` rather than `OpenOn` -- see rounds.go.
//
// A word guessed pays twice: a point to whoever described it and a point to whoever
// shouted it. That is the whole design of the round. One-sided, it is a room politely
// waiting for somebody else to score.

// WordsFor are the round 4 words dealt to one seat, in the order they were dealt.
//
// Pointers into the session's own slice, so a settled turn can mark them done and hand
// them straight to the store. Whose word is whose was frozen at the deal; what order the
// turns come in is decided at the round boundary, and the two only meet here.
func (s *Session) WordsFor(seat int) []*SessionQuestion {
	var words []*SessionQuestion

	for i := range s.Questions {
		word := &s.Questions[i]
		if word.Round != RoundDescribe {
			continue
		}
		if word.AssignedSeat == nil || *word.AssignedSeat != seat {
			continue
		}

		words = append(words, word)
	}

	return words
}

// Describer is who is describing right now, or -1 when round 4 is not what is being
// played.
//
// The quizmaster, always -- but naming it means a screen does not have to know that trick
// to draw itself, and a reader who stopped being the describer would be a bug here rather
// than the same bug spread across the app.
func (s *Session) Describer() int {
	if s.Status != SessionInProgress || s.CurrentRound != RoundDescribe {
		return -1
	}

	return s.QuizMasterSeat
}

// GuessableSeats is everybody who may be credited with a word this turn: the whole table
// except whoever is describing.
//
// The rule is "everybody but the describer"; the list of everybody is the session's.
func (s *Session) GuessableSeats(describer int) []int {
	seats := make([]int, 0, len(s.Players))

	for _, player := range s.Players {
		if player.Seat == describer {
			continue
		}
		seats = append(seats, player.Seat)
	}

	return seats
}

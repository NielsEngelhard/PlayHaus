package pubquizr

// Round 4: thirty seconds to describe your own words to the player on your left.
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
// It is not a room shouting at once. The describer plays to one person, the seat on their
// left, and inside the thirty seconds that seat is the only one whose answer counts --
// the same "you are read to by the player on your right" the whole game is built on. When
// time is up the words nobody got go round the rest of the table, one guess each.
//
// Neither of those two halves is round 4's alone any more: round 5 is played exactly the
// same way, so who is being asked and who gets a bonus guess are `Session.TurnGuesser`
// and `Session.BonusSeats` in rounds.go rather than methods of this file. What is left
// here is the part that really is only round 4's -- the words, and who holds them.
//
// A word that lands pays twice either way -- a point to whoever described it and a point
// to whoever named it. The describer earns theirs for getting it across, and getting it
// across late still counts. Round 5 pays only its finder, because reading a question out
// is not the same work as getting a word across.

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

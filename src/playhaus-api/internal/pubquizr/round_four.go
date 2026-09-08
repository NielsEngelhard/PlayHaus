package pubquizr

// Round 4: thirty seconds to describe your own words to the player on your left.

// WordsFor are the round 4 words dealt to one seat, in the order they were dealt.
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

// Describer is who is describing right now, or -1 when round 4 is not what is being played.
func (s *Session) Describer() int {
	if s.Status != SessionInProgress || s.CurrentRound != RoundDescribe {
		return -1
	}

	return s.QuizMasterSeat
}

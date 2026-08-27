package pubquizr

import "testing"

func TestSessionQuestionLookups(t *testing.T) {
	session := &Session{
		Status:          SessionInProgress,
		CurrentRound:    RoundOpen,
		CurrentPosition: 1,
		Players: []SessionPlayer{
			{Seat: 0, Name: "Niels"}, {Seat: 1, Name: "Sanne"}, {Seat: 2, Name: "Tim"},
		},
		Questions: []SessionQuestion{
			{Round: RoundOpen, Position: 0},
			{Round: RoundOpen, Position: 1},
			{Round: RoundChoice, Position: 0},
		},
	}

	if got, want := session.QuestionsInRound(RoundOpen), 2; got != want {
		t.Errorf("QuestionsInRound(RoundOpen) = %d, want %d", got, want)
	}
	if session.QuestionAt(RoundOpen, 1) == nil {
		t.Error("QuestionAt(RoundOpen, 1) = nil, want the dealt question")
	}
	if session.QuestionAt(RoundOpen, 9) != nil {
		t.Error("QuestionAt(RoundOpen, 9) found a question that was never dealt")
	}
	if got := session.PlayerAt(2); got == nil || got.Name != "Tim" {
		t.Errorf("PlayerAt(2) = %v, want Tim", got)
	}
	if session.PlayerAt(7) != nil {
		t.Error("PlayerAt(7) found somebody who is not at the table")
	}
}

// The one rule the whole ordering rests on: you are read to by the person on your
// right, so naming the seat a question opens on names the reader too.
func TestReaderForIsTheSeatOnTheRight(t *testing.T) {
	table := []struct {
		seat, players, want int
	}{
		{seat: 3, players: 4, want: 2},
		{seat: 1, players: 4, want: 0},
		// Round the end of the table and back to the far seat.
		{seat: 0, players: 4, want: 3},
		{seat: 0, players: 3, want: 2},
	}

	for _, row := range table {
		if got := ReaderFor(row.seat, row.players); got != row.want {
			t.Errorf("ReaderFor(%d, %d) = %d, want %d", row.seat, row.players, got, row.want)
		}
	}
}

// OpenOn is the only thing that should write either seat, because the two are one
// fact: a hot seat read to by anybody but its right-hand neighbour is a table nobody
// sitting at it could describe.
func TestOpenOnPutsTheReadingOnTheSeatToTheRight(t *testing.T) {
	session := &Session{
		Players: []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}, {Seat: 3}},
	}

	for _, seat := range []int{0, 1, 2, 3, 4, -1} {
		session.OpenOn(seat)

		if got, want := session.QuizMasterSeat, ReaderFor(session.HotSeat, 4); got != want {
			t.Errorf("OpenOn(%d): QuizMasterSeat = %d, want %d", seat, got, want)
		}
		if session.HotSeat < 0 || session.HotSeat > 3 {
			t.Errorf("OpenOn(%d): HotSeat = %d, which is not a seat at this table", seat, session.HotSeat)
		}
	}
}

// Who opens every round but the first and the finale.
func TestLowestScoringSeat(t *testing.T) {
	table := []struct {
		name   string
		scores []int
		want   int
	}{
		{"one player behind", []int{3, 2, 5, 1}, 3},
		{"the leader in seat 0", []int{9, 4, 4, 8}, 1},
		// Ties break on the seat rather than at random, so the answer is the same one
		// twice and a table can argue with it.
		{"a tie goes to the nearer seat", []int{2, 1, 1, 4}, 1},
		{"nobody has scored yet", []int{0, 0, 0, 0}, 0},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			session := &Session{}
			for seat, score := range row.scores {
				session.Players = append(session.Players, SessionPlayer{Seat: seat, Score: score})
			}

			if got := session.LowestScoringSeat(); got != row.want {
				t.Errorf("LowestScoringSeat() = %d, want %d", got, row.want)
			}
		})
	}
}

// The two ends of the same sentence. ReadBy names the reader, OpenOn names the seat
// being asked, and either one fixes the other -- so whichever a round finds easier to
// say, the table ends up in the same place.
func TestReadByAndOpenOnAreTheSameFact(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		session := &Session{}
		for seat := 0; seat < players; seat++ {
			session.Players = append(session.Players, SessionPlayer{Seat: seat})
		}

		for seat := 0; seat < players; seat++ {
			session.ReadBy(seat)

			if got := session.QuizMasterSeat; got != seat {
				t.Errorf("%d players: ReadBy(%d) put the reading on %d", players, seat, got)
			}
			if got, want := session.HotSeat, wrap(seat+1, players); got != want {
				t.Errorf("%d players: ReadBy(%d) opened on %d, want %d", players, seat, got, want)
			}
			if got, want := session.QuizMasterSeat, ReaderFor(session.HotSeat, players); got != want {
				t.Errorf("%d players: ReadBy(%d) broke the invariant", players, seat)
			}
		}
	}
}

// The movement rounds 3 and 4 share. They describe it differently -- "the next player
// reads it out" and "the next player describes" -- and it is one step of the same ring,
// which is why `advance` needs only the one rule.
func TestRotateOneSeatIsTheSameStepFromEitherEnd(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		seats := make([]SessionPlayer, players)
		for seat := range seats {
			seats[seat] = SessionPlayer{Seat: seat}
		}

		for opening := 0; opening < players; opening++ {
			rotated := &Session{Players: seats}
			rotated.OpenOn(opening)
			rotated.RotateOneSeat()

			read := &Session{Players: seats}
			read.OpenOn(opening)
			read.ReadBy(read.QuizMasterSeat + 1)

			if rotated.HotSeat != read.HotSeat || rotated.QuizMasterSeat != read.QuizMasterSeat {
				t.Errorf("%d players from seat %d: rotating gave (hot %d, master %d), reading on gave (hot %d, master %d)",
					players, opening,
					rotated.HotSeat, rotated.QuizMasterSeat, read.HotSeat, read.QuizMasterSeat)
			}
		}
	}
}

// Round 4 is one turn per player however many words that turn holds, which is what stops
// anything looking a round 4 question up by CurrentPosition -- it would find a word out
// of somebody else's thirty seconds.
func TestTurnsInRoundCountsTurnsNotQuestions(t *testing.T) {
	session := &Session{
		Players: []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}},
	}
	for i := 0; i < 6; i++ {
		session.Questions = append(session.Questions,
			SessionQuestion{Round: RoundChoice, Position: i},
			SessionQuestion{Round: RoundDescribe, Position: i})
	}

	if got, want := session.TurnsInRound(RoundChoice), 6; got != want {
		t.Errorf("TurnsInRound(round 2) = %d, want %d -- a turn is a question", got, want)
	}
	if got, want := session.TurnsInRound(RoundDescribe), 3; got != want {
		t.Errorf("TurnsInRound(round 4) = %d, want %d -- a turn is a player", got, want)
	}
}

func TestRotatesEachTurn(t *testing.T) {
	want := map[int]bool{
		RoundOpen:     false, // the verdict decides where it goes
		RoundChoice:   false,
		RoundClosest:  true, // everybody guesses once
		RoundDescribe: true, // everybody describes once
		RoundList:     false,
		RoundFinale:   false,
	}

	for round, expected := range want {
		if got := RotatesEachTurn(round); got != expected {
			t.Errorf("RotatesEachTurn(%d) = %v, want %v", round, got, expected)
		}
	}
}

// Every round but the fourth opens on the seat that answers first; round 4 opens on the
// seat that describes first, because there the phone goes to the describer. The finale
// picks its own and is left alone.
func TestOpenRoundOnReadsTheSeatTheRoundsWay(t *testing.T) {
	seats := []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}, {Seat: 3}}

	table := []struct {
		round      int
		wantHot    int
		wantMaster int
	}{
		{RoundChoice, 2, 1},
		{RoundClosest, 2, 1},
		{RoundDescribe, 3, 2},
	}

	for _, row := range table {
		session := &Session{Players: seats}
		session.OpenRoundOn(row.round, 2)

		if session.HotSeat != row.wantHot || session.QuizMasterSeat != row.wantMaster {
			t.Errorf("round %d opened on seat 2 gave (hot %d, master %d), want (hot %d, master %d)",
				row.round, session.HotSeat, session.QuizMasterSeat, row.wantHot, row.wantMaster)
		}
	}

	// The finale is the one round that is not told where to start.
	finale := &Session{Players: seats}
	finale.OpenOn(0)
	finale.OpenRoundOn(RoundFinale, 3)
	if finale.HotSeat != 0 {
		t.Errorf("the finale was opened on seat %d -- it decides its own", finale.HotSeat)
	}
}

// How long each round is, given the table and what the quiz turned out to carry.
func TestRoundLengths(t *testing.T) {
	if got, want := ChoiceQuestionsFor(5), 5; got != want {
		t.Errorf("ChoiceQuestionsFor(5) = %d, want %d -- one each", got, want)
	}

	closest := []struct{ players, available, want int }{
		// One per player, so everybody reads one out...
		{players: 4, available: 8, want: 4},
		// ...or all the quiz carries, which today is two.
		{players: 6, available: 2, want: 2},
		{players: 3, available: 3, want: 3},
	}
	for _, row := range closest {
		if got := ClosestQuestionsFor(row.players, row.available); got != row.want {
			t.Errorf("ClosestQuestionsFor(%d, %d) = %d, want %d",
				row.players, row.available, got, row.want)
		}
	}
}

// The round 4 clamp, in the numbers it will actually meet. Everybody gets the same
// number of words: a round where two seats never get a turn is not a shorter round, it
// is a broken one.
func TestDescribeWordsPerPlayerGivesEverybodyTheSameShare(t *testing.T) {
	table := []struct{ players, available, want int }{
		// Every quiz that ships today carries sixteen words.
		{players: 8, available: 16, want: 2},
		{players: 6, available: 16, want: 2},
		{players: 5, available: 16, want: 3},
		{players: 4, available: 16, want: 4},
		// Five each is more than the thirty seconds is written for.
		{players: 3, available: 16, want: 4},
		// A full four each, once a quiz carries enough for it.
		{players: 8, available: 32, want: 4},
		// Fewer words than players: one each rather than some of them none.
		{players: 8, available: 4, want: 1},
		{players: 0, available: 16, want: 0},
	}

	for _, row := range table {
		if got := DescribeWordsPerPlayer(row.players, row.available); got != row.want {
			t.Errorf("DescribeWordsPerPlayer(%d, %d) = %d, want %d",
				row.players, row.available, got, row.want)
		}
		if got, want := DescribeWordsFor(row.players, row.available), row.players*row.want; got != want {
			t.Errorf("DescribeWordsFor(%d, %d) = %d, want %d",
				row.players, row.available, got, want)
		}
	}
}

// What a hot seat question is worth, which is the whole of the difference between rounds
// 1 and 2.
func TestHotSeatPointsAt(t *testing.T) {
	if got, want := HotSeatPointsAt(RoundOpen, 0), 0; got != want {
		t.Errorf("round 1 question 1 = %d, want %d -- it buys the seat and nothing else", got, want)
	}
	if got, want := HotSeatPointsAt(RoundOpen, 1), OpenQuestionPoints; got != want {
		t.Errorf("round 1 question 2 = %d, want %d", got, want)
	}
	for position := 0; position < 4; position++ {
		if got, want := HotSeatPointsAt(RoundChoice, position), ChoicePoints; got != want {
			t.Errorf("round 2 question %d = %d, want %d -- every one of them pays",
				position+1, got, want)
		}
	}
	if got, want := HotSeatPointsAt(RoundClosest, 0), 0; got != want {
		t.Errorf("round 3 through the hot seat = %d, want %d -- it is not a hot seat round", got, want)
	}
}

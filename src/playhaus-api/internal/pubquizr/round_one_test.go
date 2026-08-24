package pubquizr

import "testing"

func TestAnsweringSeatStartsInTheHotSeat(t *testing.T) {
	// A fresh question starts to the quizmaster's left...
	if got, want := AnsweringSeat(0, 1, 0, 4), 1; got != want {
		t.Errorf("AnsweringSeat(0, 1, 0, 4) = %d, want %d", got, want)
	}

	// ...but one whose hot seat has moved starts wherever that is.
	if got, want := AnsweringSeat(0, 3, 0, 4), 3; got != want {
		t.Errorf("AnsweringSeat(0, 3, 0, 4) = %d, want %d", got, want)
	}
}

func TestAnsweringSeatPassesRoundTheTable(t *testing.T) {
	// Quizmaster in seat 2 at a table of four, question opening on its left: 3,
	// then 0, then 1, then nobody.
	want := []int{3, 0, 1, -1}

	for attempts, expected := range want {
		if got := AnsweringSeat(2, 3, attempts, 4); got != expected {
			t.Errorf("AnsweringSeat(2, 3, %d, 4) = %d, want %d", attempts, got, expected)
		}
	}
}

func TestAnsweringSeatPassesRoundFromAHotSeatBehindTheReader(t *testing.T) {
	// Quizmaster in seat 2, but seat 0 is holding the hot seat. The pass steps
	// over the reader rather than stopping at them: 0, then 1, then 3.
	want := []int{0, 1, 3, -1}

	for attempts, expected := range want {
		if got := AnsweringSeat(2, 0, attempts, 4); got != expected {
			t.Errorf("AnsweringSeat(2, 0, %d, 4) = %d, want %d", attempts, got, expected)
		}
	}
}

func TestAnsweringSeatNeverAsksTheQuizmaster(t *testing.T) {
	// Every seat at the table gets a go except the one reading it out, from
	// whichever seat the question happened to start on.
	for players := MinPlayers; players <= MaxPlayers; players++ {
		for master := 0; master < players; master++ {
			for hot := 0; hot < players; hot++ {
				if hot == master {
					continue
				}

				for attempts := 0; attempts < players-1; attempts++ {
					if got := AnsweringSeat(master, hot, attempts, players); got == master {
						t.Errorf("AnsweringSeat(%d, %d, %d, %d) asked the quizmaster", master, hot, attempts, players)
					}
				}

				// One more than there are other seats is the question running out.
				if got := AnsweringSeat(master, hot, players-1, players); got != -1 {
					t.Errorf("AnsweringSeat(%d, %d, %d, %d) = %d, want -1", master, hot, players-1, players, got)
				}
			}
		}
	}
}

func TestAnsweringSeatGivesEverySeatExactlyOneGo(t *testing.T) {
	const players = 5
	const master = 3

	// True from every starting seat, which is the property that stops a hot seat
	// deep in the table costing somebody their go.
	for hot := 0; hot < players; hot++ {
		if hot == master {
			continue
		}

		seen := map[int]bool{}
		for attempts := 0; attempts < players-1; attempts++ {
			seat := AnsweringSeat(master, hot, attempts, players)

			if seen[seat] {
				t.Errorf("hot seat %d: seat %d was asked twice", hot, seat)
			}
			seen[seat] = true
		}

		if len(seen) != players-1 {
			t.Errorf("hot seat %d: asked %d seats, want %d", hot, len(seen), players-1)
		}
	}
}

func TestHotSeatOrFirstFallsBackToTheReadersLeft(t *testing.T) {
	table := []struct {
		name   string
		master int
		hot    int
		want   int
	}{
		{"a seat that was taken", 2, 0, 0},
		{"a session dealt before the column existed", 2, -1, 3},
		{"a hot seat that is somehow the reader", 2, 2, 3},
		{"a seat that is not at this table", 2, 9, 3},
		{"the reader in the last seat wraps", 3, -1, 0},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			session := &Session{
				QuizMasterSeat: row.master,
				HotSeat:        row.hot,
				Players: []SessionPlayer{
					{Seat: 0}, {Seat: 1}, {Seat: 2}, {Seat: 3},
				},
			}

			if got := session.HotSeatOrFirst(); got != row.want {
				t.Errorf("HotSeatOrFirst() = %d, want %d", got, row.want)
			}
		})
	}
}

func TestOpenPointsAtPaysEverySecondQuestion(t *testing.T) {
	// position is 0-based, so these are questions 1 through 6.
	want := []int{0, OpenQuestionPoints, 0, OpenQuestionPoints, 0, OpenQuestionPoints}

	for position, expected := range want {
		if got := OpenPointsAt(position); got != expected {
			t.Errorf("OpenPointsAt(%d) = %d, want %d", position, got, expected)
		}
	}

	if got := OpenPointsAt(-1); got != 0 {
		t.Errorf("OpenPointsAt(-1) = %d, want 0", got)
	}
}

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

func TestCurrentAnsweringSeatIsNobodyOutsideRoundOne(t *testing.T) {
	session := &Session{
		Status:       SessionInProgress,
		CurrentRound: RoundChoice,
		Players:      []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}},
		Questions:    []SessionQuestion{{Round: RoundChoice, Position: 0}},
	}

	if got := session.CurrentAnsweringSeat(0); got != -1 {
		t.Errorf("CurrentAnsweringSeat in round 2 = %d, want -1", got)
	}
}

func TestCurrentAnsweringSeatIsNobodyOnceTheSessionIsOver(t *testing.T) {
	session := &Session{
		Status:       SessionCompleted,
		CurrentRound: RoundOpen,
		Players:      []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}},
		Questions:    []SessionQuestion{{Round: RoundOpen, Position: 0}},
	}

	if got := session.CurrentAnsweringSeat(0); got != -1 {
		t.Errorf("CurrentAnsweringSeat on a finished session = %d, want -1", got)
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

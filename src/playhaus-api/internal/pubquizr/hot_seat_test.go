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

// Round 2 is a hot seat too, so it has a seat being asked. Rounds 3 and 4 do not, and
// that is the truth rather than a gap: everybody guesses at once, and everybody
// describes in turn.
func TestCurrentAnsweringSeatFollowsTheHotSeatRounds(t *testing.T) {
	table := []struct {
		name  string
		round int
		want  int
	}{
		{"round 1 is asked to one seat", RoundOpen, 1},
		{"round 2 is asked to one seat", RoundChoice, 1},
		{"round 3 asks the whole table at once", RoundClosest, -1},
		{"round 4 has nobody being asked", RoundDescribe, -1},
		{"round 5 is not built yet", RoundList, -1},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			session := &Session{
				Status:       SessionInProgress,
				CurrentRound: row.round,
				HotSeat:      1,
				Players:      []SessionPlayer{{Seat: 0}, {Seat: 1}, {Seat: 2}},
				Questions:    []SessionQuestion{{Round: row.round, Position: 0}},
			}

			if got := session.CurrentAnsweringSeat(0); got != row.want {
				t.Errorf("CurrentAnsweringSeat in round %d = %d, want %d", row.round, got, row.want)
			}
		})
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

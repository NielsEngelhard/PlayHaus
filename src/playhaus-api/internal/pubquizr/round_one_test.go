package pubquizr

import "testing"

func TestAnsweringSeatStartsToTheQuizmastersLeft(t *testing.T) {
	got := AnsweringSeat(0, 0, 4)

	if want := 1; got != want {
		t.Errorf("AnsweringSeat(0, 0, 4) = %d, want %d", got, want)
	}
}

func TestAnsweringSeatPassesRoundTheTable(t *testing.T) {
	// Quizmaster in seat 2 at a table of four: 3, then 0, then 1, then nobody.
	want := []int{3, 0, 1, -1}

	for attempts, expected := range want {
		if got := AnsweringSeat(2, attempts, 4); got != expected {
			t.Errorf("AnsweringSeat(2, %d, 4) = %d, want %d", attempts, got, expected)
		}
	}
}

func TestAnsweringSeatNeverAsksTheQuizmaster(t *testing.T) {
	// Every seat at the table gets a go except the one reading it out.
	for players := MinPlayers; players <= MaxPlayers; players++ {
		for master := 0; master < players; master++ {
			for attempts := 0; attempts < players-1; attempts++ {
				if got := AnsweringSeat(master, attempts, players); got == master {
					t.Errorf("AnsweringSeat(%d, %d, %d) asked the quizmaster", master, attempts, players)
				}
			}

			// One more than there are other seats is the question running out.
			if got := AnsweringSeat(master, players-1, players); got != -1 {
				t.Errorf("AnsweringSeat(%d, %d, %d) = %d, want -1", master, players-1, players, got)
			}
		}
	}
}

func TestAnsweringSeatGivesEverySeatExactlyOneGo(t *testing.T) {
	const players = 5
	const master = 3

	seen := map[int]bool{}
	for attempts := 0; attempts < players-1; attempts++ {
		seat := AnsweringSeat(master, attempts, players)

		if seen[seat] {
			t.Errorf("seat %d was asked twice", seat)
		}
		seen[seat] = true
	}

	if len(seen) != players-1 {
		t.Errorf("asked %d seats, want %d", len(seen), players-1)
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

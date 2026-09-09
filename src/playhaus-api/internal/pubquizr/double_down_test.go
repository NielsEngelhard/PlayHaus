package pubquizr

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/google/uuid"
)

// Round 6, doubling down: the quizmaster asks whoever is next easy or hard, and the
// answer decides what the question is worth. Five of each are dealt to the table, so a
// side can run out -- which is the whole of the choice at a full table.
//
// Nobody holds a seat here. The round opens on whoever is furthest behind and then walks
// one seat a turn, and a question the front of the line missed is still worth what it was
// worth to whoever takes it further down.

// newDoubleDownSession is a table of `players` at the top of round 6, with the whole ten
// question pool dealt to the table and none of it played.
func newDoubleDownSession(players int) (*Session, *Quiz) {
	session := &Session{
		ID:           uuid.New(),
		OwnerID:      verdictOwner,
		Status:       SessionInProgress,
		CurrentRound: RoundDoubleDown,
		QuizID:       uuid.New(),
	}
	for seat := 0; seat < players; seat++ {
		session.Players = append(session.Players, SessionPlayer{
			Seat: seat,
			Name: fmt.Sprintf("seat %d", seat),
		})
	}
	session.OpenOn(0)

	quiz := &Quiz{ID: session.QuizID}
	for i := 0; i < MinDoubleDownQuestions; i++ {
		difficulty := DifficultyEasy
		if i >= DoubleDownPerDifficulty {
			difficulty = DifficultyHard
		}

		question := Question{
			ID:         uuid.New(),
			QuizID:     quiz.ID,
			Round:      RoundDoubleDown,
			Position:   i,
			Kind:       KindOpen,
			Difficulty: difficulty,
			Prompt:     fmt.Sprintf("question %d", i),
		}
		question.Answers = append(question.Answers, Answer{
			ID:         uuid.New(),
			QuestionID: question.ID,
			Text:       "answer",
			Correct:    true,
		})
		quiz.Questions = append(quiz.Questions, question)

		session.Questions = append(session.Questions, SessionQuestion{
			ID:         uuid.New(),
			SessionID:  session.ID,
			QuestionID: question.ID,
			Round:      RoundDoubleDown,
			Position:   i,
			Status:     QuestionPending,
		})
	}

	return session, quiz
}

// pickable is the question the client would offer for a difficulty -- the first of that
// kind still in the pool -- and nil for a side the table has spent.
func pickable(session *Session, quiz *Quiz, difficulty Difficulty) *SessionQuestion {
	for _, pending := range session.PendingIn(RoundDoubleDown) {
		for _, question := range quiz.Questions {
			if question.ID == pending.QuestionID && question.Difficulty == difficulty {
				return pending
			}
		}
	}

	return nil
}

// settleDoubleDown puts one chosen question through the service the way the app does.
func settleDoubleDown(store *verdictStore, questionID uuid.UUID, missed []int, correct *int) error {
	_, err := NewService(store).RecordDoubleDownTurn(context.Background(), TurnInput{
		SessionID:         store.session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: questionID,
		MissedSeats:       missed,
		CorrectSeat:       correct,
	})

	return err
}

// takeDoubleDown is the commonest turn there is: the seat being asked picks a difficulty
// and gets it right.
func takeDoubleDown(t *testing.T, store *verdictStore, quiz *Quiz, difficulty Difficulty) {
	t.Helper()

	chosen := pickable(store.session, quiz, difficulty)
	if chosen == nil {
		t.Fatalf("no %s question left in the pool", difficulty)
	}

	asked := remaining(store)
	if len(asked) == 0 {
		t.Fatal("nobody left to ask")
	}

	if err := settleDoubleDown(store, chosen.ID, nil, &asked[0]); err != nil {
		t.Fatalf("RecordDoubleDownTurn: %v", err)
	}
}

func TestDoubleDownPaysTheDifficultyThatWasAskedFor(t *testing.T) {
	table := []struct {
		difficulty Difficulty
		want       int
	}{
		{DifficultyEasy, EasyPoints},
		{DifficultyHard, HardPoints},
	}

	for _, row := range table {
		t.Run(string(row.difficulty), func(t *testing.T) {
			session, quiz := newDoubleDownSession(4)
			store := &verdictStore{session: session, quiz: quiz}

			asked := remaining(store)[0]
			takeDoubleDown(t, store, quiz, row.difficulty)

			if got := store.session.PlayerAt(asked).Score; got != row.want {
				t.Errorf("seat %d scored %d, want %d", asked, got, row.want)
			}
			if got := only(store.recorded.Questions).Points; got != row.want {
				t.Errorf("question points = %d, want %d", got, row.want)
			}
		})
	}
}

// The one round 1 rule this round does not borrow: a hard question that walked past two
// people is still a hard question when the third one takes it.
func TestDoubleDownPaysAPassedQuestionInFull(t *testing.T) {
	session, quiz := newDoubleDownSession(4)
	store := &verdictStore{session: session, quiz: quiz}

	chosen := pickable(session, quiz, DifficultyHard)
	line := remaining(store)
	if len(line) < 3 {
		t.Fatalf("pass line = %v, want three seats to walk", line)
	}

	taker := line[2]
	if err := settleDoubleDown(store, chosen.ID, line[:2], &taker); err != nil {
		t.Fatalf("RecordDoubleDownTurn: %v", err)
	}

	if got, want := store.session.PlayerAt(taker).Score, HardPoints; got != want {
		t.Errorf("seat %d scored %d, want %d -- a passed question keeps its value", taker, got, want)
	}
	for _, missed := range line[:2] {
		if got := store.session.PlayerAt(missed).Score; got != 0 {
			t.Errorf("seat %d missed it and scored %d, want 0", missed, got)
		}
	}
}

// One turn each, one lap: whoever answered has no claim on the next question, however
// well they did.
func TestDoubleDownWalksOnASeatWhoeverAnsweredIt(t *testing.T) {
	session, quiz := newDoubleDownSession(4)
	store := &verdictStore{session: session, quiz: quiz}

	opened := session.HotSeat
	takeDoubleDown(t, store, quiz, DifficultyHard)

	players := len(store.session.Players)
	if got, want := store.session.HotSeat, (opened+1)%players; got != want {
		t.Errorf("HotSeat = %d, want %d -- the phone moves round the table", got, want)
	}
	if got, want := store.session.QuizMasterSeat, ReaderFor(store.session.HotSeat, players); got != want {
		t.Errorf("QuizMasterSeat = %d, want %d", got, want)
	}
	if got, want := store.session.HotSeatRun, 0; got != want {
		t.Errorf("HotSeatRun = %d, want %d -- there is no seat to hold", got, want)
	}
}

// The pool is the exhaustion rule. Nothing counts what has been asked for: five hard
// questions have been settled, so there are no pending hard ones left to pick.
func TestDoubleDownRunsOutOfTheSideTheTableSpent(t *testing.T) {
	session, quiz := newDoubleDownSession(MaxPlayers)
	store := &verdictStore{session: session, quiz: quiz}

	for i := 0; i < DoubleDownPerDifficulty; i++ {
		takeDoubleDown(t, store, quiz, DifficultyHard)
	}

	if got := pickable(store.session, quiz, DifficultyHard); got != nil {
		t.Error("a sixth hard question was still on offer")
	}

	left := store.session.PendingIn(RoundDoubleDown)
	if got, want := len(left), DoubleDownPerDifficulty; got != want {
		t.Fatalf("%d questions left in the pool, want %d", got, want)
	}
	// So the sixth player is asked easy or easy, which is what the rule comes to.
	takeDoubleDown(t, store, quiz, DifficultyEasy)
}

// A question the pool does not hold is the whole of the server's side of the choice: it
// covers another round's question, one already scored, and a difficulty the table has
// spent, without counting anything.
func TestDoubleDownRefusesAQuestionThatIsNotInThePool(t *testing.T) {
	table := []struct {
		name string
		id   func(t *testing.T, store *verdictStore, quiz *Quiz) uuid.UUID
	}{
		{
			name: "a question already scored",
			id: func(t *testing.T, store *verdictStore, quiz *Quiz) uuid.UUID {
				t.Helper()

				chosen := pickable(store.session, quiz, DifficultyEasy)
				takeDoubleDown(t, store, quiz, DifficultyEasy)

				return chosen.ID
			},
		},
		{
			name: "a question from another round",
			id: func(t *testing.T, store *verdictStore, quiz *Quiz) uuid.UUID {
				t.Helper()

				elsewhere := SessionQuestion{
					ID:        uuid.New(),
					SessionID: store.session.ID,
					Round:     RoundOpen,
					Status:    QuestionPending,
				}
				store.session.Questions = append(store.session.Questions, elsewhere)

				return elsewhere.ID
			},
		},
		{
			name: "a question of no session at all",
			id: func(*testing.T, *verdictStore, *Quiz) uuid.UUID {
				return uuid.New()
			},
		},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			session, quiz := newDoubleDownSession(4)
			store := &verdictStore{session: session, quiz: quiz}

			id := row.id(t, store, quiz)
			store.recorded = TurnOutcome{}

			asked := remaining(store)[0]
			before := store.session.PlayerAt(asked).Score

			if err := settleDoubleDown(store, id, nil, &asked); !errors.Is(err, ErrStaleTurn) {
				t.Fatalf("settleDoubleDown: %v, want ErrStaleTurn", err)
			}
			if got := store.session.PlayerAt(asked).Score; got != before {
				t.Errorf("seat %d scored %d off a refused turn, want %d", asked, got, before)
			}
			if len(store.recorded.Questions) > 0 || len(store.recorded.Answers) > 0 {
				t.Error("a refused turn wrote rows")
			}
		})
	}
}

// And when the lap is done the finale opens on the two highest scores rather than on
// whoever is furthest behind at the whole table.
func TestDoubleDownEndsIntoTheFinale(t *testing.T) {
	session, quiz := newDoubleDownSession(4)
	session.Players[0].Score = 7
	session.Players[1].Score = 5
	session.Players[2].Score = 9
	session.Players[3].Score = 2

	store := &verdictStore{session: session, quiz: quiz}

	// Nobody takes anything, so the scoreboard the finale is seated off is the one set
	// out above.
	for turn := 0; store.session.CurrentRound == RoundDoubleDown; turn++ {
		if turn > len(session.Players) {
			t.Fatal("the round would not end")
		}

		chosen := pickable(store.session, quiz, DifficultyEasy)
		if chosen == nil {
			t.Fatal("the pool ran out inside one lap")
		}
		if err := settleDoubleDown(store, chosen.ID, remaining(store), nil); err != nil {
			t.Fatalf("turn %d: RecordDoubleDownTurn: %v", turn, err)
		}
	}

	if got, want := store.session.CurrentRound, RoundFinale; got != want {
		t.Fatalf("CurrentRound = %d, want %d", got, want)
	}
	// Seats 2 and 0 are the two highest scores (9 and 7); the lower of the pair opens,
	// and seat 1 (5) is the best score that did not make it, so they read.
	a, b, ok := store.session.Finalists()
	if !ok || a != 2 || b != 0 {
		t.Errorf("Finalists() = %d, %d, %v -- want 2, 0, true", a, b, ok)
	}
	if got, want := store.session.HotSeat, 0; got != want {
		t.Errorf("HotSeat = %d, want %d -- the weaker finalist opens", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 1; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- third place reads the finale", got, want)
	}
}

// The round is one lap of the table however wide the pool is, which is what leaves
// anything to choose from.
func TestDoubleDownIsOneTurnEachWhateverTheTable(t *testing.T) {
	for players := MinPlayers; players <= MaxPlayers; players++ {
		session, _ := newDoubleDownSession(players)

		if got, want := session.TurnsInRound(RoundDoubleDown), players; got != want {
			t.Errorf("at %d players: TurnsInRound(6) = %d, want %d", players, got, want)
		}
		if got, want := session.QuestionsInRound(RoundDoubleDown), MinDoubleDownQuestions; got != want {
			t.Errorf("at %d players: %d questions dealt, want %d", players, got, want)
		}
	}
}

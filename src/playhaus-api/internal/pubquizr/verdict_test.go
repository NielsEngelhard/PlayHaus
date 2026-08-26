package pubquizr

import (
	"context"
	"testing"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

// Round 1 is a hot seat, and these are the things that has to mean: taking a question
// keeps you in it, the reading follows the seat round the table, only every second
// question is worth anything, and a question nobody gets moves the whole thing one
// along.
//
// The reading following the seat is the one worth stating twice. A question is read by
// the player on the answerer's right, always -- so a player who takes a question from
// three seats down the table takes the reading with them, and whoever opened the round
// stops being quiz master the moment somebody past their neighbour answers.
//
// Driven through a stub store rather than a database. What is being tested is the
// decision -- which seat, whose point, who reads next -- and every input to it is
// either on the session or the attempt count, so a database here would only be
// somewhere for those two to be written down.

// verdictStore is a Store that holds one session in memory and remembers what the
// service last handed it. Everything the verdict path does not touch returns zero.
type verdictStore struct {
	session  *Session
	attempts int
	// quiz is what QuizByID answers with, for the one path that needs content: round
	// 3 has to know the number before it can say who was nearest to it.
	quiz *Quiz

	recorded TurnOutcome
}

// only is the one thing of its kind the hot seat rounds ever write, or nil. A turn that
// settles several at once is round 3 and round 4's business, and those tests read the
// slices directly.
func only[T any](rows []*T) *T {
	if len(rows) != 1 {
		return nil
	}
	return rows[0]
}

func (s *verdictStore) SessionByID(context.Context, uuid.UUID) (*Session, error) {
	return s.session, nil
}

func (s *verdictStore) AttemptsOn(context.Context, uuid.UUID) (int, error) {
	return s.attempts, nil
}

func (s *verdictStore) RecordTurn(_ context.Context, _ *Session, out TurnOutcome) error {
	s.recorded = out

	return nil
}

func (s *verdictStore) QuizByID(context.Context, uuid.UUID) (*Quiz, error) { return s.quiz, nil }
func (s *verdictStore) QuizBySlug(context.Context, string, i18n.Locale) (*Quiz, error) {
	return nil, nil
}
func (s *verdictStore) ListQuizzes(context.Context, QuizFilter) ([]*Quiz, int64, error) {
	return nil, 0, nil
}
func (s *verdictStore) QuestionCounts(context.Context, []uuid.UUID) (map[uuid.UUID]int, error) {
	return nil, nil
}
func (s *verdictStore) ReplaceQuiz(context.Context, *Quiz) error         { return nil }
func (s *verdictStore) CreateSession(context.Context, *Session) error    { return nil }
func (s *verdictStore) SessionsInProgressByUserID(context.Context, string) ([]*Session, error) {
	return nil, nil
}
func (s *verdictStore) CurrentSessionByOwnerID(context.Context, string) (*Session, error) {
	return s.session, nil
}
func (s *verdictStore) DeleteSessionByID(context.Context, uuid.UUID, string) error { return nil }
func (s *verdictStore) DeleteSessionsByOwnerID(context.Context, string, uuid.UUID) error {
	return nil
}

const verdictOwner = "owner"

// newVerdictSession is a table of four part way through round 1, with `positions`
// questions dealt and the table sat on `position`.
func newVerdictSession(master, hot, position, positions int) *Session {
	session := &Session{
		ID:              uuid.New(),
		OwnerID:         verdictOwner,
		Status:          SessionInProgress,
		CurrentRound:    RoundOpen,
		CurrentPosition: position,
		QuizMasterSeat:  master,
		HotSeat:         hot,
		Players: []SessionPlayer{
			{Seat: 0, Name: "Niels"}, {Seat: 1, Name: "Sanne"},
			{Seat: 2, Name: "Tim"}, {Seat: 3, Name: "Ada"},
		},
	}

	for i := 0; i < positions; i++ {
		session.Questions = append(session.Questions, SessionQuestion{
			ID:       uuid.New(),
			Round:    RoundOpen,
			Position: i,
			Status:   QuestionPending,
		})
	}

	return session
}

func rule(t *testing.T, store *verdictStore, correct bool) {
	t.Helper()

	session := store.session
	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		t.Fatal("no question dealt in the current slot")
	}

	_, err := NewService(store).RecordHotSeatVerdict(context.Background(), VerdictInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: question.ID,
		Correct:           correct,
	})
	if err != nil {
		t.Fatalf("RecordHotSeatVerdict: %v", err)
	}
}

func TestCorrectAnswerKeepsTheSeat(t *testing.T) {
	// Question 1 (position 0), master 0 reading to seat 1.
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}

	rule(t, store, true)

	if got, want := store.session.HotSeat, 1; got != want {
		t.Errorf("HotSeat = %d, want %d -- whoever took it stays in", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 0; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- seat 1 is still read to by seat 0", got, want)
	}
	if got, want := store.session.CurrentPosition, 1; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}
}

// The bug this exists to keep fixed. Seat 0 opened the round, seat 1 missed, seat 2
// took it -- and seat 0 used to carry on reading, so seat 1 sat between the reader and
// the person being asked and never got a turn at either job.
func TestTakingAQuestionFromDownTheTableTakesTheReadingWithIt(t *testing.T) {
	// Question 1 has already been round to seats 1 and 2 and missed; seat 3 takes it.
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6), attempts: 2}

	rule(t, store, true)

	if got, want := store.session.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d -- the seat that took it holds it next", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 2; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- seat 3 is read to by the seat on their right", got, want)
	}
}

// Whoever is being asked is always read to by their right-hand neighbour, wherever the
// question started and however far down the table it had to go first.
func TestTheReaderIsAlwaysTheSeatToTheHotSeatsRight(t *testing.T) {
	for attempts, want := range map[int]int{0: 0, 1: 1, 2: 2} {
		store := &verdictStore{session: newVerdictSession(0, 1, 0, 6), attempts: attempts}

		rule(t, store, true)

		session := store.session
		if got := session.QuizMasterSeat; got != want {
			t.Errorf("after %d misses: QuizMasterSeat = %d, want %d", attempts, got, want)
		}
		if got, want := session.QuizMasterSeat, ReaderFor(session.HotSeat, len(session.Players)); got != want {
			t.Errorf("after %d misses: QuizMasterSeat = %d, want %d", attempts, got, want)
		}
	}
}

// The number the board puts on the rule: how many questions in a row this seat has
// taken. It only counts a player holding their own seat, so a question taken off
// somebody else starts again at one.
func TestHotSeatRunCountsQuestionsTakenInARow(t *testing.T) {
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}

	rule(t, store, true) // seat 1 takes question 1
	if got, want := store.session.HotSeatRun, 1; got != want {
		t.Errorf("HotSeatRun = %d, want %d after one taken question", got, want)
	}

	rule(t, store, true) // seat 1 takes question 2 as well
	if got, want := store.session.HotSeatRun, 2; got != want {
		t.Errorf("HotSeatRun = %d, want %d after two in a row", got, want)
	}

	// Question 3 goes past seat 2 and is taken by seat 3, whose run is their own.
	store.attempts = 2
	rule(t, store, true)
	if got, want := store.session.HotSeatRun, 1; got != want {
		t.Errorf("HotSeatRun = %d, want %d -- a seat taken off somebody else starts again", got, want)
	}

	// Question 4 beats the table, so there is no run left to count.
	store.attempts = 2
	rule(t, store, false)
	if got, want := store.session.HotSeatRun, 0; got != want {
		t.Errorf("HotSeatRun = %d, want %d after a question nobody got", got, want)
	}
}

// Round 1 is the only round that opens where it likes. Every round after it starts on
// whoever is furthest behind -- and that seat's right-hand neighbour reads to them,
// same as everywhere else.
func TestTheNextRoundOpensOnTheLowestScore(t *testing.T) {
	// The last question of a six question round, so taking it rolls the session over.
	session := newVerdictSession(0, 1, 5, 6)
	session.Players[0].Score = 3
	session.Players[1].Score = 2
	session.Players[2].Score = 5
	session.Players[3].Score = 1

	store := &verdictStore{session: session}

	rule(t, store, true) // seat 1 takes it, and question 6 pays: 2 -> 3

	if got, want := store.session.CurrentRound, RoundChoice; got != want {
		t.Fatalf("CurrentRound = %d, want %d", got, want)
	}
	if got, want := store.session.HotSeat, 3; got != want {
		t.Errorf("HotSeat = %d, want %d -- the round opens on the lowest score", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 2; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- read to by the seat on their right", got, want)
	}
	if got, want := store.session.HotSeatRun, 0; got != want {
		t.Errorf("HotSeatRun = %d, want %d -- a run does not cross a round", got, want)
	}
}

func TestOnlyEverySecondQuestionScores(t *testing.T) {
	table := []struct {
		name     string
		position int
		want     int
	}{
		{"question 1 buys the seat and nothing else", 0, 0},
		{"question 2 pays", 1, OpenQuestionPoints},
		{"question 3 buys the seat and nothing else", 2, 0},
		{"question 4 pays", 3, OpenQuestionPoints},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			store := &verdictStore{session: newVerdictSession(0, 1, row.position, 6)}

			rule(t, store, true)

			player := store.session.PlayerAt(1)
			if got := player.Score; got != row.want {
				t.Errorf("score = %d, want %d", got, row.want)
			}
			if got := only(store.recorded.Answers).Points; got != row.want {
				t.Errorf("attempt points = %d, want %d", got, row.want)
			}
			if got := only(store.recorded.Questions).Points; got != row.want {
				t.Errorf("question points = %d, want %d", got, row.want)
			}

			// A scoreless question has no score to write, so the store is handed no
			// player to update.
			if row.want == 0 && len(store.recorded.Players) > 0 {
				t.Error("a scoreless question still asked for a score update")
			}
			if row.want > 0 && len(store.recorded.Players) == 0 {
				t.Error("a scoring question did not ask for a score update")
			}
		})
	}
}

func TestWrongAnswerWithSeatsLeftMovesNothing(t *testing.T) {
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}

	rule(t, store, false)

	if got, want := store.session.QuizMasterSeat, 0; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d", got, want)
	}
	if got, want := store.session.HotSeat, 1; got != want {
		t.Errorf("HotSeat = %d, want %d -- the question is still alive on its opening seat", got, want)
	}
	if got, want := store.session.CurrentPosition, 0; got != want {
		t.Errorf("CurrentPosition = %d, want %d -- the question has not been answered yet", got, want)
	}
	if len(store.recorded.Questions) > 0 {
		t.Error("a question still being passed round was closed")
	}
}

func TestQuestionNobodyGetsMovesTheReadingOn(t *testing.T) {
	// Master 0, question opened on seat 1 and already missed by seats 1 and 2. Seat 3
	// is the last go there is.
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6), attempts: 2}

	rule(t, store, false)

	if got, want := store.session.QuizMasterSeat, 1; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- a dead question moves the reading one on", got, want)
	}
	if got, want := store.session.HotSeat, 2; got != want {
		t.Errorf("HotSeat = %d, want %d -- nobody earned it, so it shuffles one along", got, want)
	}
	if got, want := store.session.CurrentPosition, 1; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}
	if got := only(store.recorded.Questions); got == nil || got.Points != 0 {
		t.Error("a question nobody got should be closed for no points")
	}
}

// The hot seat surviving a lap is what makes holding it worth anything: a player who
// takes question 1 has to still be in the seat for question 2, which is the one that
// pays.
func TestHoldingTheSeatAcrossAScoringPair(t *testing.T) {
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}

	rule(t, store, true) // question 1: seat 1 takes it, scores nothing
	if got := store.session.PlayerAt(1).Score; got != 0 {
		t.Fatalf("score after question 1 = %d, want 0", got)
	}

	store.attempts = 0
	rule(t, store, true) // question 2: still seat 1, and this one pays

	if got, want := store.session.PlayerAt(1).Score, OpenQuestionPoints; got != want {
		t.Errorf("score after question 2 = %d, want %d", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 0; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d after two taken questions", got, want)
	}
}

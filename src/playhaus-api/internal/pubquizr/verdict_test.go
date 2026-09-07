package pubquizr

import (
	"context"
	"errors"
	"testing"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

// Round 1 is a hot seat, and these are the things that has to mean: taking a question
// keeps you in it, the reading follows the seat round the table, only every second
// question is worth anything, and a question nobody gets hands the seat to whoever was
// reading it out.
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
func (s *verdictStore) ReplaceQuiz(context.Context, *Quiz) error        { return nil }
func (s *verdictStore) RecordQuizPlay(context.Context, *QuizPlay) error { return nil }
func (s *verdictStore) PlayedQuizIDs(context.Context, string, []uuid.UUID) (map[uuid.UUID]bool, error) {
	return nil, nil
}
func (s *verdictStore) CreateSession(context.Context, *Session) error { return nil }
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
func (s *verdictStore) DeleteSessionsOlderThan(context.Context, time.Time) (int64, error) {
	return 0, nil
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

// settleTurn puts one whole turn through the service the way the app does: the seats that
// missed it on the way round, in the order it reached them, and then whoever took it --
// or nobody, for a question that beat the table.
//
// Returns the error rather than failing on it, because half of what is worth testing
// here is which bodies get refused.
func settleTurn(store *verdictStore, missed []int, correct *int) error {
	session := store.session
	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		return ErrStaleTurn
	}

	_, err := NewService(store).RecordHotSeatTurn(context.Background(), TurnInput{
		SessionID:         session.ID,
		OwnerID:           verdictOwner,
		SessionQuestionID: question.ID,
		MissedSeats:       missed,
		CorrectSeat:       correct,
	})

	return err
}

// remaining is what the server would work out for itself: who this question may still be put
// to, in order. The tests build their bodies out of it rather than hard-coding seats, so
// that a test says "the second person asked took it" rather than "seat 2 did" and stays
// readable when the table is seated differently.
func remaining(store *verdictStore) []int {
	session := store.session

	return PassLine(
		session.QuizMasterSeat,
		session.HotSeatOrFirst(),
		store.attempts,
		len(session.Players),
	)
}

// rule is the old one-ruling-at-a-time helper, kept because most of these tests are
// about where the seat and the reading end up rather than about how the turn was said.
// True is whoever is being asked right now taking it; false is the question going the
// rest of the way round and beating everybody, which is the only thing a single "wrong"
// can still mean now that a question passing along never reaches the server.
func rule(t *testing.T, store *verdictStore, correct bool) {
	t.Helper()

	asked := remaining(store)
	if len(asked) == 0 {
		t.Fatal("nobody left to ask")
	}

	var err error
	if correct {
		err = settleTurn(store, nil, &asked[0])
	} else {
		err = settleTurn(store, asked, nil)
	}
	if err != nil {
		t.Fatalf("RecordHotSeatTurn: %v", err)
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

// A question passing along used to be a request of its own, and the whole of what it
// did was write an attempt row so that the next request could count the rows. The app
// walks that line itself now and says the whole of it once, when the question closes --
// so the only way to tell the server a question was missed is to tell it the question is
// over, and a body that stops half way is refused.
//
// This is what stands in for the branch that used to handle it, and it is the more
// important test of the two: a short list quietly accepted would kill a question with
// people still to ask.
func TestATurnThatStopsHalfWayRoundIsRefused(t *testing.T) {
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}

	// Seat 1 missed it, and nobody is named as having taken it -- but seats 2 and 3
	// have not been asked yet.
	if err := settleTurn(store, []int{1}, nil); !errors.Is(err, ErrStaleTurn) {
		t.Fatalf("settleTurn: %v, want ErrStaleTurn", err)
	}

	if got, want := store.session.CurrentPosition, 0; got != want {
		t.Errorf("CurrentPosition = %d, want %d -- a refused turn moves nothing", got, want)
	}
	if len(store.recorded.Questions) > 0 || len(store.recorded.Answers) > 0 {
		t.Error("a refused turn wrote rows")
	}
}

// The whole of what keeps a settled turn honest: the seats it names have to be the front
// of the line the server works out for itself, in that order, with the taker next along.
// Anything else is a client whose arithmetic has drifted from the server's, and it is
// refused rather than scored.
func TestASettledTurnHasToMatchThePassLine(t *testing.T) {
	// Master 0, opened on seat 1, so the line is 1, 2, 3.
	tests := []struct {
		name   string
		missed []int
		// correct is a seat, or -1 for a question nobody took.
		correct int
	}{
		{"skips a seat in the line", []int{1}, 3},
		{"names the line out of order", []int{2, 1}, 3},
		{"hands it to somebody already asked", []int{1, 2}, 1},
		{"hands it to the quizmaster", []int{1, 2}, 0},
		{"says the quizmaster missed it", []int{0}, 1},
		{"claims more misses than there are seats", []int{1, 2, 3, 0}, -1},
		{"takes it without saying who missed it first", nil, 3},
	}

	for _, row := range tests {
		t.Run(row.name, func(t *testing.T) {
			store := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}

			var correct *int
			if row.correct >= 0 {
				seat := row.correct
				correct = &seat
			}

			if err := settleTurn(store, row.missed, correct); !errors.Is(err, ErrStaleTurn) {
				t.Fatalf("settleTurn: %v, want ErrStaleTurn", err)
			}
			if len(store.recorded.Answers) > 0 {
				t.Error("a refused turn wrote attempt rows")
			}
			for _, player := range store.session.Players {
				if player.Score != 0 {
					t.Errorf("seat %d scored %d off a refused turn", player.Seat, player.Score)
				}
			}
		})
	}
}

// The rows a settled turn leaves behind are the rows the old request-per-press path left
// behind: one per seat that had a go, in the order the question reached them, the last
// of them correct. Everything that reads a game's history afterwards -- and the attempt
// count the server itself uses to find its place -- depends on that staying true.
func TestASettledTurnWritesOneRowPerSeatThatHadAGo(t *testing.T) {
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}

	// Seats 1 and 2 missed it round the table; seat 3 took it.
	seat := 3
	if err := settleTurn(store, []int{1, 2}, &seat); err != nil {
		t.Fatalf("settleTurn: %v", err)
	}

	rows := store.recorded.Answers
	if len(rows) != 3 {
		t.Fatalf("wrote %d attempt rows, want 3 -- one per seat that had a go", len(rows))
	}

	for i, want := range []struct {
		seat    int
		correct bool
	}{{1, false}, {2, false}, {3, true}} {
		if rows[i].Seat == nil || *rows[i].Seat != want.seat {
			t.Errorf("row %d: seat = %v, want %d", i, rows[i].Seat, want.seat)
		}
		if rows[i].Correct != want.correct {
			t.Errorf("row %d: Correct = %v, want %v", i, rows[i].Correct, want.correct)
		}
	}

	// Only the seat that took it is paid, and only what the slot was worth.
	if got := store.session.PlayerAt(3).Score; got != rows[2].Points {
		t.Errorf("seat 3 scored %d, want the %d the row says it paid", got, rows[2].Points)
	}
	for _, missed := range []int{1, 2} {
		if got := store.session.PlayerAt(missed).Score; got != 0 {
			t.Errorf("seat %d missed it and scored %d, want 0", missed, got)
		}
	}
}

// Quick assign, from the server's side: a quizmaster who asked the table in a circle and
// then named the winner sends exactly what pressing Wrong down to them and Correct would
// have sent. There is nothing here for it to be a special case of -- it is the same body.
func TestNamingAWinnerDownTheLineLandsWhereWrongThenCorrectDoes(t *testing.T) {
	quick := &verdictStore{session: newVerdictSession(0, 1, 0, 6)}
	seat := 3
	if err := settleTurn(quick, []int{1, 2}, &seat); err != nil {
		t.Fatalf("settleTurn: %v", err)
	}

	// The same question reached the same way one press at a time, which the store's
	// attempt count is how these tests say.
	long := &verdictStore{session: newVerdictSession(0, 1, 0, 6), attempts: 2}
	rule(t, long, true)

	if got, want := quick.session.HotSeat, long.session.HotSeat; got != want {
		t.Errorf("HotSeat = %d, want %d", got, want)
	}
	if got, want := quick.session.QuizMasterSeat, long.session.QuizMasterSeat; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d", got, want)
	}
	if got, want := quick.session.HotSeatRun, long.session.HotSeatRun; got != want {
		t.Errorf("HotSeatRun = %d, want %d", got, want)
	}
	if got, want := quick.session.PlayerAt(3).Score, long.session.PlayerAt(3).Score; got != want {
		t.Errorf("seat 3 scored %d, want %d", got, want)
	}
}

// A question that beat the whole table hands the seat to whoever was reading it out.
// They are the one player it was never put to -- it went round everybody else on its way
// to dying -- so they get the next one, and the reading drops back to the seat on their
// right the way it does everywhere else.
func TestQuestionNobodyGetsPutsTheReaderInTheSeat(t *testing.T) {
	// Master 0, question opened on seat 1 and already missed by seats 1 and 2. Seat 3
	// is the last go there is.
	store := &verdictStore{session: newVerdictSession(0, 1, 0, 6), attempts: 2}

	rule(t, store, false)

	if got, want := store.session.HotSeat, 0; got != want {
		t.Errorf("HotSeat = %d, want %d -- the reader is asked the next one", got, want)
	}
	if got, want := store.session.QuizMasterSeat, 3; got != want {
		t.Errorf("QuizMasterSeat = %d, want %d -- read to by the seat on their right", got, want)
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

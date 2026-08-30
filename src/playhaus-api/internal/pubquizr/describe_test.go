package pubquizr

import (
	"errors"
	"testing"

	"github.com/google/uuid"
)

// Round 4 is the only round where one turn covers several questions and one word pays
// two people, and the only one played in two halves: the seat on the describer's left
// answering against the clock, then one guess each round the rest of the table for what
// is left over. All of that is easy to get subtly wrong in ways a game would not notice
// until somebody added the scores up at the end of the night, so it is what these tests
// are about.

// newDescribeSession is a table of four in round 4, `words` each, with seat `describer`
// holding the phone.
func newDescribeSession(describer, words int) *Session {
	session := newVerdictSession(0, 1, 0, 0)
	session.CurrentRound = RoundDescribe
	session.CurrentPosition = 0
	session.ReadBy(describer)

	for seat := range session.Players {
		for i := 0; i < words; i++ {
			assigned := seat
			session.Questions = append(session.Questions, SessionQuestion{
				ID:           uuid.New(),
				Round:        RoundDescribe,
				Position:     seat*words + i,
				AssignedSeat: &assigned,
				Status:       QuestionPending,
			})
		}
	}

	return session
}

func award(t *testing.T, store *verdictStore, awards []WordAward) error {
	t.Helper()

	session := store.session
	_, err := NewService(store).RecordDescribeAwards(t.Context(), DescribeInput{
		SessionID:     session.ID,
		OwnerID:       verdictOwner,
		DescriberSeat: session.QuizMasterSeat,
		Awards:        awards,
	})

	return err
}

// A word that lands pays the describer for getting it across and whoever named it for
// naming it. That is the whole design of the round: one-sided, the describer would be
// sitting out their own turn.
//
// Both halves of the turn in one settle, which is how they always arrive: a leftover
// taken by a bonus seat and a word the guesser had inside the clock.
func TestAGuessedWordPaysBothOfThem(t *testing.T) {
	session := newDescribeSession(2, 3)
	store := &verdictStore{session: session}

	words := session.WordsFor(2)

	err := award(t, store, []WordAward{
		{SessionQuestionID: words[0].ID, Seats: []int{1}},
		{SessionQuestionID: words[1].ID},
		{SessionQuestionID: words[2].ID, Seats: []int{3}},
	})
	if err != nil {
		t.Fatalf("RecordDescribeAwards: %v", err)
	}

	if got, want := store.session.PlayerAt(2).Score, 2*DescribeWordPoints; got != want {
		t.Errorf("the describer scored %d, want %d -- one for each word that landed", got, want)
	}
	for _, seat := range []int{1, 3} {
		if got, want := store.session.PlayerAt(seat).Score, DescribeGuessPoints; got != want {
			t.Errorf("seat %d scored %d, want %d", seat, got, want)
		}
	}
	if got := store.session.PlayerAt(0).Score; got != 0 {
		t.Errorf("the seat that shouted nothing scored %d, want 0", got)
	}

	// The describer's score reaches the store once, carrying the total. Twice would be
	// two writes racing to the same value, which is confusing rather than wrong.
	describerRows := 0
	for _, player := range store.recorded.Players {
		if player.Seat == 2 {
			describerRows++
		}
	}
	if describerRows != 1 {
		t.Errorf("the describer was written %d times, want 1", describerRows)
	}
}

// One point per correct guess, not one per turn: the seat being described to may take
// every word of the turn, and takes one for each of them.
//
// They are the exception to the round's one-guess-each rule, and the reason it is worth a
// test of its own: the same three awards to anybody else is a refusal.
func TestAGuesserTakesOneForEachWordTheyGet(t *testing.T) {
	session := newDescribeSession(0, 3)
	store := &verdictStore{session: session}

	words := session.WordsFor(0)
	guesser := session.DescribeGuesser()

	err := award(t, store, []WordAward{
		{SessionQuestionID: words[0].ID, Seats: []int{guesser}},
		{SessionQuestionID: words[1].ID, Seats: []int{guesser}},
		{SessionQuestionID: words[2].ID, Seats: []int{guesser}},
	})
	if err != nil {
		t.Fatalf("RecordDescribeAwards: %v", err)
	}

	if got, want := store.session.PlayerAt(guesser).Score, 3*DescribeGuessPoints; got != want {
		t.Errorf("the guesser scored %d, want %d", got, want)
	}
	if got, want := store.session.PlayerAt(0).Score, 3*DescribeWordPoints; got != want {
		t.Errorf("the describer scored %d, want %d", got, want)
	}
}

// A word taken after the clock stops pays exactly what one taken inside it does: a point
// to whoever stole it and a point to the describer.
//
// The describer earns theirs for getting the word across, and getting it across late
// still counts -- somebody at that table only knew the word because of how it was
// described. Worth pinning down, because the two halves of the turn arrive in the same
// batch and nothing downstream can tell them apart.
func TestABonusWordPaysWhatAnInTimeOneDoes(t *testing.T) {
	session := newDescribeSession(0, 2)
	store := &verdictStore{session: session}

	words := session.WordsFor(0)
	guesser := session.DescribeGuesser()
	bonus := session.DescribeBonusSeats()[0]

	err := award(t, store, []WordAward{
		{SessionQuestionID: words[0].ID, Seats: []int{guesser}},
		{SessionQuestionID: words[1].ID, Seats: []int{bonus}},
	})
	if err != nil {
		t.Fatalf("RecordDescribeAwards: %v", err)
	}

	for _, seat := range []int{guesser, bonus} {
		if got, want := store.session.PlayerAt(seat).Score, DescribeGuessPoints; got != want {
			t.Errorf("seat %d scored %d, want %d -- a late word is not worth less", seat, got, want)
		}
	}
	if got, want := store.session.PlayerAt(0).Score, 2*DescribeWordPoints; got != want {
		t.Errorf("the describer scored %d, want %d -- both words landed", got, want)
	}

	for _, word := range store.recorded.Questions {
		if got, want := word.Points, DescribeWordPoints+DescribeGuessPoints; got != want {
			t.Errorf("a word closed for %d, want %d", got, want)
		}
	}
}

// Everybody but the seat being described to gets one guess, and one is one -- naming the
// same player for a second leftover is the bonus round being played twice.
func TestOnlyTheGuesserTakesMoreThanOne(t *testing.T) {
	session := newDescribeSession(0, 2)
	store := &verdictStore{session: session}

	words := session.WordsFor(0)
	bonus := session.DescribeBonusSeats()[0]

	err := award(t, store, []WordAward{
		{SessionQuestionID: words[0].ID, Seats: []int{bonus}},
		{SessionQuestionID: words[1].ID, Seats: []int{bonus}},
	})

	if !errors.Is(err, ErrOneGuessEach) {
		t.Fatalf("err = %v, want %v", err, ErrOneGuessEach)
	}
	if len(store.recorded.Answers) > 0 || len(store.recorded.Players) > 0 {
		t.Error("a refused turn still wrote something")
	}
}

// Who is playing, and in what order the leftovers go round. The guesser is the seat on
// the describer's left -- the same seat every other round is read to -- and the bonus
// walks on from there, the describer and the guesser both left out.
func TestDescribeSeatsWalkFromTheDescribersLeft(t *testing.T) {
	for _, describer := range []int{0, 1, 2, 3} {
		session := newDescribeSession(describer, 2)

		if got, want := session.DescribeGuesser(), (describer+1)%4; got != want {
			t.Errorf("describer %d plays to seat %d, want %d", describer, got, want)
		}

		want := []int{(describer + 2) % 4, (describer + 3) % 4}
		got := session.DescribeBonusSeats()
		if len(got) != len(want) {
			t.Fatalf("describer %d: bonus seats %v, want %v", describer, got, want)
		}
		for i := range want {
			if got[i] != want[i] {
				t.Fatalf("describer %d: bonus seats %v, want %v", describer, got, want)
			}
		}
	}
}

// Every point in this game is meant to be accountable to a row, the describer's included.
func TestEveryWordLeavesItsOwnRecord(t *testing.T) {
	session := newDescribeSession(1, 2)
	store := &verdictStore{session: session}

	words := session.WordsFor(1)

	err := award(t, store, []WordAward{
		{SessionQuestionID: words[0].ID, Seats: []int{3}},
		{SessionQuestionID: words[1].ID},
	})
	if err != nil {
		t.Fatalf("RecordDescribeAwards: %v", err)
	}

	// Two rows for the word that landed, one for the word that did not.
	if got, want := len(store.recorded.Answers), 3; got != want {
		t.Fatalf("wrote %d rows, want %d", got, want)
	}
	if got, want := len(store.recorded.Questions), 2; got != want {
		t.Errorf("closed %d words, want %d -- a missed word is still done with", got, want)
	}

	var missed *SessionAnswer
	for _, answer := range store.recorded.Answers {
		if answer.Seat == nil {
			missed = answer
		}
	}
	if missed == nil {
		t.Fatal("the word nobody got was not written down")
	}
	if missed.Correct || missed.Points != 0 {
		t.Errorf("the word nobody got was written as correct = %v for %d points", missed.Correct, missed.Points)
	}

	for _, word := range store.recorded.Questions {
		want := DescribeWordPoints + DescribeGuessPoints
		if word.ID == words[1].ID {
			want = 0
		}
		if word.Points != want {
			t.Errorf("word %s closed for %d, want %d", word.ID, word.Points, want)
		}
	}
}

func TestDescribeRefusals(t *testing.T) {
	session := newDescribeSession(2, 2)
	words := session.WordsFor(2)
	otherTurn := session.WordsFor(3)
	describer, stranger := 2, 9
	// The seat being described to, and one of the two who only get a bonus guess.
	guesser, bonus := session.DescribeGuesser(), session.DescribeBonusSeats()[0]

	table := []struct {
		name   string
		awards []WordAward
		want   error
	}{
		{
			name:   "you cannot guess your own word",
			awards: []WordAward{{SessionQuestionID: words[0].ID, Seats: []int{describer}}, {SessionQuestionID: words[1].ID}},
			want:   ErrDescriberCannotGuess,
		},
		{
			name:   "a word out of somebody else's thirty seconds",
			awards: []WordAward{{SessionQuestionID: otherTurn[0].ID, Seats: []int{guesser}}, {SessionQuestionID: words[1].ID}},
			want:   ErrUnknownWord,
		},
		{
			name:   "a seat that is not at this table",
			awards: []WordAward{{SessionQuestionID: words[0].ID, Seats: []int{stranger}}, {SessionQuestionID: words[1].ID}},
			want:   ErrUnknownSeat,
		},
		{
			name:   "a word left unruled",
			awards: []WordAward{{SessionQuestionID: words[0].ID, Seats: []int{guesser}}},
			want:   ErrInvalidInput,
		},
		{
			name:   "one word ruled on twice",
			awards: []WordAward{{SessionQuestionID: words[0].ID, Seats: []int{guesser}}, {SessionQuestionID: words[0].ID}},
			want:   ErrInvalidInput,
		},
		{
			name:   "two names on one word",
			awards: []WordAward{{SessionQuestionID: words[0].ID, Seats: []int{guesser, bonus}}, {SessionQuestionID: words[1].ID}},
			want:   ErrTwoOnOneWord,
		},
		{
			name:   "the same seat named twice for one word",
			awards: []WordAward{{SessionQuestionID: words[0].ID, Seats: []int{guesser, guesser}}, {SessionQuestionID: words[1].ID}},
			want:   ErrTwoOnOneWord,
		},
		{
			name:   "a bonus guess spent twice",
			awards: []WordAward{{SessionQuestionID: words[0].ID, Seats: []int{bonus}}, {SessionQuestionID: words[1].ID, Seats: []int{bonus}}},
			want:   ErrOneGuessEach,
		},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			store := &verdictStore{session: newDescribeSession(2, 2)}
			// The fixture is rebuilt per case, so the ids have to come off this one.
			fresh := store.session.WordsFor(2)
			other := store.session.WordsFor(3)
			awards := make([]WordAward, len(row.awards))
			for i, a := range row.awards {
				awards[i] = a
				switch a.SessionQuestionID {
				case words[0].ID:
					awards[i].SessionQuestionID = fresh[0].ID
				case words[1].ID:
					awards[i].SessionQuestionID = fresh[1].ID
				case otherTurn[0].ID:
					awards[i].SessionQuestionID = other[0].ID
				}
			}

			err := award(t, store, awards)

			if !errors.Is(err, row.want) {
				t.Fatalf("err = %v, want %v", err, row.want)
			}
			if len(store.recorded.Answers) > 0 || len(store.recorded.Players) > 0 {
				t.Error("a refused turn still wrote something")
			}
		})
	}
}

// The turn is named by who is describing, so a phone still showing the last turn names
// the last describer and is refused.
func TestDescribeRefusesAStaleTurn(t *testing.T) {
	session := newDescribeSession(2, 2)
	store := &verdictStore{session: session}

	words := session.WordsFor(2)
	_, err := NewService(store).RecordDescribeAwards(t.Context(), DescribeInput{
		SessionID:     session.ID,
		OwnerID:       verdictOwner,
		DescriberSeat: 1,
		Awards: []WordAward{
			{SessionQuestionID: words[0].ID},
			{SessionQuestionID: words[1].ID},
		},
	})

	if !errors.Is(err, ErrStaleTurn) {
		t.Fatalf("err = %v, want %v", err, ErrStaleTurn)
	}
}

// One turn per player, however many words each turn holds -- and then the round is done.
func TestRoundFourIsOneTurnEach(t *testing.T) {
	session := newDescribeSession(0, 2)
	store := &verdictStore{session: session}

	for turn := 0; turn < len(session.Players); turn++ {
		describer := store.session.QuizMasterSeat
		if got, want := describer, turn; got != want {
			t.Fatalf("turn %d is being described by seat %d, want %d", turn, got, want)
		}

		words := store.session.WordsFor(describer)
		awards := make([]WordAward, 0, len(words))
		for _, word := range words {
			awards = append(awards, WordAward{SessionQuestionID: word.ID})
		}

		if err := award(t, store, awards); err != nil {
			t.Fatalf("turn %d: %v", turn, err)
		}
	}

	if got, want := store.session.CurrentRound, RoundList; got != want {
		t.Errorf("CurrentRound = %d, want %d -- four turns is the whole round", got, want)
	}
	if got, want := store.session.CurrentPosition, 0; got != want {
		t.Errorf("CurrentPosition = %d, want %d", got, want)
	}
}

func TestWordsForIsOnlyThatSeatsWords(t *testing.T) {
	session := newDescribeSession(0, 3)

	for seat := range session.Players {
		words := session.WordsFor(seat)

		if got, want := len(words), 3; got != want {
			t.Fatalf("seat %d has %d words, want %d", seat, got, want)
		}
		for i, word := range words {
			if *word.AssignedSeat != seat {
				t.Errorf("seat %d was handed a word belonging to seat %d", seat, *word.AssignedSeat)
			}
			if got, want := word.Position, seat*3+i; got != want {
				t.Errorf("seat %d word %d is at position %d, want %d -- deal order", seat, i, got, want)
			}
		}
	}
}

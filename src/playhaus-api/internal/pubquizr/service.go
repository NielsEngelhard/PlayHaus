package pubquizr

import (
	"context"
	"fmt"
	"math"
	"math/rand/v2"
	"strings"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/user"

	"github.com/google/uuid"
)

type Store interface {
	QuizByID(ctx context.Context, id uuid.UUID) (*Quiz, error)
	QuizBySlug(ctx context.Context, slug string, locale i18n.Locale) (*Quiz, error)
	ListQuizzes(ctx context.Context, f QuizFilter) ([]*Quiz, int64, error)
	QuestionCounts(ctx context.Context, quizIDs []uuid.UUID) (map[uuid.UUID]int, error)
	ReplaceQuiz(ctx context.Context, quiz *Quiz) error

	CreateSession(ctx context.Context, session *Session) error
	SessionByID(ctx context.Context, id uuid.UUID) (*Session, error)
	SessionsInProgressByUserID(ctx context.Context, userID string) ([]*Session, error)
	CurrentSessionByOwnerID(ctx context.Context, ownerID string) (*Session, error)
	DeleteSessionByID(ctx context.Context, sessionID uuid.UUID, ownerID string) error
	DeleteSessionsByOwnerID(ctx context.Context, ownerID string, except uuid.UUID) error
	// AttemptsOn counts answer rows, which is a count of seats that have had a go only
	// in the hot seat rounds -- see the note on GormStore.AttemptsOn. Ask
	// IsHotSeatRound before reading it as one.
	AttemptsOn(ctx context.Context, sessionQuestionID uuid.UUID) (int, error)
	RecordTurn(ctx context.Context, session *Session, out TurnOutcome) error
}

// Pagination defaults for the quiz shelf. PageSize is clamped rather than refused:
// asking for a thousand quizzes is a client being optimistic, not a client being
// wrong, and a page of fifty is plenty to scroll.
const (
	DefaultPageSize = 20
	MaxPageSize     = 50
)

// QuizFilter is one page of the shelf.
//
// Locale is not optional. A quiz is written for one language -- see the note on
// Quiz -- so a list that mixed them would be showing most people questions they
// cannot play.
type QuizFilter struct {
	Locale   i18n.Locale
	Category Category // empty means every shelf
	Page     int      // 1-based
	PageSize int
}

// normalize fills in what the caller left out and pulls the rest into range.
func (f QuizFilter) normalize() QuizFilter {
	if !f.Locale.Valid() {
		f.Locale = i18n.Default
	}
	if f.Category != "" && !f.Category.Valid() {
		f.Category = ""
	}
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 {
		f.PageSize = DefaultPageSize
	}
	if f.PageSize > MaxPageSize {
		f.PageSize = MaxPageSize
	}
	return f
}

func (f QuizFilter) Offset() int { return (f.Page - 1) * f.PageSize }

// QuizPage is a page of the shelf and enough to draw the pager around it.
type QuizPage struct {
	Quizzes  []*Quiz
	Counts   map[uuid.UUID]int
	Page     int
	PageSize int
	Total    int64
}

func (p QuizPage) HasMore() bool {
	return int64(p.Page*p.PageSize) < p.Total
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Quiz(ctx context.Context, id uuid.UUID) (*Quiz, error) {
	quiz, err := s.store.QuizByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return quiz, nil
}

// ListQuizzes is one page of the shelf.
func (s *Service) ListQuizzes(ctx context.Context, f QuizFilter) (*QuizPage, error) {
	f = f.normalize()

	quizzes, total, err := s.store.ListQuizzes(ctx, f)
	if err != nil {
		return nil, err
	}

	ids := make([]uuid.UUID, 0, len(quizzes))
	for _, quiz := range quizzes {
		ids = append(ids, quiz.ID)
	}
	counts, err := s.store.QuestionCounts(ctx, ids)
	if err != nil {
		return nil, err
	}

	return &QuizPage{
		Quizzes:  quizzes,
		Counts:   counts,
		Page:     f.Page,
		PageSize: f.PageSize,
		Total:    total,
	}, nil
}

func (s *Service) Session(ctx context.Context, id uuid.UUID) (*Session, error) {
	return s.store.SessionByID(ctx, id)
}

// SessionForOwner is a session, refused unless it is this player's phone.
func (s *Service) SessionForOwner(ctx context.Context, id uuid.UUID, ownerID string) (*Session, error) {
	session, err := s.store.SessionByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if session.OwnerID != ownerID {
		return nil, ErrSessionNotFound
	}
	return session, nil
}

func (s *Service) SessionsInProgress(ctx context.Context, userID string) ([]*Session, error) {
	if userID == "" {
		return nil, nil
	}
	return s.store.SessionsInProgressByUserID(ctx, userID)
}

// CurrentSession is the unfinished evening this player owns, or ErrSessionNotFound
// when there is none.
//
// There is at most one: starting a game throws the rest away. What it is for is the
// question the setup screen asks before it starts another -- see
// StartSingleDeviceSession, where the throwing away actually happens.
func (s *Service) CurrentSession(ctx context.Context, ownerID string) (*Session, error) {
	if ownerID == "" {
		return nil, ErrSessionNotFound
	}
	return s.store.CurrentSessionByOwnerID(ctx, ownerID)
}

// DeleteSession throws one evening away, for good: the rows go rather than the status
// moving to abandoned, so there is nothing to read back afterwards and no undo to
// offer. Ask before calling it.
//
// Owning it is the whole of the permission model, so somebody else's session is a
// no-op rather than a refusal.
func (s *Service) DeleteSession(ctx context.Context, sessionID uuid.UUID, ownerID string) error {
	if ownerID == "" {
		return fmt.Errorf("delete session: %w: missing owner", ErrInvalidInput)
	}
	return s.store.DeleteSessionByID(ctx, sessionID, ownerID)
}

type StartSingleDeviceInput struct {
	QuizID  uuid.UUID
	OwnerID string
	// PlayerNames are in seating order, left to right, because the phone gets
	// turned round the table as the quiz master role moves.
	PlayerNames []string
}

func (in StartSingleDeviceInput) validate() map[string]string {
	problems := map[string]string{}

	if !PlayerCountOK(len(in.PlayerNames)) {
		// Two messages off the one rule: which side of it you fell off is the only
		// part the person setting up the quiz can do anything about.
		if len(in.PlayerNames) < MinPlayers {
			problems["playerNames"] = fmt.Sprintf("needs at least %d players", MinPlayers)
		} else {
			problems["playerNames"] = fmt.Sprintf("takes at most %d players", MaxPlayers)
		}
	}
	for _, name := range in.PlayerNames {
		if strings.TrimSpace(name) == "" {
			problems["playerNames"] = "every player needs a name"
			break
		}
	}

	return problems
}

// StartSingleDeviceSession opens a game for one table sharing one phone.
//
// Everything the evening will play is dealt here rather than as it goes: how many
// round 2 questions there are and whose round 4 words are whose both depend on how
// many of you turned up, and neither should change because somebody reloaded the
// page. League of Letters does the same thing when it writes its words into
// lol_rounds up front.
func (s *Service) StartSingleDeviceSession(ctx context.Context, in StartSingleDeviceInput) (*Session, map[string]string, error) {
	if in.OwnerID == "" {
		return nil, nil, fmt.Errorf("start single device session: %w: missing owner", ErrInvalidInput)
	}
	if problems := in.validate(); len(problems) > 0 {
		return nil, problems, nil
	}

	names, err := seatNames(in.PlayerNames)
	if err != nil {
		return nil, nil, err
	}

	quiz, err := s.Quiz(ctx, in.QuizID)
	if err != nil {
		return nil, nil, err
	}

	deal, err := dealQuestions(quiz, len(names))
	if err != nil {
		return nil, nil, err
	}

	// Round 1 opens on a seat drawn out of the hat. It used to open on seat 0 every
	// time, which handed the first go as quiz master to whoever happened to type their
	// name into the setup form first -- a decision about the game being made by the
	// order of a list of text fields. Whoever it lands on is read to by the seat on
	// their right, which is the rule every question after it follows too.
	opening := rand.IntN(len(names))

	now := time.Now().UTC()
	session := &Session{
		ID:      uuid.New(),
		QuizID:  quiz.ID,
		OwnerID: in.OwnerID,
		Mode:    ModeSingleDevice,
		Locale:  quiz.Locale,
		Status:  SessionInProgress,

		CurrentRound:    RoundOpen,
		CurrentPosition: 0,
		QuizMasterSeat:  ReaderFor(opening, len(names)),
		HotSeat:         opening,

		CreatedAt: now,
		UpdatedAt: now,
	}

	session.Players = make([]SessionPlayer, len(names))
	for seat, name := range names {
		session.Players[seat] = SessionPlayer{
			SessionID: session.ID,
			Seat:      seat,
			Name:      name,
			Score:     0,
			// The palette repeats past six, which only happens at a table of seven
			// or eight -- two people in the same colour beats a colour the app
			// cannot draw.
			Color:     user.Colors[seat%len(user.Colors)],
			CreatedAt: now,
		}
	}

	session.Questions = make([]SessionQuestion, len(deal))
	for i, dealt := range deal {
		session.Questions[i] = SessionQuestion{
			ID:           uuid.New(),
			SessionID:    session.ID,
			Round:        dealt.round,
			Position:     dealt.position,
			QuestionID:   dealt.questionID,
			AssignedSeat: dealt.assignedSeat,
			Status:       QuestionPending,
			CreatedAt:    now,
		}
	}

	if err := s.store.CreateSession(ctx, session); err != nil {
		return nil, nil, err
	}

	// A table plays one evening at a time: this one replaces whatever was still
	// open, however far into it the last lot got. Deleted after the insert rather
	// than before it, so the only thing a failure here can leave behind is a game
	// too many -- and the screen that starts a game asks about a running one first,
	// which is where a person gets to say no to this.
	if err := s.store.DeleteSessionsByOwnerID(ctx, in.OwnerID, session.ID); err != nil {
		return nil, nil, fmt.Errorf("delete previous sessions: %w", err)
	}

	return session, nil, nil
}

// seatNames trims the roster and refuses a table where two people would answer to
// the same thing.
func seatNames(raw []string) ([]string, error) {
	names := make([]string, 0, len(raw))
	seen := make(map[string]struct{}, len(raw))

	for _, name := range raw {
		trimmed := strings.TrimSpace(name)
		// Case-insensitively: "Niels" and "niels" are one person as far as a room
		// shouting answers is concerned.
		key := strings.ToLower(trimmed)
		if _, taken := seen[key]; taken {
			return nil, fmt.Errorf("%w: %q", ErrDuplicatePlayerName, trimmed)
		}
		seen[key] = struct{}{}
		names = append(names, trimmed)
	}

	if !PlayerCountOK(len(names)) {
		if len(names) < MinPlayers {
			return nil, ErrTooFewPlayers
		}
		return nil, ErrTooManyPlayers
	}

	return names, nil
}

// dealtQuestion is one slot in the evening's running order.
type dealtQuestion struct {
	round        int
	position     int
	questionID   uuid.UUID
	assignedSeat *int
}

// roundDeal is what one round takes off a quiz.
//
// Both halves are functions of what the quiz actually carries, because two of the rounds
// shrink to fit it. Round 4 needs the second one especially: whose word is whose depends
// on how many words each player ended up with, which is not known until the first half
// has answered.
type roundDeal struct {
	number int
	// want is how much of what the quiz holds this table plays.
	want func(available int) int
	// seatFor is whose question each slot is, built once the size of the deal is
	// known. Nil for the rounds that belong to the table.
	//
	// carried is what the quiz holds for the round, dealt is how much of it this table
	// plays. Round 4 needs the first: how many words each player gets is a rule about
	// the pool, and the dealt count is that rule's answer already applied.
	seatFor func(carried, dealt int) func(i int) *int
}

// dealQuestions works out what this table will actually play.
func dealQuestions(quiz *Quiz, players int) ([]dealtQuestion, error) {
	var deal []dealtQuestion

	// all is a round that plays everything the quiz carries for it.
	all := func(available int) int { return available }
	// toTheTable is a round whose questions belong to nobody in particular. Every
	// round but the fourth: even round 2, which used to hand everybody their own ABCD
	// question and now runs on the hot seat like round 1, where the reading moves and
	// the questions do not.
	toTheTable := func(int, int) func(int) *int { return func(int) *int { return nil } }
	// inTurns keeps a player's words together, which is what round 4 needs: you
	// describe all of yours inside the same thirty seconds.
	//
	// How many each is asked of DescribeWordsPerPlayer, against what the quiz carries.
	// It used to be dealt/players with a floor of 1, which is the same answer -- the
	// deal is players*per by construction, so dividing it back out returns per, and
	// the floor was MinDescribeWordsPerTurn spelled as a literal. But it was the rule
	// worked out a second way, and it only agreed because of an identity two functions
	// away in another file. Asking the rule cannot disagree with the rule.
	inTurns := func(carried, _ int) func(int) *int {
		per := DescribeWordsPerPlayer(players, carried)
		if per <= 0 {
			// Only reachable with nobody at the table, which deals no words at all --
			// but the division below is not the place to find that out.
			return func(int) *int { return nil }
		}
		return func(i int) *int {
			seat := i / per
			return &seat
		}
	}

	// The running order of an evening. Fixed, and the one rule in this file that is not
	// in rules.go: it is a table of functions rather than values, and every number in it
	// is already a call into rules.go.
	for _, round := range []roundDeal{
		{RoundOpen, all, toTheTable},
		{RoundChoice, func(int) int { return ChoiceQuestionsFor(players) }, toTheTable},
		{RoundClosest, func(a int) int { return ClosestQuestionsFor(players, a) }, toTheTable},
		{RoundDescribe, func(a int) int { return DescribeWordsFor(players, a) }, inTurns},
		{RoundList, all, toTheTable},
		// The finalists are not known until the other five rounds are done, so the
		// finale is dealt to the table and assigned to nobody.
		{RoundFinale, all, toTheTable},
	} {
		available := quiz.QuestionsIn(round.number)
		// Held on to, because available is about to be cut down to what this table
		// plays and one of the rules is about the whole pool.
		carried := len(available)

		if minimum := MinQuestionsIn(round.number); len(available) < minimum {
			return nil, fmt.Errorf("%w: round %d has %d questions, needs %d",
				ErrQuizTooSmall, round.number, len(available), minimum)
		}

		want := round.want(len(available))
		if want > len(available) {
			return nil, fmt.Errorf("%w: round %d has %d questions, %d players need %d",
				ErrQuizTooSmall, round.number, len(available), players, want)
		}
		available = available[:want]

		seatFor := round.seatFor(carried, len(available))
		for i, question := range available {
			deal = append(deal, dealtQuestion{
				round:        round.number,
				position:     i,
				questionID:   question.ID,
				assignedSeat: seatFor(i),
			})
		}
	}

	return deal, nil
}

// VerdictInput is the quizmaster's ruling on what they just heard.
//
// Deliberately not carrying the seat. Who is answering is the game's own business --
// it falls out of who is reading and how many people have already had a go -- and a
// client that got to name it could hand a point to whoever it liked.
type VerdictInput struct {
	SessionID uuid.UUID
	OwnerID   string
	// SessionQuestionID is the question the verdict was given for. It has to be
	// named so a screen left open, or a second tap on the same button, is refused
	// rather than silently scoring the question after it.
	SessionQuestionID uuid.UUID
	Correct           bool
	// Said is what the player actually answered, if the quizmaster typed it in.
	// Kept only so the table can argue about it afterwards.
	Said string
}

// RecordHotSeatVerdict scores one go at a round 1 or round 2 question and moves the
// game on.
//
// Three things can happen. A correct answer ends the question. In round 1 it keeps the
// seat: the next question is asked to whoever just took this one, and the reading comes
// round with them, because a question is always read by the seat on the answerer's
// right. Round 2 never keeps it -- see the round 2 note below. A wrong answer with
// somebody left to ask passes it along and changes nothing else. A wrong answer with
// nobody left ends the question for no points and moves the seat on by itself -- in
// round 1 onto the reader, the one seat the dead question never reached, and in round 2
// one along from where it opened.
//
// The two rounds also differ in what a question pays -- round 1 on every second one,
// round 2 on all of them and double, see HotSeatPointsAt.
//
// Round 2 additionally always shuffles the seat on one, correct or not: it deals exactly
// one question per player (ChoiceQuestionsFor), and the only way every seat ends up
// asked once and reading once is if landing a question never lets anybody keep it. Round
// 1 does not have this shape -- it deals more questions than there are players on
// purpose, so a table that is bad at trivia does not run out before it is done.
func (s *Service) RecordHotSeatVerdict(ctx context.Context, in VerdictInput) (*Session, error) {
	session, err := s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if !IsHotSeatRound(session.CurrentRound) {
		return nil, ErrWrongRound
	}

	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		return nil, ErrStaleTurn
	}
	if question.ID != in.SessionQuestionID {
		return nil, ErrStaleTurn
	}

	attempts, err := s.store.AttemptsOn(ctx, question.ID)
	if err != nil {
		return nil, err
	}

	hot := session.HotSeatOrFirst()

	seat := AnsweringSeat(session.QuizMasterSeat, hot, attempts, len(session.Players))
	if seat < 0 {
		// The question has already been round the whole table. Nobody is being
		// asked anything, so there is no verdict to give.
		return nil, ErrStaleTurn
	}

	player := session.PlayerAt(seat)
	if player == nil {
		return nil, fmt.Errorf("record verdict: no player in seat %d", seat)
	}

	attempt := &SessionAnswer{
		ID:                uuid.New(),
		SessionID:         session.ID,
		SessionQuestionID: question.ID,
		Seat:              &seat,
		Correct:           in.Correct,
		CreatedAt:         time.Now().UTC(),
	}
	if said := strings.TrimSpace(in.Said); said != "" {
		attempt.Text = &said
	}

	// Only the rows that actually changed go in. `RecordTurn` writes what it is given
	// and leaves the rest alone, so a wrong answer mid-question is one insert.
	out := TurnOutcome{Answers: []*SessionAnswer{attempt}}

	switch {
	case in.Correct:
		// Half the round 1 questions are worth nothing. Left as a zero rather than
		// skipped so the attempt row still says what it was worth at the time, which
		// is what the table will want when it argues about the score later.
		points := HotSeatPointsAt(session.CurrentRound, question.Position)
		attempt.Points = points

		if points > 0 {
			player.Score += points
			out.Players = append(out.Players, player)
		}

		question.Status = QuestionDone
		question.Points = points
		out.Questions = append(out.Questions, question)

		if !RoundKeepsTheSeat(session.CurrentRound) {
			// Round 2 never lets a correct answer keep the seat -- it shuffles on
			// exactly the way a wrong-with-nobody-left question does, so that over the
			// round's one question per player, every seat is asked exactly once and
			// reads exactly once. There is no streak to track, since nobody holds the
			// seat across two questions any more.
			session.HotSeatRun = 1
			session.OpenOn(hot + 1)
		} else {
			// They keep it, and the reading comes round to their own neighbour. Taking
			// a question is what buys you the next one, and the next one is read by the
			// seat on your right -- so a player taking a question from three seats down
			// the table takes the reading with them. Leaving the reading where it was
			// is what used to strand it on whoever opened the round while somebody else
			// was being asked everything.
			if seat == hot {
				session.HotSeatRun++
			} else {
				// They have taken it off whoever was holding the seat, so the run they
				// are starting is their own and one question long.
				session.HotSeatRun = 1
			}

			session.OpenOn(seat)
		}

		s.advance(session)

	case AnsweringSeat(session.QuizMasterSeat, hot, attempts+1, len(session.Players)) < 0:
		// Wrong, and that was the last seat with a go left. Nobody earned the seat, so
		// it moves by itself -- and the two rounds move it opposite ways.
		//
		// Round 1 hands it to the reader: a question that beat the table went round
		// everybody except them, so they are the one seat left that was never asked it,
		// and the reading falls back to the seat on their right the way it always does.
		// Round 2 shuffles one along from where the question opened instead, exactly as
		// a question somebody got does, because its one question per player only comes
		// out even if the table keeps moving the one way.
		question.Status = QuestionDone
		out.Questions = append(out.Questions, question)

		session.HotSeatRun = 0
		if session.CurrentRound == RoundChoice {
			session.OpenOn(hot + 1)
		} else {
			session.OpenOn(session.QuizMasterSeat)
		}
		s.advance(session)

	default:
		// Wrong, but the question is still alive: it simply passes along. Nothing
		// about the session moves -- the next answering seat falls out of the extra
		// attempt row this writes.
	}

	session.UpdatedAt = time.Now().UTC()

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, err
	}

	// Read back rather than returned from memory: the caller is about to draw a
	// screen off this, and the row the database now holds is the one that matters.
	return s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
}

// ClosestInput is the quizmaster settling one round 3 question.
//
// Two ways in, because there are two ways a table actually plays it. Either the
// quizmaster types every number and the server works out who was nearest, or they do not
// bother -- the table already agreed out loud -- and they simply say who won. Exactly one
// of the two, never both: a body carrying guesses and a winner is a screen that has
// disagreed with itself, and picking one of them for it would be picking at random.
//
// Guesses may be short of the whole table. Somebody is always at the bar, and a rule that
// insisted on everybody would be a screen the quizmaster cannot get off.
type ClosestInput struct {
	SessionID uuid.UUID
	OwnerID   string
	// SessionQuestionID is the question this settles, named for the same reason a
	// verdict names one: a screen left open, or a second tap, has to be refused rather
	// than quietly scoring the question after it.
	SessionQuestionID uuid.UUID

	Guesses      []SeatGuess
	WinningSeats []int
}

// RecordClosestGuesses settles one round 3 question and moves the game on.
func (s *Service) RecordClosestGuesses(ctx context.Context, in ClosestInput) (*Session, error) {
	session, err := s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundClosest {
		return nil, ErrWrongRound
	}

	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil || question.ID != in.SessionQuestionID {
		return nil, ErrStaleTurn
	}

	typed, named := len(in.Guesses) > 0, len(in.WinningSeats) > 0
	if typed == named {
		return nil, fmt.Errorf("closest guesses: %w: name the guesses or the winners, not both", ErrInvalidInput)
	}

	// Whichever way in, the seats have to be seats at this table, and never the person
	// reading the question out.
	seats := in.WinningSeats
	if typed {
		seats = make([]int, 0, len(in.Guesses))
		for _, guess := range in.Guesses {
			seats = append(seats, guess.Seat)
		}
	}
	if err := session.checkGuessingSeats(seats); err != nil {
		return nil, err
	}

	winners := in.WinningSeats
	if typed {
		for _, guess := range in.Guesses {
			if math.IsNaN(guess.Value) || math.IsInf(guess.Value, 0) {
				return nil, fmt.Errorf("closest guesses: %w: seat %d guessed something that is not a number",
					ErrInvalidInput, guess.Seat)
			}
		}
		if seat := DuplicateGuessSeat(in.Guesses); seat >= 0 {
			return nil, fmt.Errorf("%w: seat %d", ErrDuplicateGuess, seat)
		}

		target, err := s.closestAnswer(ctx, session, question)
		if err != nil {
			return nil, err
		}
		winners = ClosestWinners(target, in.Guesses)
	}

	won := make(map[int]bool, len(winners))
	for _, seat := range winners {
		won[seat] = true
	}

	now := time.Now().UTC()
	out := TurnOutcome{}

	// A row per guess when they were typed in, so the table can argue about the numbers
	// afterwards. In the other mode there is nothing true to write about the seats that
	// did not win -- nobody wrote down what they said -- so only the winners get a row.
	rows := in.Guesses
	if !typed {
		for _, seat := range winners {
			rows = append(rows, SeatGuess{Seat: seat, Value: math.NaN()})
		}
	}
	for _, guess := range rows {
		attempt := &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &guess.Seat,
			Correct:           won[guess.Seat],
			CreatedAt:         now,
		}
		if typed {
			value := guess.Value
			attempt.NumericValue = &value
		}
		if won[guess.Seat] {
			attempt.Points = ClosestPoints

			player := session.PlayerAt(guess.Seat)
			player.Score += ClosestPoints
			out.Players = append(out.Players, player)
		}

		out.Answers = append(out.Answers, attempt)
	}

	question.Status = QuestionDone
	question.Points = ClosestPoints
	out.Questions = append(out.Questions, question)

	s.advance(session)
	session.UpdatedAt = now

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, err
	}

	return s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
}

// checkGuessingSeats is the rule both ways into round 3 share: real seats, each named
// once, and never the person reading it out.
//
// "Real" is the part that keeps it out of rules.go -- which seats exist is a fact about
// this table, not about the game. The each-named-once half is DuplicateGuessSeat's.
func (s *Session) checkGuessingSeats(seats []int) error {
	named := make(map[int]struct{}, len(seats))

	for _, seat := range seats {
		if s.PlayerAt(seat) == nil {
			return fmt.Errorf("%w: seat %d", ErrUnknownSeat, seat)
		}
		if seat == s.QuizMasterSeat {
			return fmt.Errorf("%w: seat %d", ErrQuizmasterCannotGuess, seat)
		}
		if _, twice := named[seat]; twice {
			return fmt.Errorf("closest guesses: %w: seat %d twice", ErrInvalidInput, seat)
		}
		named[seat] = struct{}{}
	}

	return nil
}

// closestAnswer is the number a round 3 question is looking for.
//
// The one place a session path has to reach for content: a dealt question carries an id
// and nothing else, and who was nearest cannot be worked out without the answer. Only the
// typed-in mode asks -- a quizmaster who names the winner has already done this sum in
// their head.
func (s *Service) closestAnswer(ctx context.Context, session *Session, question *SessionQuestion) (float64, error) {
	quiz, err := s.store.QuizByID(ctx, session.QuizID)
	if err != nil {
		return 0, err
	}
	if quiz == nil {
		return 0, fmt.Errorf("closest answer: %w", ErrQuizNotFound)
	}

	for _, candidate := range quiz.Questions {
		if candidate.ID != question.QuestionID {
			continue
		}
		if candidate.NumericAnswer == nil {
			return 0, fmt.Errorf("closest answer: %w: question %s has no number", ErrInvalidInput, candidate.ID)
		}
		return *candidate.NumericAnswer, nil
	}

	return 0, fmt.Errorf("closest answer: %w", ErrQuizNotFound)
}

// WordAward is what became of one word inside the thirty seconds. Empty Seats is a word
// nobody got. More than one seat is a draw -- two people shouting it at the same
// instant -- and every seat named scores in full, the same way a tied round 3 guess
// does: splitting a point over an argument about who was half a second faster is not a
// rule a pub table would accept either.
type WordAward struct {
	SessionQuestionID uuid.UUID
	Seats             []int
}

// DescribeInput is the quizmaster settling one thirty second turn.
//
// DescriberSeat is carried for the reason a verdict carries a question id: it is what
// makes a screen left open, or a second tap on the same button, a refusal rather than a
// turn scored twice. A turn covers several words, so there is no single question to name
// -- but there is always exactly one person describing.
type DescribeInput struct {
	SessionID     uuid.UUID
	OwnerID       string
	DescriberSeat int
	// Awards must name every word of the turn, once each. The screen has a row per
	// word already, so asking for all of them costs it nothing and stops a body that
	// arrived half-written from quietly scoring a word as missed.
	Awards []WordAward
}

// RecordDescribeAwards scores one round 4 turn and moves the game on.
//
// Every guessed word pays the describer once for getting it across, and every guesser
// named for it once each for shouting it -- so a word with a single winner puts two
// points on the board, same as before, and a word with a draw puts on one more for
// every extra name.
func (s *Service) RecordDescribeAwards(ctx context.Context, in DescribeInput) (*Session, error) {
	session, err := s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundDescribe {
		return nil, ErrWrongRound
	}
	// The turn is named by who is describing rather than by a question, so this is the
	// staleness check: a phone still showing the last turn names the last describer.
	if in.DescriberSeat != session.QuizMasterSeat {
		return nil, ErrStaleTurn
	}

	words := session.WordsFor(in.DescriberSeat)
	if len(words) == 0 {
		// A describer with no words is a deal this build does not understand -- a
		// session dealt before round 4 had turns, most likely. Fail loudly on the one
		// turn rather than score a round nobody can account for.
		return nil, ErrStaleTurn
	}
	for _, word := range words {
		if word.Status == QuestionDone {
			return nil, ErrStaleTurn
		}
	}

	awarded, err := matchAwards(session, words, in)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	out := TurnOutcome{}
	// Accumulated rather than appended per word: the describer scores on several of
	// them and their score has to reach the store once, carrying the total.
	raised := map[int]*SessionPlayer{}

	score := func(seat, points int) {
		player := session.PlayerAt(seat)
		player.Score += points
		raised[seat] = player
	}

	for _, word := range words {
		winners := awarded[word.ID]

		if len(winners) == 0 {
			// No seat rows at all: nobody got this one, which is a thing worth writing
			// down rather than a row worth leaving out.
			word.Status = QuestionDone
			word.Points = 0
			out.Questions = append(out.Questions, word)
			out.Answers = append(out.Answers, &SessionAnswer{
				ID:                uuid.New(),
				SessionID:         session.ID,
				SessionQuestionID: word.ID,
				Correct:           false,
				CreatedAt:         now,
			})
			continue
		}

		// One row per winner, each a real point -- a draw is two (or more) people
		// shouting it at once, not one person's win split between them.
		for _, guesser := range winners {
			guesser := guesser
			out.Answers = append(out.Answers, &SessionAnswer{
				ID:                uuid.New(),
				SessionID:         session.ID,
				SessionQuestionID: word.ID,
				Seat:              &guesser,
				Correct:           true,
				Points:            DescribeGuessPoints,
				CreatedAt:         now,
			})
			score(guesser, DescribeGuessPoints)
		}

		// And one more row for the describer's own point, earned once per word no
		// matter how many people shouted it. They are told apart from the guesser rows
		// by the seat: the row whose seat is the describer's is theirs, and a guesser
		// can never be that seat.
		describer := in.DescriberSeat
		out.Answers = append(out.Answers, &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: word.ID,
			Seat:              &describer,
			Correct:           true,
			Points:            DescribeWordPoints,
			CreatedAt:         now,
		})
		score(describer, DescribeWordPoints)

		word.Status = QuestionDone
		word.Points = DescribeWordPointsFor(len(winners))
		out.Questions = append(out.Questions, word)
	}

	// In seat order, so two runs of the same turn write the same rows in the same
	// order and a failure is the same failure twice.
	for _, player := range session.Players {
		if scored, moved := raised[player.Seat]; moved {
			out.Players = append(out.Players, scored)
		}
	}

	s.advance(session)
	session.UpdatedAt = now

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, err
	}

	return s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
}

// matchAwards pairs what the quizmaster said with the words the turn actually holds, and
// refuses anything that does not line up exactly.
//
// The result is only the guessed ones: a word missing from it, or mapped to an empty
// slice, is a word nobody got.
//
// Carries round 4's "you cannot be credited with your own word" -- see GuessableSeats,
// which it checks against. Needs the turn's words and the table, so it stays.
func matchAwards(session *Session, words []*SessionQuestion, in DescribeInput) (map[uuid.UUID][]int, error) {
	thisTurn := make(map[uuid.UUID]struct{}, len(words))
	for _, word := range words {
		thisTurn[word.ID] = struct{}{}
	}

	guessed := map[uuid.UUID][]int{}
	named := make(map[uuid.UUID]struct{}, len(in.Awards))

	for _, award := range in.Awards {
		if _, mine := thisTurn[award.SessionQuestionID]; !mine {
			return nil, fmt.Errorf("%w: %s", ErrUnknownWord, award.SessionQuestionID)
		}
		if _, twice := named[award.SessionQuestionID]; twice {
			return nil, fmt.Errorf("describe awards: %w: word %s twice",
				ErrInvalidInput, award.SessionQuestionID)
		}
		named[award.SessionQuestionID] = struct{}{}

		if len(award.Seats) == 0 {
			continue
		}

		seen := make(map[int]struct{}, len(award.Seats))
		for _, seat := range award.Seats {
			if session.PlayerAt(seat) == nil {
				return nil, fmt.Errorf("%w: seat %d", ErrUnknownSeat, seat)
			}
			if seat == in.DescriberSeat {
				return nil, fmt.Errorf("%w: seat %d", ErrDescriberCannotGuess, seat)
			}
			if _, twice := seen[seat]; twice {
				return nil, fmt.Errorf("describe awards: %w: seat %d twice for word %s",
					ErrInvalidInput, seat, award.SessionQuestionID)
			}
			seen[seat] = struct{}{}
		}

		guessed[award.SessionQuestionID] = award.Seats
	}

	if len(named) != len(words) {
		return nil, fmt.Errorf("describe awards: %w: %d words in this turn, %d were ruled on",
			ErrInvalidInput, len(words), len(named))
	}

	return guessed, nil
}

// advance moves the session on to the next slot, and off the end of the round when
// there is no next slot.
//
// Rounds past the first are not playable yet, so the session stops at the top of
// round 2 rather than being marked complete -- there is more of this evening to
// play, and saying otherwise would take the game off the reconnect list.
func (s *Service) advance(session *Session) {
	session.CurrentPosition++

	if session.CurrentPosition < session.TurnsInRound(session.CurrentRound) {
		// Rounds 3 and 4 go round the table on their own: everybody guesses once,
		// everybody describes once, so the turn moves whether anybody scored or not.
		// Rounds 1 and 2 have already had their say -- where they go next was decided
		// by the verdict, because taking a question keeps you in the seat.
		if RotatesEachTurn(session.CurrentRound) {
			session.RotateOneSeat()
		}
		return
	}

	session.CurrentRound++
	session.CurrentPosition = 0

	if session.CurrentRound > Rounds {
		session.Status = SessionCompleted
		finished := time.Now().UTC()
		session.CompletedAt = &finished
		return
	}

	// A run is a round 1 thing -- it counts questions asked to one seat in a row -- so
	// nothing carries it over a round boundary.
	session.HotSeatRun = 0

	// Every round but the first opens on whoever is furthest behind, which is the one
	// place a score decides anything about the order. What "opens on" means is the
	// round's own business -- round 4 reads it as who describes first, because there
	// the phone goes to the describer.
	session.OpenRoundOn(session.CurrentRound, session.LowestScoringSeat())
}

// AnsweringSeatFor is whose turn it is to answer in this session right now, or -1
// when nobody is being asked anything.
//
// On the service rather than on Session because it needs the attempt count, and
// counting rows is the store's job. Everything it does with that count is the
// arithmetic in hot_seat.go.
//
// The round check comes before the question lookup, and has to: round 4's
// CurrentPosition counts turns rather than words, so looking a question up by it there
// would find a word out of somebody else's thirty seconds. The result is thrown away
// today, which is exactly the sort of thing that stops being true quietly.
func (s *Service) AnsweringSeatFor(ctx context.Context, session *Session) (int, error) {
	if session.Status != SessionInProgress || !IsHotSeatRound(session.CurrentRound) {
		return -1, nil
	}

	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil {
		return -1, nil
	}

	attempts, err := s.store.AttemptsOn(ctx, question.ID)
	if err != nil {
		return -1, err
	}

	return session.CurrentAnsweringSeat(attempts), nil
}

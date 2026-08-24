package pubquizr

import (
	"context"
	"fmt"
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
	AttemptsOn(ctx context.Context, sessionQuestionID uuid.UUID) (int, error)
	RecordAttempt(ctx context.Context, session *Session, question *SessionQuestion, player *SessionPlayer, attempt *SessionAnswer) error
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

	if len(in.PlayerNames) < MinPlayers {
		problems["playerNames"] = fmt.Sprintf("needs at least %d players", MinPlayers)
	}
	if len(in.PlayerNames) > MaxPlayers {
		problems["playerNames"] = fmt.Sprintf("takes at most %d players", MaxPlayers)
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

	if len(names) < MinPlayers {
		return nil, ErrTooFewPlayers
	}
	if len(names) > MaxPlayers {
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

// dealQuestions works out what this table will actually play.
func dealQuestions(quiz *Quiz, players int) ([]dealtQuestion, error) {
	var deal []dealtQuestion

	add := func(round int, questions []Question, seatFor func(i int) *int) {
		for i, question := range questions {
			deal = append(deal, dealtQuestion{
				round:        round,
				position:     i,
				questionID:   question.ID,
				assignedSeat: seatFor(i),
			})
		}
	}

	unassigned := func(int) *int { return nil }
	// perSeat hands out questions one at a time round the table, so at two each the
	// second lap lands on the same seats in the same order.
	perSeat := func(i int) *int {
		seat := i % players
		return &seat
	}
	// inPairs keeps a player's two words together, which is what round 4 needs:
	// you describe both of yours in the same thirty seconds.
	inPairs := func(i int) *int {
		seat := i / DescribeWordsPerPlayer
		return &seat
	}

	for _, round := range []struct {
		number  int
		want    int // 0 means "all of them"
		seatFor func(int) *int
	}{
		{RoundOpen, 0, unassigned},
		{RoundChoice, ChoiceQuestionsFor(players), perSeat},
		{RoundClosest, 0, unassigned},
		{RoundDescribe, DescribeWordsFor(players), inPairs},
		{RoundList, 0, unassigned},
		// The finalists are not known until the other five rounds are done, so the
		// finale is dealt to the table and assigned to nobody.
		{RoundFinale, 0, unassigned},
	} {
		available := quiz.QuestionsIn(round.number)

		if minimum := MinQuestionsIn(round.number); len(available) < minimum {
			return nil, fmt.Errorf("%w: round %d has %d questions, needs %d",
				ErrQuizTooSmall, round.number, len(available), minimum)
		}
		if round.want > 0 {
			if len(available) < round.want {
				return nil, fmt.Errorf("%w: round %d has %d questions, %d players need %d",
					ErrQuizTooSmall, round.number, len(available), players, round.want)
			}
			available = available[:round.want]
		}

		add(round.number, available, round.seatFor)
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

// RecordOpenVerdict scores one go at a round 1 question and moves the game on.
//
// Three things can happen. A correct answer ends the question and keeps the seat: the
// next question is asked to whoever just took this one, and the reading comes round
// with them, because a question is always read by the seat on the answerer's right.
// It is worth a point only on every second question -- see OpenPointsAt -- so most of
// them buy nothing but the seat they keep you in. A wrong answer with somebody left to
// ask passes it along and changes nothing else. A wrong answer with nobody left ends
// the question for no points and moves the whole thing one seat on.
func (s *Service) RecordOpenVerdict(ctx context.Context, in VerdictInput) (*Session, error) {
	session, err := s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundOpen {
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

	// Only set on the rows that actually changed. `RecordAttempt` writes what it is
	// given and leaves the rest alone, so a wrong answer mid-question is one insert.
	var scored *SessionPlayer
	var closed *SessionQuestion

	switch {
	case in.Correct:
		// Most round 1 questions are worth nothing. Left as a zero rather than
		// skipped so the attempt row still says what it was worth at the time, which
		// is what the table will want when it argues about the score later.
		points := OpenPointsAt(question.Position)
		attempt.Points = points

		if points > 0 {
			player.Score += points
			scored = player
		}

		question.Status = QuestionDone
		question.Points = points
		closed = question

		// They keep it, and the reading comes round to their own neighbour. Taking a
		// question is what buys you the next one, and the next one is read by the seat
		// on your right -- so a player taking a question from three seats down the
		// table takes the reading with them. Leaving the reading where it was is what
		// used to strand it on whoever opened the round while somebody else was being
		// asked everything.
		if seat == hot {
			session.HotSeatRun++
		} else {
			// They have taken it off whoever was holding the seat, so the run they are
			// starting is their own and one question long.
			session.HotSeatRun = 1
		}

		session.OpenOn(seat)
		s.advance(session)

	case AnsweringSeat(session.QuizMasterSeat, hot, attempts+1, len(session.Players)) < 0:
		// Wrong, and that was the last seat with a go left. Nobody earned the seat, so
		// it simply shuffles one along from where this question opened -- and the
		// reading follows it, the way it always does.
		question.Status = QuestionDone
		closed = question

		session.HotSeatRun = 0
		session.OpenOn(hot + 1)
		s.advance(session)

	default:
		// Wrong, but the question is still alive: it simply passes along. Nothing
		// about the session moves -- the next answering seat falls out of the extra
		// attempt row this writes.
	}

	session.UpdatedAt = time.Now().UTC()

	if err := s.store.RecordAttempt(ctx, session, closed, scored, attempt); err != nil {
		return nil, err
	}

	// Read back rather than returned from memory: the caller is about to draw a
	// screen off this, and the row the database now holds is the one that matters.
	return s.SessionForOwner(ctx, in.SessionID, in.OwnerID)
}

// advance moves the session on to the next slot, and off the end of the round when
// there is no next slot.
//
// Rounds past the first are not playable yet, so the session stops at the top of
// round 2 rather than being marked complete -- there is more of this evening to
// play, and saying otherwise would take the game off the reconnect list.
func (s *Service) advance(session *Session) {
	session.CurrentPosition++

	if session.CurrentPosition < session.QuestionsInRound(session.CurrentRound) {
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
	// place a score decides anything about the order. The finale is left alone: it is
	// only the top two, and who starts it is that round's own business rather than
	// this one's.
	if session.CurrentRound != RoundFinale {
		session.OpenOn(session.LowestScoringSeat())
	}
}

// AnsweringSeatFor is whose turn it is to answer in this session right now, or -1
// when nobody is being asked anything.
//
// On the service rather than on Session because it needs the attempt count, and
// counting rows is the store's job. Everything it does with that count is the
// arithmetic in round_one.go.
func (s *Service) AnsweringSeatFor(ctx context.Context, session *Session) (int, error) {
	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if session.Status != SessionInProgress || session.CurrentRound != RoundOpen || question == nil {
		return -1, nil
	}

	attempts, err := s.store.AttemptsOn(ctx, question.ID)
	if err != nil {
		return -1, err
	}

	return session.CurrentAnsweringSeat(attempts), nil
}

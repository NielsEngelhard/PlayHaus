package pubquizr

import (
	"context"
	"fmt"
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

// Quiz is one quiz, whole: every round, every question, and the answers.
//
// The answers come too. This is the quiz master's own phone -- they are about to
// read the answers out loud -- and sending them once means the evening survives the
// pub's wifi.
func (s *Service) Quiz(ctx context.Context, id uuid.UUID) (*Quiz, error) {
	quiz, err := s.store.QuizByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if quiz.Status != QuizPublished {
		// A draft is not a quiz anybody may play, and saying so would be telling
		// people what is coming on Wednesday.
		return nil, ErrQuizNotFound
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
		// Player 1 opens as quiz master and asks player 2. From there the role
		// follows whoever just answered, so the person to your right always asks
		// you.
		QuizMasterSeat: 0,

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

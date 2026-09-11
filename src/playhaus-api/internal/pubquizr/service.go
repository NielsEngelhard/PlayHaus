package pubquizr

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"math/rand/v2"
	"sort"
	"strings"
	"time"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/user"

	"github.com/google/uuid"
)

// LobbySetup is what the host of a multi device room decides before the quiz starts.
type LobbySetup struct {
	QuizID     *uuid.UUID
	Locale     i18n.Locale
	ZenMode    bool
	TriviaMode bool
}

type Store interface {
	QuizByID(ctx context.Context, id uuid.UUID) (*Quiz, error)
	QuizBySlug(ctx context.Context, slug string, locale i18n.Locale) (*Quiz, error)
	ListQuizzes(ctx context.Context, f QuizFilter) ([]*Quiz, int64, error)
	QuestionCounts(ctx context.Context, quizIDs []uuid.UUID) (map[uuid.UUID]int, error)
	ReplaceQuiz(ctx context.Context, quiz *Quiz) error

	RecordQuizPlay(ctx context.Context, play *QuizPlay) error
	PlayedQuizIDs(ctx context.Context, ownerID string, quizIDs []uuid.UUID) (map[uuid.UUID]bool, error)

	CreateLobby(ctx context.Context, lobby *PQLobby) error
	LobbyByCode(ctx context.Context, code string) (*PQLobby, error)
	LobbyCodeTaken(ctx context.Context, code string) (bool, error)
	WaitingLobbyByOwnerID(ctx context.Context, userID string) (*PQLobby, error)
	AddLobbyPlayer(ctx context.Context, player *PQLobbyPlayer) error
	RemoveLobbyPlayer(ctx context.Context, code, userID string) error
	SaveLobbySetup(ctx context.Context, code string, in LobbySetup) error
	DeleteLobby(ctx context.Context, code string) error
	DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error)
	// StartLobby deals the evening the room gathered for, and marks the room spent, together.
	StartLobby(ctx context.Context, lobby *PQLobby, session *Session, plays []*QuizPlay) error

	CreateSession(ctx context.Context, session *Session) error
	SessionByID(ctx context.Context, id uuid.UUID) (*Session, error)
	SessionsInProgressByUserID(ctx context.Context, userID string) ([]*Session, error)
	// SessionsInProgressByPlayerID is the same question asked of a seat rather than an owner, which is how a guest player gets their room back.
	SessionsInProgressByPlayerID(ctx context.Context, userID string) ([]*Session, error)
	CurrentSessionByOwnerID(ctx context.Context, ownerID string) (*Session, error)
	DeleteSessionByID(ctx context.Context, sessionID uuid.UUID, ownerID string) error
	DeleteSessionsByOwnerID(ctx context.Context, ownerID string, except uuid.UUID) error
	DeleteSessionsOlderThan(ctx context.Context, before time.Time) (int64, error)
	// AttemptsOn counts answer rows, which is a count of seats that have had a go only in the hot seat rounds.
	AttemptsOn(ctx context.Context, sessionQuestionID uuid.UUID) (int, error)
	// SaveGuess keeps one seat's number until the quizmaster closes the question, and a seat may change its mind.
	SaveGuess(ctx context.Context, guess *SessionGuess) error
	GuessesOn(ctx context.Context, sessionQuestionID uuid.UUID) ([]SessionGuess, error)
	// ActivateQuestion pins the question a round 6 player asked for, and is false when somebody else got there first.
	ActivateQuestion(ctx context.Context, sessionID, questionID uuid.UUID) (bool, error)
	// AbandonSession closes an evening nobody is coming back to, without throwing it away.
	AbandonSession(ctx context.Context, sessionID uuid.UUID) error
	RecordTurn(ctx context.Context, session *Session, out TurnOutcome) error
}

// Pagination defaults for the quiz shelf.
const (
	DefaultPageSize = 20
	MaxPageSize     = 50
)

// QuizFilter is one page of the shelf.
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
	Played   map[uuid.UUID]bool
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

// SweepStaleSessions deletes sessions older than maxAge on a ticker until ctx is cancelled.
func (s *Service) SweepStaleSessions(ctx context.Context, maxAge, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			deleted, err := s.store.DeleteSessionsOlderThan(ctx, time.Now().UTC().Add(-maxAge))
			if err != nil {
				log.Error("sweep stale pubquizr sessions", "err", err)
				continue
			}
			if deleted > 0 {
				log.Info("swept stale pubquizr sessions", "deleted", deleted)
			}
		}
	}
}

func (s *Service) Quiz(ctx context.Context, id uuid.UUID) (*Quiz, error) {
	quiz, err := s.store.QuizByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return quiz, nil
}

func (s *Service) ListQuizzes(ctx context.Context, ownerID string, f QuizFilter) (*QuizPage, error) {
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

	played, err := s.store.PlayedQuizIDs(ctx, ownerID, ids)
	if err != nil {
		return nil, err
	}

	return &QuizPage{
		Quizzes:  quizzes,
		Counts:   counts,
		Played:   played,
		Page:     f.Page,
		PageSize: f.PageSize,
		Total:    total,
	}, nil
}

// HasPlayed is whether this host has already had this one quiz out of the box.
func (s *Service) HasPlayed(ctx context.Context, ownerID string, quizID uuid.UUID) (bool, error) {
	played, err := s.store.PlayedQuizIDs(ctx, ownerID, []uuid.UUID{quizID})
	if err != nil {
		return false, err
	}

	return played[quizID], nil
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

// sessionForActor is a session somebody may write to: their own phone when ownerID is given, else a seat at the table.
func (s *Service) sessionForActor(ctx context.Context, id uuid.UUID, ownerID, actorID string) (*Session, error) {
	if ownerID != "" {
		return s.SessionForOwner(ctx, id, ownerID)
	}

	session, err := s.store.SessionByID(ctx, id)
	if err != nil {
		return nil, err
	}
	// Only that they are at the table at all -- which seat may settle which turn is the round's own business.
	if session.SeatFor(actorID) < 0 {
		return nil, ErrNotAtThisTable
	}

	return session, nil
}

// SessionsInProgress is every unfinished evening this player could walk back into, whether they are hosting it or only sitting at it.
func (s *Service) SessionsInProgress(ctx context.Context, userID string) ([]*Session, error) {
	if userID == "" {
		return nil, nil
	}

	owned, err := s.store.SessionsInProgressByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	seated, err := s.store.SessionsInProgressByPlayerID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// A host is also a player, so the two overlap on every room this player opened themselves.
	seen := make(map[uuid.UUID]bool, len(owned))
	sessions := make([]*Session, 0, len(owned)+len(seated))

	for _, group := range [][]*Session{owned, seated} {
		for _, session := range group {
			if seen[session.ID] {
				continue
			}

			seen[session.ID] = true
			sessions = append(sessions, session)
		}
	}

	return sessions, nil
}

// CurrentSession is the unfinished evening this player owns, or ErrSessionNotFound when there is none.
func (s *Service) CurrentSession(ctx context.Context, ownerID string) (*Session, error) {
	if ownerID == "" {
		return nil, ErrSessionNotFound
	}
	return s.store.CurrentSessionByOwnerID(ctx, ownerID)
}

// DeleteSession throws one evening away, for good.
func (s *Service) DeleteSession(ctx context.Context, sessionID uuid.UUID, ownerID string) error {
	if ownerID == "" {
		return fmt.Errorf("delete session: %w: missing owner", ErrInvalidInput)
	}
	return s.store.DeleteSessionByID(ctx, sessionID, ownerID)
}

type StartSingleDeviceInput struct {
	QuizID  uuid.UUID
	OwnerID string
	// PlayerNames are in seating order, left to right.
	PlayerNames []string
	// Modes are the setup form's toggles.
	Modes Modes
}

func (in StartSingleDeviceInput) validate() map[string]string {
	problems := map[string]string{}

	if !PlayerCountOK(len(in.PlayerNames)) {
		// Two messages off the one rule: which side of it you fell off is the only part the person setting up the quiz can do anything about.
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

	deal, err := dealQuestions(quiz, len(names), in.Modes)
	if err != nil {
		return nil, nil, err
	}

	now := time.Now().UTC()
	roster := make([]seatedPlayer, len(names))
	for seat, name := range names {
		roster[seat] = seatedPlayer{Name: name}
	}

	session := buildSession(quiz, roster, in.Modes, ModeSingleDevice, in.OwnerID, nil, deal, now)

	if err := s.store.CreateSession(ctx, session); err != nil {
		return nil, nil, err
	}

	if err := s.store.RecordQuizPlay(ctx, &QuizPlay{
		OwnerID:  in.OwnerID,
		QuizID:   quiz.ID,
		PlayedAt: now,
	}); err != nil {
		return nil, nil, fmt.Errorf("record quiz play: %w", err)
	}

	// A table plays one evening at a time: this one replaces whatever was still open, however far into it the last lot got.
	if err := s.store.DeleteSessionsByOwnerID(ctx, in.OwnerID, session.ID); err != nil {
		return nil, nil, fmt.Errorf("delete previous sessions: %w", err)
	}

	return session, nil, nil
}

// seatedPlayer is one chair at a table being laid: a name, and the account holding it in multi device.
type seatedPlayer struct {
	Name   string
	UserID *string
}

// buildSession lays an evening out in memory, and is the half of starting a quiz that both modes share.
func buildSession(quiz *Quiz, roster []seatedPlayer, modes Modes, mode Mode, ownerID string, lobbyID *string, deal []dealtQuestion, now time.Time) *Session {
	// Round 1 opens on a seat drawn out of the hat.
	opening := rand.IntN(len(roster))

	session := &Session{
		ID:      uuid.New(),
		QuizID:  quiz.ID,
		OwnerID: ownerID,
		LobbyID: lobbyID,
		Mode:    mode,
		Locale:  quiz.Locale,
		Status:  SessionInProgress,

		CurrentRound:    RoundOpen,
		CurrentPosition: 0,
		QuizMasterSeat:  ReaderFor(opening, len(roster)),
		HotSeat:         opening,
		// No finale yet, and none of it decided until the other five rounds are played.
		FinalistSeatA: -1,
		FinalistSeatB: -1,

		ZenMode:    modes.Zen,
		TriviaMode: modes.Trivia,

		CreatedAt: now,
		UpdatedAt: now,
	}

	session.Players = make([]SessionPlayer, len(roster))
	for seat, player := range roster {
		session.Players[seat] = SessionPlayer{
			SessionID: session.ID,
			Seat:      seat,
			Name:      player.Name,
			UserID:    player.UserID,
			Score:     0,
			// The palette repeats past six, which only happens at a table of seven or eight.
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

	return session
}

// seatNames trims the roster and refuses a table where two people would answer to the same thing.
func seatNames(raw []string) ([]string, error) {
	names := make([]string, 0, len(raw))
	seen := make(map[string]struct{}, len(raw))

	for _, name := range raw {
		trimmed := strings.TrimSpace(name)
		// Case-insensitively: "Niels" and "niels" are one person as far as a room shouting answers is concerned.
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
type roundDeal struct {
	number int
	// want is how much of what the quiz holds this table plays.
	want func(available int) int
	// seatFor is whose question each slot is, built once the size of the deal is known.
	seatFor func(carried, dealt int) func(i int) *int
}

// dealQuestions works out what this table will actually play.
func dealQuestions(quiz *Quiz, players int, modes Modes) ([]dealtQuestion, error) {
	var deal []dealtQuestion

	// all is a round that plays everything the quiz carries for it.
	all := func(available int) int { return available }
	// toTheTable is a round whose questions belong to nobody in particular.
	toTheTable := func(int, int) func(int) *int { return func(int) *int { return nil } }
	// inTurns keeps a player's words together, which is what round 4 needs.
	inTurns := func(carried, _ int) func(int) *int {
		per := DescribeWordsPerPlayer(players, carried)
		if per <= 0 {
			// Only reachable with nobody at the table, which deals no words at all.
			return func(int) *int { return nil }
		}
		return func(i int) *int {
			seat := i / per
			return &seat
		}
	}

	// The running order of an evening.
	for _, round := range []roundDeal{
		{RoundOpen, all, toTheTable},
		// Rounds 2 and 5 both walk the reading round the table one seat per question, so both are dealt whole laps.
		{RoundChoice, func(a int) int { return WholeCyclesOf(players, a) }, toTheTable},
		// Round 3 rotates the same way but plays a single lap: one question each, and four at the table of two whose reader guesses too.
		{RoundClosest, func(int) int { return ClosestTurnsFor(players) }, toTheTable},
		{RoundDescribe, func(a int) int { return DescribeWordsFor(players, a) }, inTurns},
		{RoundList, func(a int) int { return WholeCyclesOf(players, a) }, toTheTable},
		// Round 6 deals its whole pool however many are playing: the questions nobody gets round to are the choice.
		{RoundDoubleDown, all, toTheTable},
		// The finalists are not known until the other six rounds are done.
		{RoundFinale, all, toTheTable},
	} {
		if !PlaysRound(modes, round.number) {
			continue
		}

		available := quiz.QuestionsIn(round.number)
		// Held on to, because available is about to be cut down to what this table plays and one of the rules is about the whole pool.
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

// TurnInput is the quizmaster's ruling on a whole hot seat turn.
type TurnInput struct {
	SessionID uuid.UUID
	OwnerID   string
	// ActorID is whose phone posted this, and is what multi device authorises the settle against.
	ActorID string
	// SessionQuestionID is the question the turn was settled for.
	SessionQuestionID uuid.UUID
	// MissedSeats are the seats that were asked and did not get it, in the order the question reached them.
	MissedSeats []int
	// CorrectSeat is whoever took it in the end, or nil for a question that went all the way round and beat everybody.
	CorrectSeat *int
	// Said is what the player actually answered, if the quizmaster typed it in.
	Said string
	// ChosenAnswerID is the ABCD option round 2 landed on, which is the one verdict the server can check for itself.
	ChosenAnswerID *uuid.UUID
}

// checkAgainstLine is the whole of what stops a settled turn naming whoever it likes. line is what the server worked out for itself.
func checkAgainstLine(line, missed []int, correct *int) error {
	if len(missed) > len(line) {
		return ErrStaleTurn
	}

	for i, seat := range missed {
		if line[i] != seat {
			return ErrStaleTurn
		}
	}

	if correct == nil {
		// Nobody took it, so every seat with a go left has to have used it.
		if len(missed) != len(line) {
			return ErrStaleTurn
		}

		return nil
	}

	if len(missed) >= len(line) {
		return ErrStaleTurn
	}

	if line[len(missed)] != *correct {
		return ErrStaleTurn
	}

	return nil
}

// settlerSeat is which seat may settle this turn, given what the settle claims.
func settlerSeat(session *Session, in TurnInput) int {
	// Round 2 scores itself, so the phone that ended the walk posts it -- and checkAgainstLine has already proved it cannot lie about its place in the line.
	if session.CurrentRound == RoundChoice {
		if in.CorrectSeat != nil {
			return *in.CorrectSeat
		}
		if len(in.MissedSeats) > 0 {
			return in.MissedSeats[len(in.MissedSeats)-1]
		}
	}

	// Everywhere else an open answer is judged by a human, and that human is whoever is reading the question out.
	return session.QuizMasterSeat
}

// requireSeat is the whole of a phone-per-player table's authorisation, and the only thing single device does not pay for.
func (s *Service) requireSeat(session *Session, actorID string, seat int) error {
	// A shared phone holds every seat and none of them are anybody's, so there is nothing to authorise against -- SessionForOwner has already said whose phone it is.
	if !session.Seated() {
		return nil
	}

	at := session.SeatFor(actorID)
	if at < 0 {
		return ErrNotAtThisTable
	}
	if at != seat {
		return ErrNotYourSeat
	}

	return nil
}

// requireSettler is requireSeat for the four rounds whose turn is settled by walking the table.
func (s *Service) requireSettler(session *Session, actorID string, in TurnInput) error {
	return s.requireSeat(session, actorID, settlerSeat(session, in))
}

// RecordHotSeatTurn scores one whole round 1 or round 2 question and moves the game on.
func (s *Service) RecordHotSeatTurn(ctx context.Context, in TurnInput) (*Session, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
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

	line := PassLine(session.QuizMasterSeat, hot, attempts, len(session.Players))
	if len(line) == 0 {
		// The question has already been round the whole table.
		return nil, ErrStaleTurn
	}
	if err := checkAgainstLine(line, in.MissedSeats, in.CorrectSeat); err != nil {
		return nil, err
	}
	if err := s.requireSettler(session, in.ActorID, in); err != nil {
		return nil, err
	}

	// Round 2 scores itself on the answerer's own phone, so the claim gets checked against the quiz. An open answer is judged by a human and never by its stored text.
	if session.CurrentRound == RoundChoice && in.ChosenAnswerID != nil {
		answer, err := s.chosenAnswer(ctx, session, question, *in.ChosenAnswerID)
		if err != nil {
			return nil, err
		}
		if answer.Correct != (in.CorrectSeat != nil) {
			return nil, ErrVerdictDisagrees
		}
	}

	now := time.Now().UTC()
	out := TurnOutcome{}

	// One row per seat that had a go, in the order the question reached them.
	for _, seat := range in.MissedSeats {
		if session.PlayerAt(seat) == nil {
			return nil, fmt.Errorf("record turn: no player in seat %d", seat)
		}

		out.Answers = append(out.Answers, &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &seat,
			Correct:           false,
			CreatedAt:         now,
		})
	}

	if in.CorrectSeat == nil {
		// The question went the whole way round and beat the table.
		question.Status = QuestionDone
		out.Questions = append(out.Questions, question)

		session.HotSeatRun = 0
		if session.CurrentRound == RoundChoice {
			session.OpenOn(hot + 1)
		} else {
			session.OpenOn(session.QuizMasterSeat)
		}
		s.advance(session)
	} else {
		seat := *in.CorrectSeat

		player := session.PlayerAt(seat)
		if player == nil {
			return nil, fmt.Errorf("record turn: no player in seat %d", seat)
		}

		attempt := &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &seat,
			Correct:           true,
			CreatedAt:         now,
		}
		if said := strings.TrimSpace(in.Said); said != "" {
			attempt.Text = &said
		}
		// Which option round 2 landed on, and nil in every round that has none.
		attempt.AnswerID = in.ChosenAnswerID
		out.Answers = append(out.Answers, attempt)

		// Half the round 1 questions are worth nothing.
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
			// Round 2 never lets a correct answer keep the seat.
			session.HotSeatRun = 1
			session.OpenOn(hot + 1)
		} else {
			// They keep it, and the reading comes round to their own neighbour.
			if seat == hot {
				session.HotSeatRun++
			} else {
				// They have taken it off whoever was holding the seat, so the run they are starting is their own and one question long.
				session.HotSeatRun = 1
			}

			session.OpenOn(seat)
		}

		s.advance(session)
	}

	session.UpdatedAt = now

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, err
	}

	// Read back rather than returned from memory.
	return s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
}

// chosenAnswer is the option a round 2 pick landed on, and refuses an id that belongs to some other question.
func (s *Service) chosenAnswer(ctx context.Context, session *Session, question *SessionQuestion, answerID uuid.UUID) (*Answer, error) {
	quiz, err := s.store.QuizByID(ctx, session.QuizID)
	if err != nil {
		return nil, err
	}
	if quiz == nil {
		return nil, fmt.Errorf("chosen answer: %w", ErrQuizNotFound)
	}

	for _, candidate := range quiz.Questions {
		if candidate.ID != question.QuestionID {
			continue
		}
		for _, answer := range candidate.Answers {
			if answer.ID == answerID {
				return &answer, nil
			}
		}
		return nil, ErrVerdictDisagrees
	}

	return nil, fmt.Errorf("chosen answer: %w", ErrQuizNotFound)
}

// ClosestGuessInput is one seat typing their own number in round 3, on their own phone.
type ClosestGuessInput struct {
	SessionID uuid.UUID
	ActorID   string
	// SessionQuestionID is the question the number is for, so a phone left behind cannot answer the one before.
	SessionQuestionID uuid.UUID
	Value             float64
}

// SaveClosestGuess keeps one seat's number until the question is closed, and answers with the seats that are in and never with a number.
func (s *Service) SaveClosestGuess(ctx context.Context, in ClosestGuessInput) (*Session, []int, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, "", in.ActorID)
	if err != nil {
		return nil, nil, err
	}

	if session.Status != SessionInProgress {
		return nil, nil, ErrSessionOver
	}
	if session.CurrentRound != RoundClosest {
		return nil, nil, ErrWrongRound
	}

	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil || question.ID != in.SessionQuestionID {
		return nil, nil, ErrStaleTurn
	}

	// Which also refuses the reader, unless the table is small enough that round 3 lets them guess too.
	seat := session.SeatFor(in.ActorID)
	if err := session.checkGuessingSeats([]int{seat}); err != nil {
		return nil, nil, err
	}
	if math.IsNaN(in.Value) || math.IsInf(in.Value, 0) {
		return nil, nil, fmt.Errorf("closest guess: %w: seat %d guessed something that is not a number",
			ErrInvalidInput, seat)
	}

	err = s.store.SaveGuess(ctx, &SessionGuess{
		SessionQuestionID: question.ID,
		Seat:              seat,
		SessionID:         session.ID,
		Value:             in.Value,
		CreatedAt:         time.Now().UTC(),
	})
	if err != nil {
		return nil, nil, err
	}

	staged, err := s.store.GuessesOn(ctx, question.ID)
	if err != nil {
		return nil, nil, err
	}

	seatsIn := make([]int, 0, len(staged))
	for _, guess := range staged {
		seatsIn = append(seatsIn, guess.Seat)
	}

	return session, seatsIn, nil
}

// ClosestInput is the quizmaster settling one round 3 question.
type ClosestInput struct {
	SessionID uuid.UUID
	OwnerID   string
	ActorID   string
	// SessionQuestionID is the question this settles, named for the same reason a verdict names one.
	SessionQuestionID uuid.UUID

	Guesses      []SeatGuess
	WinningSeats []int
	// Staged scores the numbers the phones sent, with Guesses laid over them seat by seat -- which is the way in multi device settles.
	Staged bool
}

// ClosestSettled is round 3's result the way the room wants to see it, and the only thing the numbers ever travel in.
type ClosestSettled struct {
	SessionQuestionID uuid.UUID
	Guesses           []SeatGuess
	WinningSeats      []int
}

// RecordClosestGuesses settles one round 3 question and moves the game on.
func (s *Service) RecordClosestGuesses(ctx context.Context, in ClosestInput) (*Session, *ClosestSettled, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
	if err != nil {
		return nil, nil, err
	}

	if session.Status != SessionInProgress {
		return nil, nil, ErrSessionOver
	}
	if session.CurrentRound != RoundClosest {
		return nil, nil, ErrWrongRound
	}
	if err := s.requireSeat(session, in.ActorID, session.QuizMasterSeat); err != nil {
		return nil, nil, err
	}

	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil || question.ID != in.SessionQuestionID {
		return nil, nil, ErrStaleTurn
	}

	typed, named := len(in.Guesses) > 0, len(in.WinningSeats) > 0
	switch {
	case in.Staged:
		if named {
			return nil, nil, fmt.Errorf("closest guesses: %w: a staged settle scores numbers, not winners", ErrInvalidInput)
		}
		// A staged settle with nothing staged is a real turn: nobody typed, so the question closes paying nobody.
		if in.Guesses, err = s.stagedGuesses(ctx, question.ID, in.Guesses); err != nil {
			return nil, nil, err
		}
		typed = len(in.Guesses) > 0
	case typed == named:
		return nil, nil, fmt.Errorf("closest guesses: %w: name the guesses or the winners, not both", ErrInvalidInput)
	}

	// Whichever way in, the seats have to be seats at this table, and never the person reading the question out.
	seats := in.WinningSeats
	if typed {
		seats = make([]int, 0, len(in.Guesses))
		for _, guess := range in.Guesses {
			seats = append(seats, guess.Seat)
		}
	}
	if err := session.checkGuessingSeats(seats); err != nil {
		return nil, nil, err
	}

	winners := in.WinningSeats
	if typed {
		for _, guess := range in.Guesses {
			if math.IsNaN(guess.Value) || math.IsInf(guess.Value, 0) {
				return nil, nil, fmt.Errorf("closest guesses: %w: seat %d guessed something that is not a number",
					ErrInvalidInput, guess.Seat)
			}
		}
		if seat := DuplicateGuessSeat(in.Guesses); seat >= 0 {
			return nil, nil, fmt.Errorf("%w: seat %d", ErrDuplicateGuess, seat)
		}

		target, err := s.closestAnswer(ctx, session, question)
		if err != nil {
			return nil, nil, err
		}
		winners = ClosestWinners(target, in.Guesses)
	}

	won := make(map[int]bool, len(winners))
	for _, seat := range winners {
		won[seat] = true
	}

	now := time.Now().UTC()
	out := TurnOutcome{}

	// A row per guess when they were typed in, so the table can argue about the numbers afterwards.
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

	settled := &ClosestSettled{
		SessionQuestionID: question.ID,
		Guesses:           in.Guesses,
		WinningSeats:      winners,
	}

	s.advance(session)
	session.UpdatedAt = now

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, nil, err
	}

	fresh, err := s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
	if err != nil {
		return nil, nil, err
	}

	return fresh, settled, nil
}

// stagedGuesses is the numbers the phones sent, with anything typed in by hand winning its seat -- which is what keeps a dead phone from killing the question.
func (s *Service) stagedGuesses(ctx context.Context, sessionQuestionID uuid.UUID, byHand []SeatGuess) ([]SeatGuess, error) {
	staged, err := s.store.GuessesOn(ctx, sessionQuestionID)
	if err != nil {
		return nil, err
	}

	values := make(map[int]float64, len(staged)+len(byHand))
	seats := make([]int, 0, len(staged)+len(byHand))

	keep := func(seat int, value float64) {
		if _, already := values[seat]; !already {
			seats = append(seats, seat)
		}
		values[seat] = value
	}
	for _, guess := range staged {
		keep(guess.Seat, guess.Value)
	}
	for _, guess := range byHand {
		keep(guess.Seat, guess.Value)
	}
	sort.Ints(seats)

	merged := make([]SeatGuess, 0, len(seats))
	for _, seat := range seats {
		merged = append(merged, SeatGuess{Seat: seat, Value: values[seat]})
	}

	return merged, nil
}

// checkGuessingSeats is the rule both ways into round 3 share.
func (s *Session) checkGuessingSeats(seats []int) error {
	named := make(map[int]struct{}, len(seats))

	for _, seat := range seats {
		if s.PlayerAt(seat) == nil {
			return fmt.Errorf("%w: seat %d", ErrUnknownSeat, seat)
		}
		if seat == s.QuizMasterSeat && !ClosestQuizmasterGuesses(len(s.Players)) {
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

// WordAward is what became of one word inside the thirty seconds.
type WordAward struct {
	SessionQuestionID uuid.UUID
	Seats             []int
}

// DescribeInput is the quizmaster settling one thirty second turn.
type DescribeInput struct {
	SessionID     uuid.UUID
	OwnerID       string
	ActorID       string
	DescriberSeat int
	// Awards must name every word of the turn, once each.
	Awards []WordAward
}

// RecordDescribeAwards scores one round 4 turn and moves the game on.
func (s *Service) RecordDescribeAwards(ctx context.Context, in DescribeInput) (*Session, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundDescribe {
		return nil, ErrWrongRound
	}
	// The turn is named by who is describing rather than by a question, so this is the staleness check.
	if in.DescriberSeat != session.QuizMasterSeat {
		return nil, ErrStaleTurn
	}
	if err := s.requireSeat(session, in.ActorID, in.DescriberSeat); err != nil {
		return nil, err
	}

	words := session.WordsFor(in.DescriberSeat)
	if len(words) == 0 {
		// A describer with no words is a deal this build does not understand.
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
	// Accumulated rather than appended per word.
	raised := map[int]*SessionPlayer{}

	score := func(seat, points int) {
		player := session.PlayerAt(seat)
		player.Score += points
		raised[seat] = player
	}

	for _, word := range words {
		winners := awarded[word.ID]

		if len(winners) == 0 {
			// No seat rows at all: nobody got this one, which is a thing worth writing down rather than a row worth leaving out.
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

		// One row per name.
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

		// And one more row for the describer's own point, earned once per word that landed.
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

	// In seat order, so two runs of the same turn write the same rows in the same order and a failure is the same failure twice.
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

	return s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
}

// bonusLedger is the "one guess each" rule of rounds 4 and 5, kept in one place because both rounds spend it the same way.
type bonusLedger struct {
	guesser int
	spent   map[int]struct{}
}

func newBonusLedger(guesser int) *bonusLedger {
	return &bonusLedger{guesser: guesser, spent: map[int]struct{}{}}
}

// take spends one seat's go, and refuses the second one.
func (l *bonusLedger) take(seat int) error {
	if seat == l.guesser {
		return nil
	}
	if _, twice := l.spent[seat]; twice {
		return fmt.Errorf("%w: seat %d", ErrOneGuessEach, seat)
	}
	l.spent[seat] = struct{}{}

	return nil
}

// matchAwards pairs what the quizmaster said with the words the turn actually holds.
func matchAwards(session *Session, words []*SessionQuestion, in DescribeInput) (map[uuid.UUID][]int, error) {
	thisTurn := make(map[uuid.UUID]struct{}, len(words))
	for _, word := range words {
		thisTurn[word.ID] = struct{}{}
	}

	// Who was being described to. Everybody else is spending a single bonus guess.
	ledger := newBonusLedger(session.TurnGuesser())

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
		if len(award.Seats) > 1 {
			return nil, fmt.Errorf("%w: word %s", ErrTwoOnOneCredit, award.SessionQuestionID)
		}

		seat := award.Seats[0]
		if session.PlayerAt(seat) == nil {
			return nil, fmt.Errorf("%w: seat %d", ErrUnknownSeat, seat)
		}
		if seat == in.DescriberSeat {
			return nil, fmt.Errorf("%w: seat %d", ErrDescriberCannotGuess, seat)
		}
		if err := ledger.take(seat); err != nil {
			return nil, err
		}

		guessed[award.SessionQuestionID] = award.Seats
	}

	if len(named) != len(words) {
		return nil, fmt.Errorf("describe awards: %w: %d words in this turn, %d were ruled on",
			ErrInvalidInput, len(words), len(named))
	}

	return guessed, nil
}

// ListAward is what became of one of round 5's four answers: which of them, and who at the table gets credit for it.
type ListAward struct {
	AnswerID uuid.UUID
	Seats    []int
}

// ListInput is the quizmaster settling one round 5 question, once every answer that was found during the round has been credited to whoever found it.
type ListInput struct {
	SessionID         uuid.UUID
	OwnerID           string
	ActorID           string
	SessionQuestionID uuid.UUID
	// Awards must name every one of the question's four answers, once each.
	Awards []ListAward
}

// RecordListAward scores one round 5 question and moves the game on.
func (s *Service) RecordListAward(ctx context.Context, in ListInput) (*Session, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundList {
		return nil, ErrWrongRound
	}
	if err := s.requireSeat(session, in.ActorID, session.QuizMasterSeat); err != nil {
		return nil, err
	}

	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil || question.ID != in.SessionQuestionID {
		return nil, ErrStaleTurn
	}

	correct, err := s.listAnswers(ctx, session, question)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	out := TurnOutcome{}
	named := make(map[uuid.UUID]struct{}, len(in.Awards))
	raised := map[int]*SessionPlayer{}

	// Who was being asked inside the clock.
	ledger := newBonusLedger(session.TurnGuesser())

	score := func(seat, points int) {
		player := session.PlayerAt(seat)
		player.Score += points
		raised[seat] = player
	}

	total := 0
	for _, awarded := range in.Awards {
		match := false
		for _, answer := range correct {
			if answer.ID == awarded.AnswerID {
				match = true
				break
			}
		}
		if !match {
			return nil, fmt.Errorf("%w: %s", ErrUnknownAnswer, awarded.AnswerID)
		}
		if _, twice := named[awarded.AnswerID]; twice {
			return nil, fmt.Errorf("list awards: %w: answer %s twice", ErrInvalidInput, awarded.AnswerID)
		}
		named[awarded.AnswerID] = struct{}{}

		if len(awarded.Seats) == 0 {
			// Nobody found it: a row worth writing down, the same as a round 4 word nobody guessed.
			answerID := awarded.AnswerID
			out.Answers = append(out.Answers, &SessionAnswer{
				ID: uuid.New(), SessionID: session.ID, SessionQuestionID: question.ID,
				AnswerID: &answerID, Correct: false, CreatedAt: now,
			})
			continue
		}

		if len(awarded.Seats) > 1 {
			return nil, fmt.Errorf("%w: answer %s", ErrTwoOnOneCredit, awarded.AnswerID)
		}

		seat := awarded.Seats[0]
		if session.PlayerAt(seat) == nil {
			return nil, fmt.Errorf("%w: seat %d", ErrUnknownSeat, seat)
		}
		if seat == session.QuizMasterSeat {
			return nil, fmt.Errorf("%w: seat %d", ErrQuizmasterCannotGuess, seat)
		}
		if err := ledger.take(seat); err != nil {
			return nil, err
		}

		answerID := awarded.AnswerID
		out.Answers = append(out.Answers, &SessionAnswer{
			ID: uuid.New(), SessionID: session.ID, SessionQuestionID: question.ID,
			Seat: &seat, AnswerID: &answerID, Correct: true, Points: ListAnswerPoints,
			CreatedAt: now,
		})
		score(seat, ListAnswerPoints)
		total += ListAnswerPoints
	}

	if len(named) != len(correct) {
		return nil, fmt.Errorf("list awards: %w: %d answers to this question, %d were ruled on",
			ErrInvalidInput, len(correct), len(named))
	}

	// In seat order, so two runs of the same turn write the same rows in the same order.
	for _, player := range session.Players {
		if scored, moved := raised[player.Seat]; moved {
			out.Players = append(out.Players, scored)
		}
	}

	question.Status = QuestionDone
	question.Points = total
	out.Questions = append(out.Questions, question)

	// The reading rotates to the next seat inside `advance`, the same as round 3's and round 4's -- see `RotatesEachTurn`.
	s.advance(session)
	session.UpdatedAt = now

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, err
	}

	return s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
}

// listAnswers are the four things round 5's current question is looking for.
func (s *Service) listAnswers(ctx context.Context, session *Session, question *SessionQuestion) ([]Answer, error) {
	quiz, err := s.store.QuizByID(ctx, session.QuizID)
	if err != nil {
		return nil, err
	}
	if quiz == nil {
		return nil, fmt.Errorf("list answers: %w", ErrQuizNotFound)
	}

	for _, candidate := range quiz.Questions {
		if candidate.ID != question.QuestionID {
			continue
		}
		return candidate.CorrectAnswers(), nil
	}

	return nil, fmt.Errorf("list answers: %w", ErrQuizNotFound)
}

// RecordFinaleTurn scores one whole finale question and moves the finale on.
func (s *Service) RecordFinaleTurn(ctx context.Context, in TurnInput) (*Session, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundFinale {
		return nil, ErrWrongRound
	}

	question := session.QuestionAt(session.CurrentRound, session.CurrentPosition)
	if question == nil || question.ID != in.SessionQuestionID {
		return nil, ErrStaleTurn
	}

	attempts, err := s.store.AttemptsOn(ctx, question.ID)
	if err != nil {
		return nil, err
	}

	line := session.FinaleLine(attempts)
	if len(line) == 0 {
		// Both finalists have already had this one, so there is nothing left to rule on.
		return nil, ErrStaleTurn
	}
	if err := checkAgainstLine(line, in.MissedSeats, in.CorrectSeat); err != nil {
		return nil, err
	}
	if err := s.requireSettler(session, in.ActorID, in); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	out := TurnOutcome{}

	for _, seat := range in.MissedSeats {
		if session.PlayerAt(seat) == nil {
			return nil, fmt.Errorf("finale turn: no player in seat %d", seat)
		}

		out.Answers = append(out.Answers, &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &seat,
			Correct:           false,
			CreatedAt:         now,
		})
	}

	points := 0
	if in.CorrectSeat != nil {
		seat := *in.CorrectSeat

		player := session.PlayerAt(seat)
		if player == nil {
			return nil, fmt.Errorf("finale turn: no player in seat %d", seat)
		}

		attempt := &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &seat,
			Correct:           true,
			CreatedAt:         now,
		}
		if said := strings.TrimSpace(in.Said); said != "" {
			attempt.Text = &said
		}

		points = FinalePointsFor(len(session.Players))
		attempt.Points = points
		out.Answers = append(out.Answers, attempt)

		// Onto Score, the one tally the whole evening is kept on.
		player.Score += points
		out.Players = append(out.Players, player)
	}

	question.Status = QuestionDone
	question.Points = points
	out.Questions = append(out.Questions, question)

	// advance opens the next finale question on whichever finalist is behind *now*.
	s.advance(session)
	session.UpdatedAt = now

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, err
	}

	return s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
}

// difficultyOf is which half of round 6's pool a dealt question came out of.
func (s *Service) difficultyOf(ctx context.Context, session *Session, question *SessionQuestion) (Difficulty, error) {
	quiz, err := s.store.QuizByID(ctx, session.QuizID)
	if err != nil {
		return "", err
	}
	if quiz == nil {
		return "", fmt.Errorf("double down difficulty: %w", ErrQuizNotFound)
	}

	for _, candidate := range quiz.Questions {
		if candidate.ID != question.QuestionID {
			continue
		}
		if !candidate.Difficulty.Valid() {
			return "", fmt.Errorf("double down difficulty: %w", ErrStaleTurn)
		}

		return candidate.Difficulty, nil
	}

	return "", fmt.Errorf("double down difficulty: %w", ErrQuizNotFound)
}

// DoubleDownChoiceInput is one player asking for the easy or the hard question, on their own phone.
type DoubleDownChoiceInput struct {
	SessionID uuid.UUID
	ActorID   string
	// SessionQuestionID is the one they picked out of the pool the round has left.
	SessionQuestionID uuid.UUID
}

// ChooseDoubleDown pins the round 6 question a player asked for, so nobody else's phone can settle a different one.
func (s *Service) ChooseDoubleDown(ctx context.Context, in DoubleDownChoiceInput) (*Session, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, "", in.ActorID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundDoubleDown {
		return nil, ErrWrongRound
	}
	if err := s.requireSeat(session, in.ActorID, session.CurrentAnsweringSeat(0)); err != nil {
		return nil, err
	}

	// Asking again would move the goalposts, and the question is already on the screen by then.
	if session.ActiveQuestion(RoundDoubleDown) != nil {
		return nil, ErrStaleTurn
	}

	question := session.PendingQuestion(RoundDoubleDown, in.SessionQuestionID)
	if question == nil {
		return nil, ErrStaleTurn
	}

	pinned, err := s.store.ActivateQuestion(ctx, session.ID, question.ID)
	if err != nil {
		return nil, err
	}
	if !pinned {
		return nil, ErrStaleTurn
	}

	return s.sessionForActor(ctx, in.SessionID, "", in.ActorID)
}

// RecordDoubleDownTurn scores one round 6 question, the one the player asked for, and moves the table on a seat.
func (s *Service) RecordDoubleDownTurn(ctx context.Context, in TurnInput) (*Session, error) {
	session, err := s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
	if err != nil {
		return nil, err
	}

	if session.Status != SessionInProgress {
		return nil, ErrSessionOver
	}
	if session.CurrentRound != RoundDoubleDown {
		return nil, ErrWrongRound
	}

	// A phone per player asks for a difficulty first, and settling before anybody has would score a question nobody chose.
	if session.Seated() && session.ActiveQuestion(RoundDoubleDown) == nil {
		return nil, ErrNoChoiceYet
	}

	// The pool is the whole rule: another round's question, one already scored, or a sixth hard one after the hard five are spent is simply not offered.
	question := session.OfferedQuestion(RoundDoubleDown, in.SessionQuestionID)
	if question == nil {
		return nil, ErrStaleTurn
	}

	difficulty, err := s.difficultyOf(ctx, session, question)
	if err != nil {
		return nil, err
	}

	attempts, err := s.store.AttemptsOn(ctx, question.ID)
	if err != nil {
		return nil, err
	}

	hot := session.HotSeatOrFirst()

	line := PassLine(session.QuizMasterSeat, hot, attempts, len(session.Players))
	if len(line) == 0 {
		return nil, ErrStaleTurn
	}
	if err := checkAgainstLine(line, in.MissedSeats, in.CorrectSeat); err != nil {
		return nil, err
	}
	if err := s.requireSettler(session, in.ActorID, in); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	out := TurnOutcome{}

	for _, seat := range in.MissedSeats {
		if session.PlayerAt(seat) == nil {
			return nil, fmt.Errorf("double down turn: no player in seat %d", seat)
		}

		out.Answers = append(out.Answers, &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &seat,
			Correct:           false,
			CreatedAt:         now,
		})
	}

	points := 0
	if in.CorrectSeat != nil {
		seat := *in.CorrectSeat

		player := session.PlayerAt(seat)
		if player == nil {
			return nil, fmt.Errorf("double down turn: no player in seat %d", seat)
		}

		attempt := &SessionAnswer{
			ID:                uuid.New(),
			SessionID:         session.ID,
			SessionQuestionID: question.ID,
			Seat:              &seat,
			Correct:           true,
			CreatedAt:         now,
		}
		if said := strings.TrimSpace(in.Said); said != "" {
			attempt.Text = &said
		}

		// A passed question keeps the value the player who was asked chose, whoever ends up taking it.
		points = DoubleDownPointsFor(difficulty)
		attempt.Points = points
		out.Answers = append(out.Answers, attempt)

		player.Score += points
		out.Players = append(out.Players, player)
	}

	question.Status = QuestionDone
	question.Points = points
	out.Questions = append(out.Questions, question)

	// Nobody holds the seat here, so there is no seat to set: advance rotates the table one place on its own.
	session.HotSeatRun = 0
	s.advance(session)
	session.UpdatedAt = now

	if err := s.store.RecordTurn(ctx, session, out); err != nil {
		return nil, err
	}

	return s.sessionForActor(ctx, in.SessionID, in.OwnerID, in.ActorID)
}

// advance moves the session on to the next slot, and off the end of the round when there is no next slot.
func (s *Service) advance(session *Session) {
	session.CurrentPosition++

	if session.CurrentPosition < session.TurnsInRound(session.CurrentRound) {
		// The rounds that walk the table a seat at a time do it here.
		if RotatesEachTurn(session.CurrentRound) {
			session.RotateOneSeat()
		}
		// The finale moves on the scoreboard rather than round the table.
		if session.CurrentRound == RoundFinale {
			session.OpenFinaleQuestion()
		}
		return
	}

	next := NextRound(session.Modes(), session.CurrentRound)
	session.CurrentPosition = 0

	if next < 0 {
		session.CurrentRound++
		session.Status = SessionCompleted
		finished := time.Now().UTC()
		session.CompletedAt = &finished
		return
	}

	session.CurrentRound = next

	// A run is a round 1 thing -- it counts questions asked to one seat in a row -- so nothing carries it over a round boundary.
	session.HotSeatRun = 0

	if session.CurrentRound == RoundFinale {
		// The finale picks its own two players off the scoreboard rather than opening on whoever is furthest behind at the whole table.
		session.OpenFinale()
		return
	}

	// Every round but the first opens on whoever is furthest behind.
	session.OpenRoundOn(session.CurrentRound, session.LowestScoringSeat())
}

// AnsweringSeatFor is whose turn it is to answer in this session right now, or -1 when nobody is being asked anything.
func (s *Service) AnsweringSeatFor(ctx context.Context, session *Session) (int, error) {
	if session.Status != SessionInProgress {
		return -1, nil
	}

	if session.CurrentRound == RoundFinale {
		question := session.QuestionAt(RoundFinale, session.CurrentPosition)
		if question == nil {
			return -1, nil
		}

		attempts, err := s.store.AttemptsOn(ctx, question.ID)
		if err != nil {
			return -1, err
		}

		return session.FinaleAnsweringSeat(attempts), nil
	}

	if session.CurrentRound == RoundDoubleDown {
		// Round 6's pass line is walked on the phone and only the finished turn is posted, so there is never a part-asked question to count attempts on.
		return session.CurrentAnsweringSeat(0), nil
	}

	if !IsHotSeatRound(session.CurrentRound) {
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

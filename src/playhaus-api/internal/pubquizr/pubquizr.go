// Package pubquizr is the pub quiz: six rounds and a head-to-head finale, played by three to eight people.
package pubquizr

import (
	"encoding/binary"
	"errors"
	"math/rand/v2"
	"slices"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

// Category is the shelf a quiz sits on.
type Category string

const (
	CategoryWeekly    Category = "weekly"
	CategoryOfficial  Category = "official"
	CategoryCommunity Category = "community"
)

func (c Category) Valid() bool {
	switch c {
	case CategoryWeekly, CategoryOfficial, CategoryCommunity:
		return true
	}
	return false
}

func (c Category) String() string { return string(c) }

// Difficulty is which half of round 6's pool a question belongs to, and so what it pays.
type Difficulty string

const (
	DifficultyEasy Difficulty = "easy"
	DifficultyHard Difficulty = "hard"
)

func (d Difficulty) Valid() bool {
	switch d {
	case DifficultyEasy, DifficultyHard:
		return true
	}
	return false
}

func (d Difficulty) String() string { return string(d) }

// QuestionKind is what a question wants back.
type QuestionKind string

const (
	// KindOpen is a question said out loud and answered out loud. Rounds 1, 6 and the finale.
	KindOpen QuestionKind = "open"
	// KindMultipleChoice carries exactly four options, one of them right. Round 2.
	KindMultipleChoice QuestionKind = "multiple_choice"
	// KindClosest is answered with a number; nearest wins. Round 3.
	KindClosest QuestionKind = "closest"
	// KindDescribe has no answer at all -- the Prompt is itself the word to describe.
	KindDescribe QuestionKind = "describe"
	// KindList is one question with four answers to find between you. Round 5.
	KindList QuestionKind = "list"
)

type SessionStatus string

const (
	SessionInProgress SessionStatus = "in_progress"
	SessionCompleted  SessionStatus = "completed"
	SessionAbandoned  SessionStatus = "abandoned"
)

// Mode is how the table is playing.
type Mode string

const (
	ModeSingleDevice Mode = "single_device"
	ModeMultiDevice  Mode = "multi_device"
)

// LobbyStatus is the same two-state life the other multi device rooms have: open, then spent.
type LobbyStatus string

const (
	LobbyWaiting LobbyStatus = "waiting"
	LobbyStarted LobbyStatus = "started"
)

// SessionQuestionStatus tracks a dealt question through one evening.
type SessionQuestionStatus string

const (
	QuestionPending SessionQuestionStatus = "pending"
	QuestionActive  SessionQuestionStatus = "active"
	QuestionDone    SessionQuestionStatus = "done"
)

var (
	ErrQuizNotFound        = errors.New("quiz not found")
	ErrSessionNotFound     = errors.New("session not found")
	ErrInvalidInput        = errors.New("invalid input")
	ErrTooFewPlayers       = errors.New("not enough players")
	ErrTooManyPlayers      = errors.New("too many players")
	ErrDuplicatePlayerName = errors.New("two players share a name")
	ErrQuizTooSmall        = errors.New("quiz does not have enough questions for this many players")
	ErrSessionOver         = errors.New("session is not in progress")
	ErrWrongRound          = errors.New("that round is not playable yet")
	ErrStaleTurn           = errors.New("that question is no longer the current one")

	ErrUnknownSeat           = errors.New("that seat is not at this table")
	ErrDuplicateGuess        = errors.New("two players guessed the same number")
	ErrQuizmasterCannotGuess = errors.New("the quizmaster is reading this one out")
	ErrDescriberCannotGuess  = errors.New("you cannot guess your own word")
	// ErrOneGuessEach is the bonus rule of rounds 4 and 5 refusing a second helping to the same player.
	ErrOneGuessEach = errors.New("that player has already had their guess")
	// ErrTwoOnOneCredit is a word or an answer credited to more than one player.
	ErrTwoOnOneCredit = errors.New("only one player can be credited with that")
	ErrUnknownWord    = errors.New("that word is not part of this turn")
	ErrUnknownAnswer  = errors.New("that answer is not part of this question")

	ErrLobbyNotFound  = errors.New("lobby not found")
	ErrLobbyFull      = errors.New("lobby is full")
	ErrLobbyStarted   = errors.New("lobby has already started")
	ErrNotHost        = errors.New("only the host may do that")
	ErrNotAtThisTable = errors.New("you are not sitting at this table")
	ErrNotYourSeat    = errors.New("that is not your seat to answer for")
	// ErrVerdictDisagrees is round 2 self-scoring a pick the quiz does not agree with.
	ErrVerdictDisagrees = errors.New("that option is not what the verdict claims")
	// ErrNoChoiceYet is round 6 being settled before the player has asked for easy or hard.
	ErrNoChoiceYet = errors.New("nobody has picked easy or hard yet")
)

type Quiz struct {
	ID          uuid.UUID   `gorm:"primaryKey;type:text"`
	Slug        string      `gorm:"not null;uniqueIndex:idx_pq_quiz_slug,priority:2;index:idx_pq_quiz_shelf,priority:3"`
	Locale      i18n.Locale `gorm:"not null;uniqueIndex:idx_pq_quiz_slug,priority:1;index:idx_pq_quiz_shelf,priority:1"`
	Category    Category    `gorm:"not null;index:idx_pq_quiz_shelf,priority:2"`
	Title       string      `gorm:"not null"`
	Description string      `gorm:"not null"`
	PublishedAt *time.Time
	ContentHash string     `gorm:"not null;default:''"`
	Questions   []Question `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE"`
	CreatedAt   time.Time  `gorm:"not null"`
	UpdatedAt   time.Time  `gorm:"not null"`
}

func (Quiz) TableName() string { return "pq_quizzes" }

// QuestionsIn are this quizzes questions for one round, in the order they were written.
func (q Quiz) QuestionsIn(round int) []Question {
	var found []Question
	for _, question := range q.Questions {
		if question.Round == round {
			found = append(found, question)
		}
	}
	return found
}

type Question struct {
	ID     uuid.UUID `gorm:"primaryKey;type:text"`
	QuizID uuid.UUID `gorm:"not null;type:text;index;uniqueIndex:idx_pq_question_slot,priority:1"`

	Round int          `gorm:"not null;uniqueIndex:idx_pq_question_slot,priority:2"`
	Kind  QuestionKind `gorm:"not null"`
	// Position orders the questions inside their round.
	Position int `gorm:"not null;uniqueIndex:idx_pq_question_slot,priority:3"`

	// Prompt is what the quiz master reads out.
	Prompt string `gorm:"not null"`
	// Category is the free-text label round 1 questions carry ("music", "geography").
	Category *string

	// Difficulty is what a round 6 question is worth, and is empty on every other round.
	Difficulty Difficulty `gorm:"not null;default:''"`

	// NumericAnswer and Unit belong to a closest-guess question and are nil on every other kind.
	NumericAnswer *float64
	Unit          *string

	// Explanation is the aside the quiz master can read after the answer.
	Explanation *string

	Answers []Answer `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE"`
}

func (Question) TableName() string { return "pq_questions" }

// CorrectAnswers are the answers that score, leaving the wrong ABCD options and the spelling variants out.
func (q Question) CorrectAnswers() []Answer {
	var correct []Answer
	for _, answer := range q.Answers {
		if answer.Correct && !answer.Alias {
			correct = append(correct, answer)
		}
	}
	return correct
}

// ShownAnswers are the answers in the order the app lays them out: an ABCD question's options shuffled, so the right one is not wherever the quiz file put it.
func (q Question) ShownAnswers() []Answer {
	answers := slices.Clone(q.Answers)
	if q.Kind != KindMultipleChoice {
		return answers
	}

	slices.SortStableFunc(answers, func(a, b Answer) int { return a.Position - b.Position })

	// Seeded off the question id, so every phone at the table and every reload deal the same letters.
	shuffle := rand.New(rand.NewPCG(binary.BigEndian.Uint64(q.ID[:8]), binary.BigEndian.Uint64(q.ID[8:])))
	shuffle.Shuffle(len(answers), func(i, j int) { answers[i], answers[j] = answers[j], answers[i] })

	for i := range answers {
		answers[i].Position = i
	}

	return answers
}

// Answer is one row under a question.
type Answer struct {
	ID         uuid.UUID `gorm:"primaryKey;type:text"`
	QuestionID uuid.UUID `gorm:"not null;type:text;index"`

	Position int    `gorm:"not null"` // 0..3 is A..D on a multiple choice question
	Text     string `gorm:"not null"`
	Correct  bool   `gorm:"not null;default:false"`
	// Alias is an accepted alternative wording rather than an answer of its own.
	Alias bool `gorm:"not null;default:false"`
}

func (Answer) TableName() string { return "pq_answers" }

// --- multi device lobby --------------------------------------------------

// PQLobby is where a table gathers before the quiz starts, keyed by its own join code.
type PQLobby struct {
	ID      string      `gorm:"primaryKey;type:text"`
	OwnerID string      `gorm:"type:text;index;not null"`
	Locale  i18n.Locale `gorm:"type:text;not null"`
	Status  LobbyStatus `gorm:"type:text;not null"`

	// QuizID is what the host has picked so far, and is nil until they have.
	QuizID *uuid.UUID `gorm:"type:text;index"`
	// ZenMode and TriviaMode wait here until the deal freezes them onto the session.
	ZenMode    bool `gorm:"not null;default:false"`
	TriviaMode bool `gorm:"not null;default:false"`

	// SessionID is the evening this room dealt, set once and only by the start.
	SessionID *uuid.UUID `gorm:"type:text;index"`

	Players   []PQLobbyPlayer `gorm:"foreignKey:LobbyID;constraint:OnDelete:CASCADE"`
	CreatedAt time.Time       `gorm:"not null"`
}

func (PQLobby) TableName() string { return "pq_lobbies" }

func (l PQLobby) Full() bool { return len(l.Players) >= MaxPlayers }

func (l PQLobby) Has(userID string) bool { return l.SeatOf(userID) >= 0 }

// SeatOf is where somebody is sitting, and -1 for the shared screen and anybody else who is not in the room.
func (l PQLobby) SeatOf(userID string) int {
	for _, player := range l.Players {
		if player.UserID == userID {
			return player.Seat
		}
	}
	return -1
}

// NextSeat is the highest seat in use plus one, not len(Players): a seat somebody left stays empty.
func (l PQLobby) NextSeat() int {
	next := 0
	for _, player := range l.Players {
		if player.Seat >= next {
			next = player.Seat + 1
		}
	}
	return next
}

// PQLobbyPlayer is one phone in the room before the quiz starts.
type PQLobbyPlayer struct {
	LobbyID string `gorm:"primaryKey;type:text"`
	UserID  string `gorm:"primaryKey;type:text;index"`
	Seat    int    `gorm:"not null"`
	// Name is a snapshot taken at join, because the roster a session plays is one too.
	Name     string    `gorm:"not null"`
	JoinedAt time.Time `gorm:"not null"`
}

func (PQLobbyPlayer) TableName() string { return "pq_lobby_players" }

// --- session -------------------------------------------------------------

// Session is one quiz being played by one table.
type Session struct {
	ID      uuid.UUID `gorm:"primaryKey;type:text"`
	QuizID  uuid.UUID `gorm:"not null;type:text;index"`
	OwnerID string    `gorm:"not null;index"` // whose phone this is

	Mode   Mode          `gorm:"not null"`
	Locale i18n.Locale   `gorm:"not null"`
	Status SessionStatus `gorm:"not null"`

	// LobbyID is the join code this table gathered under, and is nil for one phone passed round.
	LobbyID *string `gorm:"type:text;index"`

	CurrentRound    int `gorm:"not null"`
	CurrentPosition int `gorm:"not null"`

	// QuizMasterSeat is who is reading right now.
	QuizMasterSeat int `gorm:"not null"`

	// HotSeat is who the current question is asked to first; -1 is a session dealt before this column existed.
	HotSeat int `gorm:"not null;default:-1"`

	// HotSeatRun is how many questions in a row whoever is in the hot seat has taken.
	HotSeatRun int `gorm:"not null;default:0"`

	// FinalistSeatA and FinalistSeatB are the two players the finale is between, fixed when the finale opens; -1 in both means no pair yet.
	FinalistSeatA int `gorm:"not null;default:-1"`
	FinalistSeatB int `gorm:"not null;default:-1"`

	// ZenMode and TriviaMode are the setup form's two toggles, frozen here at the deal.
	ZenMode    bool `gorm:"not null;default:false"`
	TriviaMode bool `gorm:"not null;default:false"`

	Players   []SessionPlayer   `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`
	Questions []SessionQuestion `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`

	CreatedAt   time.Time `gorm:"not null"`
	UpdatedAt   time.Time `gorm:"not null"`
	CompletedAt *time.Time
}

func (Session) TableName() string { return "pq_sessions" }

// SessionPlayer is somebody sat at the table.
type SessionPlayer struct {
	SessionID uuid.UUID `gorm:"primaryKey;type:text"`
	Seat      int       `gorm:"primaryKey"` // Seat is where they are sitting, left to right, because the phone gets turned round the table
	Name      string    `gorm:"not null"`
	// UserID is whose phone answers for this seat, and is nil for one phone passed round.
	UserID *string `gorm:"type:text;index"`
	// Score is everything this player has taken all evening, the finale included.
	Score     int       `gorm:"not null;default:0"`
	Color     string    `gorm:"not null"`
	CreatedAt time.Time `gorm:"not null"`
}

func (SessionPlayer) TableName() string { return "pq_session_players" }

// SessionQuestion is a question this table will actually play, in the order they will play it.
type SessionQuestion struct {
	ID        uuid.UUID `gorm:"primaryKey;type:text"`
	SessionID uuid.UUID `gorm:"not null;type:text;index;uniqueIndex:idx_pq_session_slot,priority:1"`

	Round    int `gorm:"not null;uniqueIndex:idx_pq_session_slot,priority:2"`
	Position int `gorm:"not null;uniqueIndex:idx_pq_session_slot,priority:3"`

	QuestionID uuid.UUID `gorm:"not null;type:text;index"`

	// AssignedSeat is whose question this is.
	AssignedSeat *int

	Status SessionQuestionStatus `gorm:"not null"`
	Points int                   `gorm:"not null;default:0"`

	CreatedAt time.Time `gorm:"not null"`
}

func (SessionQuestion) TableName() string { return "pq_session_questions" }

// SessionAnswer is one attempt at a dealt question.
type SessionAnswer struct {
	ID                uuid.UUID `gorm:"primaryKey;type:text"`
	SessionID         uuid.UUID `gorm:"not null;type:text;index"`
	SessionQuestionID uuid.UUID `gorm:"not null;type:text;index"`

	// Seat is who answered. Nil means nobody did before the question ran out.
	Seat *int
	// AnswerID is which row they landed on: the ABCD option they picked, or which of round 5's four answers they found.
	AnswerID *uuid.UUID `gorm:"type:text"`
	// NumericValue is a closest-guess guess.
	NumericValue *float64
	// Text is what was actually said, kept so the table can argue about it after.
	Text *string

	Correct bool `gorm:"not null;default:false"`
	Points  int  `gorm:"not null;default:0"`

	CreatedAt time.Time `gorm:"not null"`
}

func (SessionAnswer) TableName() string { return "pq_session_answers" }

// SessionGuess is one seat's number in round 3, held until the quizmaster closes the question.
// The composite key is the rule it exists for: one number per seat, changeable right up to the settle.
type SessionGuess struct {
	SessionQuestionID uuid.UUID `gorm:"primaryKey;type:text"`
	Seat              int       `gorm:"primaryKey"`

	SessionID uuid.UUID `gorm:"not null;type:text;index"`
	Value     float64   `gorm:"not null"`

	CreatedAt time.Time `gorm:"not null"`
}

func (SessionGuess) TableName() string { return "pq_session_guesses" }

type QuizPlay struct {
	OwnerID  string    `gorm:"primaryKey"`           // users.ID -- whose phone this was
	QuizID   uuid.UUID `gorm:"primaryKey;type:text"` // pq_quizzes.ID
	PlayedAt time.Time `gorm:"not null"`
}

func (QuizPlay) TableName() string { return "pq_quiz_plays" }

// Models are the tables this game owns, parents before children so a fresh database can build the foreign keys as it goes.
func Models() []any {
	return []any{
		&Quiz{},
		&Question{},
		&Answer{},
		&PQLobby{},
		&PQLobbyPlayer{},
		&Session{},
		&SessionPlayer{},
		&SessionQuestion{},
		&SessionAnswer{},
		&SessionGuess{},
		&QuizPlay{},
	}
}

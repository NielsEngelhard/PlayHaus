// Package pubquizr is the pub quiz: five rounds and a head-to-head finale, played by three to eight people.
package pubquizr

import (
	"errors"
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

// QuestionKind is what a question wants back.
type QuestionKind string

const (
	// KindOpen is a question said out loud and answered out loud. Rounds 1 and 6.
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

// --- session -------------------------------------------------------------

// Session is one quiz being played by one table.
type Session struct {
	ID      uuid.UUID `gorm:"primaryKey;type:text"`
	QuizID  uuid.UUID `gorm:"not null;type:text;index"`
	OwnerID string    `gorm:"not null;index"` // whose phone this is

	Mode   Mode          `gorm:"not null"`
	Locale i18n.Locale   `gorm:"not null"`
	Status SessionStatus `gorm:"not null"`

	CurrentRound    int `gorm:"not null"`
	CurrentPosition int `gorm:"not null"`

	// QuizMasterSeat is who is reading right now.
	QuizMasterSeat int `gorm:"not null"`

	// HotSeat is who the current question is asked to first; -1 is a session dealt before this column existed.
	HotSeat int `gorm:"not null;default:-1"`

	// HotSeatRun is how many questions in a row whoever is in the hot seat has taken.
	HotSeatRun int `gorm:"not null;default:0"`

	// FinalistSeatA and FinalistSeatB are the two players round 6 is between, fixed when the finale opens; -1 in both means no pair yet.
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
		&Session{},
		&SessionPlayer{},
		&SessionQuestion{},
		&SessionAnswer{},
		&QuizPlay{},
	}
}

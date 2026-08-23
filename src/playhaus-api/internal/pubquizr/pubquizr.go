// Package pubquizr is the pub quiz: five rounds and a head-to-head finale,
// played by three to eight people.
//
// The package keeps two halves apart on purpose. The *content* tables -- quizzes,
// questions, answers -- are authored once and played many times; they are seeded
// from the JSON files in data/ and never change while a game is running. The
// *session* tables are one table of people playing one quiz on one evening, and
// they only ever reference content, never edit it.
package pubquizr

import (
	"errors"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

// Category is the shelf a quiz sits on.
//
// Weekly is the one that lands every Wednesday, Official is the back catalogue by
// subject, and Community is what players write themselves -- the only category the
// seeder never touches.
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

type QuizStatus string

const (
	QuizDraft     QuizStatus = "draft"
	QuizPublished QuizStatus = "published"
)

// QuestionKind is what a question wants back, which is what decides how the screen
// draws it and how the answer rows underneath it are read.
type QuestionKind string

const (
	// KindOpen is a question said out loud and answered out loud. Rounds 1 and 6.
	KindOpen QuestionKind = "open"
	// KindMultipleChoice carries exactly four options, one of them right. Round 2.
	KindMultipleChoice QuestionKind = "multiple_choice"
	// KindClosest is answered with a number; nearest wins. Round 3.
	KindClosest QuestionKind = "closest"
	// KindDescribe has no answer at all -- the Prompt is itself the word to
	// describe. Round 4.
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

// Mode is how the table is playing. Only one exists so far; multi-device is the
// version where everybody holds their own phone, and it will land here beside it.
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
	ErrQuizNotFound    = errors.New("quiz not found")
	ErrSessionNotFound = errors.New("session not found")
	ErrInvalidInput    = errors.New("invalid input")

	ErrTooFewPlayers       = errors.New("not enough players")
	ErrTooManyPlayers      = errors.New("too many players")
	ErrDuplicatePlayerName = errors.New("two players share a name")

	// ErrQuizTooSmall is a quiz that cannot seat the table that asked for it: round 2
	// hands every player their own question and round 4 hands every player two words,
	// so how much content a quiz needs depends on how many of you there are.
	ErrQuizTooSmall = errors.New("quiz does not have enough questions for this many players")
)

// --- content -------------------------------------------------------------

// Quiz is one authored quiz, written for one language.
//
// A quiz belongs to a locale rather than carrying translations: the jokes, the
// wordplay and the words you have to describe do not survive being moved between
// languages, so a Dutch quiz and an English quiz are two quizzes that may happen to
// share a slug.
type Quiz struct {
	ID     uuid.UUID   `gorm:"primaryKey;type:text"`
	Slug   string      `gorm:"not null;uniqueIndex:idx_pq_quiz_slug,priority:2;index:idx_pq_quiz_shelf,priority:3"`
	Locale i18n.Locale `gorm:"not null;uniqueIndex:idx_pq_quiz_slug,priority:1;index:idx_pq_quiz_shelf,priority:1"`

	Category    Category `gorm:"not null;index:idx_pq_quiz_shelf,priority:2"`
	Title       string   `gorm:"not null"`
	Description string   `gorm:"not null"`

	// AuthorID is nil for everything that ships with the app. A community quiz
	// carries the user who wrote it.
	AuthorID *string `gorm:"index"`

	Status      QuizStatus `gorm:"not null"`
	PublishedAt *time.Time
	// WeekOf is the Wednesday a weekly quiz belongs to, and what the weekly shelf
	// sorts by. Nil on every other category.
	WeekOf *time.Time

	// Seeded marks a quiz the loader owns. It is the line between what ships with
	// the app and what players wrote: the seeder replaces its own rows on every
	// change and never looks at anybody elses.
	Seeded bool `gorm:"not null;default:false"`
	// ContentHash is the digest of the file this quiz was loaded from, so a boot
	// that changed nothing rewrites nothing.
	ContentHash string `gorm:"not null;default:''"`

	Questions []Question `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE"`

	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`
}

func (Quiz) TableName() string { return "pq_quizzes" }

// QuestionsIn are this quizzes questions for one round, in the order they were
// written.
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

	// Prompt is what the quiz master reads out. On a describe question it is the
	// word itself -- there is nothing to ask, only something to act out.
	Prompt string `gorm:"not null"`
	// Category is the free-text label round 1 questions carry ("music",
	// "geography"). Round 1 can be about anything, so this is a hint for whoever is
	// reading rather than a taxonomy.
	Category *string

	// NumericAnswer and Unit belong to a closest-guess question and are nil on
	// every other kind.
	NumericAnswer *float64
	Unit          *string

	// Explanation is the aside the quiz master can read after the answer.
	Explanation *string

	Answers []Answer `gorm:"foreignKey:QuestionID;constraint:OnDelete:CASCADE"`
}

func (Question) TableName() string { return "pq_questions" }

// CorrectAnswers are the answers that score, leaving the wrong ABCD options and the
// spelling variants out.
func (q Question) CorrectAnswers() []Answer {
	var correct []Answer
	for _, answer := range q.Answers {
		if answer.Correct && !answer.Alias {
			correct = append(correct, answer)
		}
	}
	return correct
}

// Answer is one row under a question. What it means depends on the kind of question
// it hangs from:
//
//   - open: the answer, plus any number of Alias rows for wordings that also count
//   - multiple_choice: one of the four options, exactly one of them Correct
//   - list: one of the four answers being searched for, all of them Correct
//
// Closest and describe questions have none.
type Answer struct {
	ID         uuid.UUID `gorm:"primaryKey;type:text"`
	QuestionID uuid.UUID `gorm:"not null;type:text;index"`

	Position int    `gorm:"not null"` // 0..3 is A..D on a multiple choice question
	Text     string `gorm:"not null"`
	Correct  bool   `gorm:"not null;default:false"`
	// Alias is an accepted alternative wording rather than an answer of its own. It
	// never appears on screen and never counts twice.
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

	// QuizMasterSeat is who is reading right now. It rotates: the person to your
	// right always asks you, so the seat that just answered reads next.
	QuizMasterSeat int `gorm:"not null"`

	Players   []SessionPlayer   `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`
	Questions []SessionQuestion `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE"`

	CreatedAt   time.Time `gorm:"not null"`
	UpdatedAt   time.Time `gorm:"not null"`
	CompletedAt *time.Time
}

func (Session) TableName() string { return "pq_sessions" }

// SessionPlayer is somebody sat at the table.
//
// Deliberately a name and not a user: six people round one phone should not mean six
// accounts, and the seat -- not the account -- is what the game addresses. Every
// other player in this codebase is a users row; this is the first that is not.
type SessionPlayer struct {
	SessionID uuid.UUID `gorm:"primaryKey;type:text"`
	// Seat is where they are sitting, left to right, because the phone gets turned
	// round the table and the turn order has to match the room.
	Seat int `gorm:"primaryKey"`

	Name  string `gorm:"not null"`
	Score int    `gorm:"not null;default:0"`
	// Color is one of user.Colors, so a seat is drawn with the same six swatches
	// the rest of the app uses.
	Color string `gorm:"not null"`

	CreatedAt time.Time `gorm:"not null"`
}

func (SessionPlayer) TableName() string { return "pq_session_players" }

// SessionQuestion is a question this table will actually play, in the order they
// will play it.
//
// The deal is frozen when the game starts rather than worked out as it goes, the way
// League of Letters writes its words into lol_rounds up front: how many round 2
// questions there are and whose words are whose both depend on how many of you there
// are, and neither should change if somebody reloads the page.
type SessionQuestion struct {
	ID        uuid.UUID `gorm:"primaryKey;type:text"`
	SessionID uuid.UUID `gorm:"not null;type:text;index;uniqueIndex:idx_pq_session_slot,priority:1"`

	Round    int `gorm:"not null;uniqueIndex:idx_pq_session_slot,priority:2"`
	Position int `gorm:"not null;uniqueIndex:idx_pq_session_slot,priority:3"`

	QuestionID uuid.UUID `gorm:"not null;type:text;index"`

	// AssignedSeat is whose question this is. Round 2 hands every player their own
	// ABCD question and round 4 hands every player two words; everywhere else the
	// question belongs to the table and this is nil.
	AssignedSeat *int

	Status SessionQuestionStatus `gorm:"not null"`
	Points int                   `gorm:"not null;default:0"`

	CreatedAt time.Time `gorm:"not null"`
}

func (SessionQuestion) TableName() string { return "pq_session_questions" }

// SessionAnswer is one attempt at a dealt question.
//
// There is no unique constraint on this table on purpose. Round 1 passes the turn
// down the line until somebody gets it, so a question collects a row per seat that
// tried; round 5 lets one seat claim several of the four answers inside their
// twenty-five seconds. A composite unique index would also be false comfort here --
// SQLite counts NULLs as distinct, and half these columns are nullable. The service
// enforces one attempt per seat where that is the rule.
type SessionAnswer struct {
	ID                uuid.UUID `gorm:"primaryKey;type:text"`
	SessionID         uuid.UUID `gorm:"not null;type:text;index"`
	SessionQuestionID uuid.UUID `gorm:"not null;type:text;index"`

	// Seat is who answered. Nil means nobody did before the question ran out.
	Seat *int
	// AnswerID is which row they landed on: the ABCD option they picked, or which
	// of round 5's four answers they found.
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

// Models are the tables this game owns, parents before children so a fresh database
// can build the foreign keys as it goes.
func Models() []any {
	return []any{
		&Quiz{},
		&Question{},
		&Answer{},
		&Session{},
		&SessionPlayer{},
		&SessionQuestion{},
		&SessionAnswer{},
	}
}

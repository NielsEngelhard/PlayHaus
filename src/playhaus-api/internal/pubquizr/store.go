package pubquizr

import (
	"context"
	"errors"
	"fmt"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

// Compile-time check that we satisfy the interface.
var _ Store = (*GormStore)(nil)

// withContent preloads a quiz whole, each level in playing order, so a caller never
// has to sort it back afterwards.
func withContent(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Questions", func(db *gorm.DB) *gorm.DB {
			return db.Order("round ASC, position ASC")
		}).
		Preload("Questions.Answers", func(db *gorm.DB) *gorm.DB {
			return db.Order("position ASC")
		})
}

// withTable preloads a session: who is sitting where, and what they are playing.
func withTable(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Order("seat ASC")
		}).
		Preload("Questions", func(db *gorm.DB) *gorm.DB {
			return db.Order("round ASC, position ASC")
		})
}

func (s *GormStore) QuizByID(ctx context.Context, id uuid.UUID) (*Quiz, error) {
	var quiz Quiz

	err := withContent(s.db.WithContext(ctx)).
		Where("id = ?", id).
		First(&quiz).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrQuizNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select quiz: %w", err)
	}
	return &quiz, nil
}

// QuizBySlug is the seeder's lookup: does this file already have a row.
//
// Find rather than First, because a miss here is the ordinary case on a fresh
// database and First would log every one of them as an error at boot.
func (s *GormStore) QuizBySlug(ctx context.Context, slug string, locale i18n.Locale) (*Quiz, error) {
	var quizzes []Quiz

	err := s.db.WithContext(ctx).
		Where("slug = ? AND locale = ?", slug, locale).
		Limit(1).
		Find(&quizzes).Error
	if err != nil {
		return nil, fmt.Errorf("select quiz by slug: %w", err)
	}
	if len(quizzes) == 0 {
		return nil, ErrQuizNotFound
	}
	return &quizzes[0], nil
}

// ListQuizzes is one page of the shelf, newest first, plus how many there are in
// total so the caller can say whether there is more.
func (s *GormStore) ListQuizzes(ctx context.Context, f QuizFilter) ([]*Quiz, int64, error) {
	// Built once and reused for both the count and the page, so the two can never
	// disagree about what they are counting.
	query := func() *gorm.DB {
		q := s.db.WithContext(ctx).Model(&Quiz{}).
			Where("locale = ?", f.Locale)
		if f.Category != "" {
			q = q.Where("category = ?", f.Category)
		}
		return q
	}

	var total int64
	if err := query().Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count quizzes: %w", err)
	}

	var quizzes []*Quiz
	err := query().
		// A weekly quiz is placed by the Wednesday it belongs to and everything
		// else by when it went up; COALESCE puts both on one ordering so the
		// shelves can also be listed together.
		Order("id DESC"). // a stable tiebreak, so page 2 cannot repeat page 1
		Limit(f.PageSize).
		Offset(f.Offset()).
		Find(&quizzes).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select quizzes: %w", err)
	}

	return quizzes, total, nil
}

// QuestionCounts is how many questions each of the given quizzes has, keyed by quiz
// id. The list endpoint sends summaries rather than content, and this is the one
// number a summary still needs -- asked in a single query rather than by preloading
// every question of every quiz on the page.
func (s *GormStore) QuestionCounts(ctx context.Context, quizIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	counts := make(map[uuid.UUID]int, len(quizIDs))
	if len(quizIDs) == 0 {
		return counts, nil
	}

	var rows []struct {
		QuizID uuid.UUID
		Total  int
	}
	err := s.db.WithContext(ctx).
		Model(&Question{}).
		Select("quiz_id, count(*) as total").
		Where("quiz_id IN ?", quizIDs).
		Group("quiz_id").
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("count questions: %w", err)
	}

	for _, row := range rows {
		counts[row.QuizID] = row.Total
	}
	return counts, nil
}

// ReplaceQuiz writes a seeded quiz and the content under it, replacing whatever was
// there before.
//
// Replace rather than merge: the JSON file is the whole truth about a seeded quiz,
// so a question deleted from the file has to disappear from the database too, and
// working out which rows moved would be a lot of care spent on content nobody has
// played yet.
func (s *GormStore) ReplaceQuiz(ctx context.Context, quiz *Quiz) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existingID uuid.UUID
		err := tx.Model(&Quiz{}).
			Where("slug = ? AND locale = ?", quiz.Slug, quiz.Locale).
			Limit(1).
			Pluck("id", &existingID).Error
		if err != nil {
			return fmt.Errorf("select existing quiz: %w", err)
		}

		if existingID != uuid.Nil {
			// Keep the id: a session already points at it, and a reseed should not
			// break somebody halfway through a game.
			quiz.ID = existingID

			var questionIDs []uuid.UUID
			if err := tx.Model(&Question{}).Where("quiz_id = ?", existingID).Pluck("id", &questionIDs).Error; err != nil {
				return fmt.Errorf("select questions: %w", err)
			}
			// Deepest first, so no row is ever orphaned mid-transaction.
			if len(questionIDs) > 0 {
				if err := tx.Where("question_id IN ?", questionIDs).Delete(&Answer{}).Error; err != nil {
					return fmt.Errorf("delete answers: %w", err)
				}
				if err := tx.Where("id IN ?", questionIDs).Delete(&Question{}).Error; err != nil {
					return fmt.Errorf("delete questions: %w", err)
				}
			}
			if err := tx.Where("id = ?", existingID).Delete(&Quiz{}).Error; err != nil {
				return fmt.Errorf("delete quiz: %w", err)
			}
		}

		// Creates the questions and their answers too, through the associations.
		if err := tx.Create(quiz).Error; err != nil {
			return fmt.Errorf("insert quiz: %w", err)
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("replace quiz %s/%s: %w", quiz.Locale, quiz.Slug, err)
	}
	return nil
}

// CreateSession writes a session, its table and its dealt questions in one go.
func (s *GormStore) CreateSession(ctx context.Context, session *Session) error {
	// Create takes the players and questions with it, through the associations.
	if err := s.db.WithContext(ctx).Create(session).Error; err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

func (s *GormStore) SessionByID(ctx context.Context, id uuid.UUID) (*Session, error) {
	var session Session

	err := withTable(s.db.WithContext(ctx)).
		Where("id = ?", id).
		First(&session).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select session: %w", err)
	}
	return &session, nil
}

// SessionsInProgressByUserID are the games this player could still walk back into.
func (s *GormStore) SessionsInProgressByUserID(ctx context.Context, userID string) ([]*Session, error) {
	var sessions []*Session

	err := s.db.WithContext(ctx).
		Where("owner_id = ? AND status = ?", userID, SessionInProgress).
		Order("created_at DESC").
		Find(&sessions).Error
	if err != nil {
		return nil, fmt.Errorf("select sessions in progress: %w", err)
	}

	return sessions, nil
}

// AttemptsOn is how many seats have already had a go at one dealt question.
//
// Counted rather than stored on the question, because the rows are already there:
// round 1 writes one per seat that tried, which is exactly what "how far down the
// line has this passed" means. See the note on SessionAnswer.
func (s *GormStore) AttemptsOn(ctx context.Context, sessionQuestionID uuid.UUID) (int, error) {
	var count int64

	err := s.db.WithContext(ctx).
		Model(&SessionAnswer{}).
		Where("session_question_id = ?", sessionQuestionID).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("count attempts: %w", err)
	}

	return int(count), nil
}

// RecordAttempt writes one go at a question and whatever it changed, together.
//
// One transaction because the four writes are one fact. A score raised without the
// answer row beside it would be a point nobody can account for, and a question moved
// on without the session's position following it would leave the table reading a
// question the session no longer thinks it is on.
//
// player and question may be nil -- a wrong answer that still leaves the question
// open changes neither.
func (s *GormStore) RecordAttempt(
	ctx context.Context,
	session *Session,
	question *SessionQuestion,
	player *SessionPlayer,
	attempt *SessionAnswer,
) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(attempt).Error; err != nil {
			return fmt.Errorf("insert attempt: %w", err)
		}

		if question != nil {
			err := tx.Model(&SessionQuestion{}).
				Where("id = ?", question.ID).
				Updates(map[string]any{"status": question.Status, "points": question.Points}).Error
			if err != nil {
				return fmt.Errorf("update question: %w", err)
			}
		}

		if player != nil {
			err := tx.Model(&SessionPlayer{}).
				Where("session_id = ? AND seat = ?", session.ID, player.Seat).
				Update("score", player.Score).Error
			if err != nil {
				return fmt.Errorf("update score: %w", err)
			}
		}

		err := tx.Model(&Session{}).
			Where("id = ?", session.ID).
			Updates(map[string]any{
				"current_round":    session.CurrentRound,
				"current_position": session.CurrentPosition,
				"quiz_master_seat": session.QuizMasterSeat,
				"status":           session.Status,
				"completed_at":     session.CompletedAt,
				"updated_at":       session.UpdatedAt,
			}).Error
		if err != nil {
			return fmt.Errorf("update session: %w", err)
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("record attempt: %w", err)
	}

	return nil
}

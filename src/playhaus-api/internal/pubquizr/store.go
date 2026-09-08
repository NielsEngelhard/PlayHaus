package pubquizr

import (
	"context"
	"errors"
	"fmt"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

// Compile-time check that we satisfy the interface.
var _ Store = (*GormStore)(nil)

// withContent preloads a quiz whole, each level in playing order, so a caller never has to sort it back afterwards.
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

// ListQuizzes is one page of the shelf, newest first, plus how many there are in total so the caller can say whether there is more.
func (s *GormStore) ListQuizzes(ctx context.Context, f QuizFilter) ([]*Quiz, int64, error) {
	// Built once and reused for both the count and the page, so the two can never disagree about what they are counting.
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
		// A weekly quiz is placed by the Wednesday it belongs to and everything else by when it went up.
		Order("COALESCE(published_at, created_at) DESC, id DESC").
		Limit(f.PageSize).
		Offset(f.Offset()).
		Find(&quizzes).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select quizzes: %w", err)
	}

	return quizzes, total, nil
}

// QuestionCounts is how many questions each of the given quizzes has, keyed by quiz id.
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

// RecordQuizPlay remembers that user already played this quiz
func (s *GormStore) RecordQuizPlay(ctx context.Context, play *QuizPlay) error {
	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(play).Error
	if err != nil {
		return fmt.Errorf("insert quiz play: %w", err)
	}

	return nil
}

// PlayedQuizIDs is which of the given quizzes this host has already played, as a set.
func (s *GormStore) PlayedQuizIDs(ctx context.Context, ownerID string, quizIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	played := make(map[uuid.UUID]bool, len(quizIDs))
	if ownerID == "" || len(quizIDs) == 0 {
		return played, nil
	}

	var ids []uuid.UUID
	err := s.db.WithContext(ctx).
		Model(&QuizPlay{}).
		Where("owner_id = ? AND quiz_id IN ?", ownerID, quizIDs).
		Pluck("quiz_id", &ids).Error
	if err != nil {
		return nil, fmt.Errorf("select quiz plays: %w", err)
	}

	for _, id := range ids {
		played[id] = true
	}
	return played, nil
}

// ReplaceQuiz writes a seeded quiz and the content under it, replacing whatever was there before.
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
			// Keep the id: a session already points at it, and a reseed should not break somebody halfway through a game.
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

// AttemptsOn is how many answer rows one dealt question has collected.
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

// TurnOutcome is everything one settled turn changed.
type TurnOutcome struct {
	// Answers are the attempt rows to insert.
	Answers []*SessionAnswer
	// Questions are the dealt questions whose status or points moved.
	Questions []*SessionQuestion
	// Players are the seats whose score moved, at most once each.
	Players []*SessionPlayer
}

// RecordTurn writes one settled turn and the session it moved, together.
func (s *GormStore) RecordTurn(ctx context.Context, session *Session, out TurnOutcome) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// GORM refuses an empty slice, and a turn with nothing to say about who answered is a legitimate one.
		if len(out.Answers) > 0 {
			if err := tx.Create(out.Answers).Error; err != nil {
				return fmt.Errorf("insert attempts: %w", err)
			}
		}

		for _, question := range out.Questions {
			err := tx.Model(&SessionQuestion{}).
				Where("id = ?", question.ID).
				Updates(map[string]any{"status": question.Status, "points": question.Points}).Error
			if err != nil {
				return fmt.Errorf("update question: %w", err)
			}
		}

		for _, player := range out.Players {
			err := tx.Model(&SessionPlayer{}).
				Where("session_id = ? AND seat = ?", session.ID, player.Seat).
				Updates(map[string]any{"score": player.Score}).Error
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
				"hot_seat":         session.HotSeat,
				"hot_seat_run":     session.HotSeatRun,
				// Written on every turn although only the one that rolls into round 6 ever sets them.
				"finalist_seat_a": session.FinalistSeatA,
				"finalist_seat_b": session.FinalistSeatB,
				"status":          session.Status,
				"completed_at":    session.CompletedAt,
				"updated_at":      session.UpdatedAt,
			}).Error
		if err != nil {
			return fmt.Errorf("update session: %w", err)
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("record turn: %w", err)
	}

	return nil
}

// CurrentSessionByOwnerID is the evening this player could still walk back into.
func (s *GormStore) CurrentSessionByOwnerID(ctx context.Context, ownerID string) (*Session, error) {
	var session Session

	err := withTable(s.db.WithContext(ctx)).
		Where("owner_id = ? AND status = ?", ownerID, SessionInProgress).
		Order("created_at DESC").
		First(&session).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select current session: %w", err)
	}
	return &session, nil
}

// DeleteSessionByID throws one evening away, for good.
func (s *GormStore) DeleteSessionByID(ctx context.Context, sessionID uuid.UUID, ownerID string) error {
	_, err := s.deleteSessions(ctx, func(tx *gorm.DB) *gorm.DB {
		return tx.Where("id = ? AND owner_id = ?", sessionID, ownerID)
	})
	if err != nil {
		return fmt.Errorf("delete session %s: %w", sessionID, err)
	}
	return nil
}

// DeleteSessionsByOwnerID throws away every evening this player owns but one.
func (s *GormStore) DeleteSessionsByOwnerID(ctx context.Context, ownerID string, except uuid.UUID) error {
	_, err := s.deleteSessions(ctx, func(tx *gorm.DB) *gorm.DB {
		return tx.Where("owner_id = ? AND id <> ?", ownerID, except)
	})
	if err != nil {
		return fmt.Errorf("delete previous sessions for %s: %w", ownerID, err)
	}
	return nil
}

// DeleteSessionsOlderThan throws away every evening created before the cutoff.
func (s *GormStore) DeleteSessionsOlderThan(ctx context.Context, before time.Time) (int64, error) {
	return s.deleteSessions(ctx, func(tx *gorm.DB) *gorm.DB {
		return tx.Where("created_at < ?", before)
	})
}

// deleteSessions removes whichever sessions the scope names, and everything hanging off them.
func (s *GormStore) deleteSessions(ctx context.Context, scope func(*gorm.DB) *gorm.DB) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var sessionIDs []uuid.UUID
		if err := scope(tx.Model(&Session{})).Pluck("id", &sessionIDs).Error; err != nil {
			return fmt.Errorf("select sessions: %w", err)
		}
		if len(sessionIDs) == 0 {
			return nil
		}

		if err := tx.Where("session_id IN ?", sessionIDs).Delete(&SessionAnswer{}).Error; err != nil {
			return fmt.Errorf("delete attempts: %w", err)
		}
		if err := tx.Where("session_id IN ?", sessionIDs).Delete(&SessionQuestion{}).Error; err != nil {
			return fmt.Errorf("delete dealt questions: %w", err)
		}
		if err := tx.Where("session_id IN ?", sessionIDs).Delete(&SessionPlayer{}).Error; err != nil {
			return fmt.Errorf("delete players: %w", err)
		}

		result := tx.Where("id IN ?", sessionIDs).Delete(&Session{})
		if result.Error != nil {
			return fmt.Errorf("delete sessions: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, err
	}

	return deleted, nil
}

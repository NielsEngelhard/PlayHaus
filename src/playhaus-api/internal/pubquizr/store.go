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

// withRoster preloads a room's seats in the order they were handed out.
func withRoster(db *gorm.DB) *gorm.DB {
	return db.Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("seat ASC")
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

func (s *GormStore) CreateLobby(ctx context.Context, lobby *PQLobby) error {
	// Create takes the host's seat with it, through the association.
	if err := s.db.WithContext(ctx).Create(lobby).Error; err != nil {
		return fmt.Errorf("insert lobby: %w", err)
	}
	return nil
}

func (s *GormStore) LobbyByCode(ctx context.Context, code string) (*PQLobby, error) {
	var lobby PQLobby

	err := withRoster(s.db.WithContext(ctx)).
		Where("id = ?", code).
		First(&lobby).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrLobbyNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select lobby: %w", err)
	}
	return &lobby, nil
}

func (s *GormStore) LobbyCodeTaken(ctx context.Context, code string) (bool, error) {
	var count int64

	err := s.db.WithContext(ctx).
		Model(&PQLobby{}).
		Where("id = ?", code).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("count lobbies by code: %w", err)
	}

	return count > 0, nil
}

// WaitingLobbyByOwnerID is the newest room this player opened that nobody has started yet, and nothing else.
func (s *GormStore) WaitingLobbyByOwnerID(ctx context.Context, userID string) (*PQLobby, error) {
	var lobby PQLobby

	err := withRoster(s.db.WithContext(ctx)).
		Where("owner_id = ? AND status = ?", userID, LobbyWaiting).
		Order("created_at DESC").
		First(&lobby).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrLobbyNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("select waiting lobby by owner: %w", err)
	}
	return &lobby, nil
}

func (s *GormStore) AddLobbyPlayer(ctx context.Context, player *PQLobbyPlayer) error {
	if err := s.db.WithContext(ctx).Create(player).Error; err != nil {
		return fmt.Errorf("insert lobby player: %w", err)
	}
	return nil
}

// RemoveLobbyPlayer gives one seat back. The seats that are left do not move, which is what lets the socket room hold a seat map it never has to refresh.
func (s *GormStore) RemoveLobbyPlayer(ctx context.Context, code, userID string) error {
	err := s.db.WithContext(ctx).
		Where("lobby_id = ? AND user_id = ?", code, userID).
		Delete(&PQLobbyPlayer{}).Error
	if err != nil {
		return fmt.Errorf("delete lobby player: %w", err)
	}
	return nil
}

func (s *GormStore) SaveLobbySetup(ctx context.Context, code string, in LobbySetup) error {
	err := s.db.WithContext(ctx).
		Model(&PQLobby{}).
		Where("id = ?", code).
		Updates(map[string]any{
			"quiz_id":     in.QuizID,
			"locale":      in.Locale,
			"zen_mode":    in.ZenMode,
			"trivia_mode": in.TriviaMode,
		}).Error
	if err != nil {
		return fmt.Errorf("update lobby setup: %w", err)
	}
	return nil
}

// DeleteLobby drops the room and its seats.
func (s *GormStore) DeleteLobby(ctx context.Context, code string) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("lobby_id = ?", code).Delete(&PQLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		if err := tx.Where("id = ?", code).Delete(&PQLobby{}).Error; err != nil {
			return fmt.Errorf("delete lobby: %w", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete lobby: %w", err)
	}
	return nil
}

// DeleteLobbiesOlderThan drops rooms and their seats, waiting or started.
func (s *GormStore) DeleteLobbiesOlderThan(ctx context.Context, before time.Time) (int64, error) {
	var deleted int64

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var codes []string
		err := tx.Model(&PQLobby{}).
			Where("created_at < ?", before).
			Pluck("id", &codes).Error
		if err != nil {
			return fmt.Errorf("select lobbies: %w", err)
		}
		if len(codes) == 0 {
			return nil
		}

		if err := tx.Where("lobby_id IN ?", codes).Delete(&PQLobbyPlayer{}).Error; err != nil {
			return fmt.Errorf("delete lobby players: %w", err)
		}
		result := tx.Where("id IN ?", codes).Delete(&PQLobby{})
		if result.Error != nil {
			return fmt.Errorf("delete lobbies: %w", result.Error)
		}
		deleted = result.RowsAffected

		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("delete lobbies older than cutoff: %w", err)
	}
	return deleted, nil
}

// StartLobby deals the evening and marks the room spent, together, so two phones tapping start cannot deal two of them.
func (s *GormStore) StartLobby(ctx context.Context, lobby *PQLobby, session *Session, plays []*QuizPlay) error {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Named columns rather than Save: the lobby was loaded with its players preloaded.
		res := tx.Model(&PQLobby{}).
			Where("id = ? AND status = ?", lobby.ID, LobbyWaiting).
			Updates(map[string]any{"status": LobbyStarted, "session_id": session.ID})
		if res.Error != nil {
			return fmt.Errorf("mark lobby started: %w", res.Error)
		}
		if res.RowsAffected == 0 {
			// Somebody else started it between the read and here.
			return ErrLobbyStarted
		}

		// Create takes the table and the dealt questions with it, through the associations.
		if err := tx.Create(session).Error; err != nil {
			return fmt.Errorf("insert session: %w", err)
		}

		if len(plays) > 0 {
			err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(plays).Error
			if err != nil {
				return fmt.Errorf("insert quiz plays: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, ErrLobbyStarted) {
			return err
		}
		return fmt.Errorf("start lobby: %w", err)
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

// SessionsInProgressByPlayerID is every evening this player is sitting at, host or not.
func (s *GormStore) SessionsInProgressByPlayerID(ctx context.Context, userID string) ([]*Session, error) {
	var sessions []*Session

	err := s.db.WithContext(ctx).
		Joins("JOIN pq_session_players ON pq_session_players.session_id = pq_sessions.id").
		Where("pq_session_players.user_id = ? AND pq_sessions.status = ?", userID, SessionInProgress).
		Order("pq_sessions.created_at DESC").
		Find(&sessions).Error
	if err != nil {
		return nil, fmt.Errorf("select sessions in progress by player: %w", err)
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

// SaveGuess keeps one seat's number, replacing whatever that seat said before.
func (s *GormStore) SaveGuess(ctx context.Context, guess *SessionGuess) error {
	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "session_question_id"}, {Name: "seat"}},
			DoUpdates: clause.AssignmentColumns([]string{"value", "created_at"}),
		}).
		Create(guess).Error
	if err != nil {
		return fmt.Errorf("upsert guess: %w", err)
	}
	return nil
}

// GuessesOn is the numbers the phones have sent for one dealt question, in seating order.
func (s *GormStore) GuessesOn(ctx context.Context, sessionQuestionID uuid.UUID) ([]SessionGuess, error) {
	var guesses []SessionGuess

	err := s.db.WithContext(ctx).
		Where("session_question_id = ?", sessionQuestionID).
		Order("seat ASC").
		Find(&guesses).Error
	if err != nil {
		return nil, fmt.Errorf("select guesses: %w", err)
	}

	return guesses, nil
}

// ActivateQuestion pins one pending question, and is false when it was not there to pin.
func (s *GormStore) ActivateQuestion(ctx context.Context, sessionID, questionID uuid.UUID) (bool, error) {
	res := s.db.WithContext(ctx).
		Model(&SessionQuestion{}).
		Where("id = ? AND session_id = ? AND status = ?", questionID, sessionID, QuestionPending).
		Update("status", QuestionActive)
	if res.Error != nil {
		return false, fmt.Errorf("activate question: %w", res.Error)
	}

	return res.RowsAffected == 1, nil
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

			// A settled question's staged numbers are spent, and there are none to find in any round but 3.
			if err := tx.Where("session_question_id = ?", question.ID).Delete(&SessionGuess{}).Error; err != nil {
				return fmt.Errorf("delete guesses: %w", err)
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
				// Written on every turn although only the one that rolls into the finale ever sets them.
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
		// Single device only: a host starting a quiz on their own phone must not delete the room they are hosting.
		return tx.Where("owner_id = ? AND id <> ? AND mode = ?", ownerID, except, ModeSingleDevice)
	})
	if err != nil {
		return fmt.Errorf("delete previous sessions for %s: %w", ownerID, err)
	}
	return nil
}

// AbandonSession closes an evening nobody is coming back to, leaving the rows where they are.
func (s *GormStore) AbandonSession(ctx context.Context, sessionID uuid.UUID) error {
	err := s.db.WithContext(ctx).
		Model(&Session{}).
		Where("id = ? AND status = ?", sessionID, SessionInProgress).
		Updates(map[string]any{"status": SessionAbandoned, "updated_at": time.Now().UTC()}).Error
	if err != nil {
		return fmt.Errorf("abandon session %s: %w", sessionID, err)
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

		if err := tx.Where("session_id IN ?", sessionIDs).Delete(&SessionGuess{}).Error; err != nil {
			return fmt.Errorf("delete guesses: %w", err)
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

		var codes []string
		err := tx.Model(&PQLobby{}).Where("session_id IN ?", sessionIDs).Pluck("id", &codes).Error
		if err != nil {
			return fmt.Errorf("select lobbies: %w", err)
		}
		if len(codes) > 0 {
			if err := tx.Where("lobby_id IN ?", codes).Delete(&PQLobbyPlayer{}).Error; err != nil {
				return fmt.Errorf("delete lobby players: %w", err)
			}
			if err := tx.Where("id IN ?", codes).Delete(&PQLobby{}).Error; err != nil {
				return fmt.Errorf("delete lobbies: %w", err)
			}
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

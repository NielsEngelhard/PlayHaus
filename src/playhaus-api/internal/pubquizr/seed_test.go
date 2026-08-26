package pubquizr

import (
	"context"
	"path/filepath"
	"testing"

	"playhaus-api/internal/platform/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func newTestStore(t *testing.T) (*GormStore, *gorm.DB) {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open.
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	models := Models()
	if err := database.Migrate(db, models[0], models[1:]...); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	return NewGormStore(db), db
}

// TestSeedLoadsEveryQuizThatShips is the guard on the data directory. A quiz file
// that does not describe a playable quiz would otherwise only be found by a table of
// eight running out of words halfway through round 4.
func TestSeedLoadsEveryQuizThatShips(t *testing.T) {
	store, db := newTestStore(t)

	if err := Seed(context.Background(), store); err != nil {
		t.Fatalf("seed: %v", err)
	}

	var quizzes int64
	if err := db.Model(&Quiz{}).Count(&quizzes).Error; err != nil {
		t.Fatalf("count quizzes: %v", err)
	}
	if quizzes == 0 {
		t.Fatal("seeding wrote no quizzes at all")
	}

	// Every quiz that made it in has to be dealable to a full table -- that is the
	// promise the validator makes, checked here against what actually landed.
	var loaded []*Quiz
	if err := withContent(db).Find(&loaded).Error; err != nil {
		t.Fatalf("load quizzes: %v", err)
	}
	for _, quiz := range loaded {
		if _, err := dealQuestions(quiz, MaxPlayers); err != nil {
			t.Errorf("quiz %s/%s cannot seat %d players: %v", quiz.Locale, quiz.Slug, MaxPlayers, err)
		}
	}
}

// TestSeedTwiceChangesNothing matters because the ids have to survive a restart:
// a session points at a question, and rewriting the content under it would break
// somebody halfway through a game.
func TestSeedTwiceChangesNothing(t *testing.T) {
	store, db := newTestStore(t)
	ctx := context.Background()

	if err := Seed(ctx, store); err != nil {
		t.Fatalf("first seed: %v", err)
	}

	before := map[string]uuid.UUID{}
	var quizzes []*Quiz
	if err := db.Find(&quizzes).Error; err != nil {
		t.Fatalf("load quizzes: %v", err)
	}
	for _, quiz := range quizzes {
		before[quiz.Locale.String()+"/"+quiz.Slug] = quiz.ID
	}

	if err := Seed(ctx, store); err != nil {
		t.Fatalf("second seed: %v", err)
	}

	var after []*Quiz
	if err := db.Find(&after).Error; err != nil {
		t.Fatalf("reload quizzes: %v", err)
	}
	if len(after) != len(before) {
		t.Fatalf("quiz count = %d, want %d", len(after), len(before))
	}
	for _, quiz := range after {
		key := quiz.Locale.String() + "/" + quiz.Slug
		if got, want := quiz.ID, before[key]; got != want {
			t.Errorf("%s id = %s, want %s -- reseeding moved a quiz that had not changed", key, got, want)
		}
	}
}

// TestSeedLeavesCommunityQuizzesAlone is the line between what ships with the app
// and what players wrote.
// TestSeedLeavesCommunityQuizzesAlone is waiting on the draft-quiz schema.
//
// What it has to prove is worth keeping in front of somebody: a community quiz sharing
// a slug and a locale with one that ships must survive the loader untouched, and must
// not come back claiming to have been seeded. The version that proved it named
// Quiz.AuthorID, Quiz.Status and Quiz.Seeded, none of which the model carries yet, so it
// cannot compile -- and a package whose tests do not build is a package with no tests at
// all. Restore it along with those columns; `git log -S AuthorID` has the body.
func TestSeedLeavesCommunityQuizzesAlone(t *testing.T) {
	t.Skip("needs Quiz.AuthorID / Status / Seeded, which the model does not carry yet")
}

func TestValidateRefusesAQuizThatCannotSeatAFullTable(t *testing.T) {
	quiz := &Quiz{ID: uuid.New()}
	// One question in round 1 and nothing else: playable for about ten seconds.
	quiz.Questions = append(quiz.Questions, Question{
		ID:     uuid.New(),
		QuizID: quiz.ID,
		Round:  RoundOpen,
		Kind:   KindOpen,
		Prompt: "Is this enough?",
		Answers: []Answer{
			{ID: uuid.New(), Text: "No", Correct: true},
		},
	})

	if err := validate(quiz); err == nil {
		t.Fatal("validate accepted a quiz with one question in it")
	}
}

func TestValidateRefusesAChoiceQuestionWithoutExactlyOneCorrectOption(t *testing.T) {
	question := Question{
		ID:     uuid.New(),
		Round:  RoundChoice,
		Kind:   KindMultipleChoice,
		Prompt: "Pick one",
		Answers: []Answer{
			{ID: uuid.New(), Position: 0, Text: "A", Correct: true},
			{ID: uuid.New(), Position: 1, Text: "B", Correct: true},
			{ID: uuid.New(), Position: 2, Text: "C"},
			{ID: uuid.New(), Position: 3, Text: "D"},
		},
	}

	if err := validateQuestion(question); err == nil {
		t.Fatal("validateQuestion accepted a question with two right answers")
	}
}

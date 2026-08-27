package pubquizr

import (
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"

	"playhaus-api/internal/i18n"

	"github.com/google/uuid"
)

// The quizzes that ship with the app, one JSON file each, laid out
//
//	data/{locale}/{category}/{slug}.json
//
// Locale and category come from the directory rather than from a field inside the
// file, so a file can never disagree with where it is filed. Same idea as the League
// of Letters word lists next door, which are found by locale and length rather than
// by anything written in them.
//
//go:embed data
var quizFiles embed.FS

const seedRoot = "data"

// quizFile is the shape of one file on disk.
//
// Every key a file may carry has to appear here: the decoder is set to refuse
// unknown fields, so a field this struct does not name is not a key that gets
// ignored, it is a boot that does not happen.
type quizFile struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
	// PublishedAt is the day the quiz went up, written as 2006-01-02. Optional --
	// see publishedAtFor for what a file that leaves it out gets.
	PublishedAt string      `json:"publishedAt,omitempty"`
	Description string      `json:"description"`
	Rounds      []roundFile `json:"rounds"`
}

type roundFile struct {
	Round     int            `json:"round"`
	Questions []questionFile `json:"questions"`
}

type questionFile struct {
	Prompt      string       `json:"prompt"`
	Category    string       `json:"category,omitempty"`
	Explanation string       `json:"explanation,omitempty"`
	Unit        string       `json:"unit,omitempty"`
	Answer      float64      `json:"answer,omitempty"` // closest-guess questions
	Options     []optionFile `json:"options,omitempty"`
	Answers     []answerFile `json:"answers,omitempty"`
}

type optionFile struct {
	Text    string `json:"text"`
	Correct bool   `json:"correct,omitempty"`
}

type answerFile struct {
	Text string `json:"text"`
	// Aliases are wordings that also count. They never appear on screen.
	Aliases []string `json:"aliases,omitempty"`
}

// Seed brings the quizzes that ship with the app into the database.
//
// It is deliberately loud: a quiz file that does not describe a playable quiz stops
// the process at boot rather than turning up as an evening that runs out of
// questions in round 4. The config package takes the same line -- fail at startup
// rather than mysteriously at 3am.
func Seed(ctx context.Context, store Store) error {
	files, err := fs.Glob(quizFiles, path.Join(seedRoot, "*", "*", "*.json"))
	if err != nil {
		return fmt.Errorf("walk quiz files: %w", err)
	}

	for _, file := range files {
		if err := seedOne(ctx, store, file); err != nil {
			return fmt.Errorf("seed %s: %w", file, err)
		}
	}

	return nil
}

func seedOne(ctx context.Context, store Store, file string) error {
	locale, category, err := shelfOf(file)
	if err != nil {
		return err
	}

	raw, err := quizFiles.ReadFile(file)
	if err != nil {
		return fmt.Errorf("read: %w", err)
	}

	var parsed quizFile
	decoder := json.NewDecoder(strings.NewReader(string(raw)))
	decoder.DisallowUnknownFields() // a typo in a key is a question that silently vanishes
	if err := decoder.Decode(&parsed); err != nil {
		return fmt.Errorf("parse: %w", err)
	}

	quiz, err := parsed.toQuiz(locale, category)
	if err != nil {
		return err
	}
	if err := validate(quiz); err != nil {
		return err
	}

	// The digest of the file rather than of the built quiz: the built quiz carries
	// fresh uuids every boot and would never match itself.
	sum := sha256.Sum256(raw)
	quiz.ContentHash = hex.EncodeToString(sum[:])

	existing, err := store.QuizBySlug(ctx, quiz.Slug, quiz.Locale)
	switch {
	case errors.Is(err, ErrQuizNotFound):
		// New quiz -- write it.
	case err != nil:
		return err
	case existing.ContentHash == quiz.ContentHash:
		// Unchanged since the last boot. Rewriting it would churn the ids under
		// anybody halfway through a game.
		return nil
	}

	return store.ReplaceQuiz(ctx, quiz)
}

// shelfOf reads the locale and category out of a file's path.
func shelfOf(file string) (i18n.Locale, Category, error) {
	parts := strings.Split(path.Clean(file), "/")
	if len(parts) != 4 {
		return "", "", fmt.Errorf("expected data/{locale}/{category}/{slug}.json, got %q", file)
	}

	locale := i18n.Locale(parts[1])
	if !locale.Valid() {
		return "", "", fmt.Errorf("%q is not a locale this API speaks (try one of %v)", parts[1], i18n.Names())
	}

	category := Category(parts[2])
	if !category.Valid() {
		return "", "", fmt.Errorf("%q is not a quiz category", parts[2])
	}
	if category == CategoryCommunity {
		// Community quizzes are written by players. A file claiming that shelf would
		// be the app pretending somebody wrote it.
		return "", "", fmt.Errorf("the loader does not ship community quizzes")
	}

	return locale, category, nil
}

// publishedAtLayout is how a file writes a date: the day, and nothing smaller. The
// hour a quiz went up is not something anybody needs to know.
const publishedAtLayout = "2006-01-02"

// weeklySlug is the YYYY-wNN a weekly quiz is named after.
var weeklySlug = regexp.MustCompile(`^(\d{4})-w(\d{1,2})$`)

// publishedAtFor is the day a quiz went up.
//
// Three answers, in order. A file that says so wins. A weekly quiz says which
// Wednesday it belongs to in its slug already, so it is not asked to repeat itself in
// a field that could then disagree with its own name. Anything else falls back to
// this boot -- which puts every such quiz on one timestamp, so it is a default worth
// avoiding rather than relying on.
func publishedAtFor(slug, declared string, now time.Time) (*time.Time, error) {
	if declared = strings.TrimSpace(declared); declared != "" {
		day, err := time.Parse(publishedAtLayout, declared)
		if err != nil {
			return nil, fmt.Errorf("publishedAt %q is not a %s date", declared, publishedAtLayout)
		}

		return &day, nil
	}

	if week := weeklySlug.FindStringSubmatch(slug); week != nil {
		day, err := wednesdayOfWeek(week[1], week[2])
		if err != nil {
			return nil, err
		}

		return &day, nil
	}

	return &now, nil
}

// wednesdayOfWeek is the Wednesday of one ISO week, which is the day a weekly quiz
// belongs to.
func wednesdayOfWeek(year, week string) (time.Time, error) {
	y, err := strconv.Atoi(year)
	if err != nil {
		return time.Time{}, fmt.Errorf("%q is not a year", year)
	}

	w, err := strconv.Atoi(week)
	if err != nil || w < 1 || w > 53 {
		return time.Time{}, fmt.Errorf("%q is not a week of the year", week)
	}

	// The fourth of January is in ISO week 1 whichever weekday it lands on, so the
	// Monday before it is where the year's weeks start counting.
	anchor := time.Date(y, time.January, 4, 0, 0, 0, 0, time.UTC)
	weekday := int(anchor.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday closes an ISO week rather than opening one.
	}
	monday := anchor.AddDate(0, 0, 1-weekday)

	return monday.AddDate(0, 0, (w-1)*7+2), nil
}

func (f quizFile) toQuiz(locale i18n.Locale, category Category) (*Quiz, error) {
	if strings.TrimSpace(f.Slug) == "" {
		return nil, fmt.Errorf("needs a slug")
	}
	if strings.TrimSpace(f.Title) == "" {
		return nil, fmt.Errorf("needs a title")
	}

	now := time.Now().UTC()

	// Published is the one timestamp that is about the quiz rather than about this
	// boot, so it is the only one that does not come from the clock.
	published, err := publishedAtFor(f.Slug, f.PublishedAt, now)
	if err != nil {
		return nil, err
	}

	quiz := &Quiz{
		ID:          uuid.New(),
		Slug:        f.Slug,
		Locale:      locale,
		Category:    category,
		Title:       f.Title,
		Description: f.Description,
		PublishedAt: published,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	for _, round := range f.Rounds {
		kind := KindOf(round.Round)
		if round.Round < 1 || round.Round > Rounds {
			return nil, fmt.Errorf("round %d does not exist (1..%d)", round.Round, Rounds)
		}

		for position, question := range round.Questions {
			built, err := question.toQuestion(quiz.ID, round.Round, position, kind)
			if err != nil {
				return nil, fmt.Errorf("round %d question %d: %w", round.Round, position+1, err)
			}
			quiz.Questions = append(quiz.Questions, *built)
		}
	}

	return quiz, nil
}

func (f questionFile) toQuestion(quizID uuid.UUID, round, position int, kind QuestionKind) (*Question, error) {
	if strings.TrimSpace(f.Prompt) == "" {
		return nil, fmt.Errorf("needs a prompt")
	}

	question := &Question{
		ID:       uuid.New(),
		QuizID:   quizID,
		Round:    round,
		Kind:     kind,
		Position: position,
		Prompt:   f.Prompt,
	}
	if f.Category != "" {
		question.Category = &f.Category
	}
	if f.Explanation != "" {
		question.Explanation = &f.Explanation
	}

	switch kind {
	case KindClosest:
		answer := f.Answer
		question.NumericAnswer = &answer
		if f.Unit != "" {
			question.Unit = &f.Unit
		}

	case KindMultipleChoice:
		for i, option := range f.Options {
			question.Answers = append(question.Answers, Answer{
				ID:         uuid.New(),
				QuestionID: question.ID,
				Position:   i,
				Text:       option.Text,
				Correct:    option.Correct,
			})
		}

	case KindOpen, KindList:
		for i, answer := range f.Answers {
			question.Answers = append(question.Answers, Answer{
				ID:         uuid.New(),
				QuestionID: question.ID,
				Position:   i,
				Text:       answer.Text,
				Correct:    true,
			})
			for _, alias := range answer.Aliases {
				question.Answers = append(question.Answers, Answer{
					ID:         uuid.New(),
					QuestionID: question.ID,
					// An alias sits at its answer's position: it is the same
					// answer said differently, not a fifth one.
					Position: i,
					Text:     alias,
					Correct:  true,
					Alias:    true,
				})
			}
		}

	case KindDescribe:
		// The prompt is the word. There is nothing else to carry.
	}

	return question, nil
}

// validate is the gate a quiz file has to get through to become a quiz.
//
// It checks two different things: that every question is internally coherent (four
// options, one of them right), and that there is enough of each round to seat a full
// table of eight. The second is what stops an evening running out of words halfway
// through round 4.
func validate(quiz *Quiz) error {
	for round := 1; round <= Rounds; round++ {
		questions := quiz.QuestionsIn(round)

		if minimum := MinQuestionsIn(round); len(questions) < minimum {
			return fmt.Errorf("round %d has %d questions, needs at least %d to seat %d players",
				round, len(questions), minimum, MaxPlayers)
		}

		for _, question := range questions {
			if err := validateQuestion(question); err != nil {
				return fmt.Errorf("round %d question %d (%q): %w",
					round, question.Position+1, question.Prompt, err)
			}
		}
	}

	return nil
}

func validateQuestion(q Question) error {
	switch q.Kind {
	case KindMultipleChoice:
		if len(q.Answers) != ChoiceOptions {
			return fmt.Errorf("needs exactly %d options, has %d", ChoiceOptions, len(q.Answers))
		}
		correct := 0
		for _, answer := range q.Answers {
			if answer.Correct {
				correct++
			}
		}
		if correct != ChoiceCorrectOptions {
			return fmt.Errorf("needs exactly one correct option, has %d", correct)
		}

	case KindList:
		if found := len(q.CorrectAnswers()); found != ListAnswersPerQuestion {
			return fmt.Errorf("needs exactly %d answers, has %d", ListAnswersPerQuestion, found)
		}

	case KindOpen:
		if len(q.CorrectAnswers()) != OpenAnswersPerQuestion {
			return fmt.Errorf("needs exactly one answer, has %d", len(q.CorrectAnswers()))
		}

	case KindClosest:
		if q.NumericAnswer == nil {
			return fmt.Errorf("needs a numeric answer")
		}

	case KindDescribe:
		if len(q.Answers) > 0 {
			return fmt.Errorf("is a word to describe, so it takes no answers")
		}
	}

	// An empty answer is a row nobody can match against.
	for _, answer := range q.Answers {
		if strings.TrimSpace(answer.Text) == "" {
			return fmt.Errorf("has an empty answer")
		}
	}

	return nil
}

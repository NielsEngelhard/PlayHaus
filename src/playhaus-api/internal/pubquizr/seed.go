package pubquizr

import (
	"bytes"
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

// Quizzes shipped with the app, one JSON file each, at data/{locale}/{category}/{slug}.json.
//
//go:embed data
var quizFiles embed.FS

// SeedRoot is where the shipped quizzes sit inside ShippedFiles.
const SeedRoot = "data"

// ShippedFiles is the embedded corpus, so a generator can read the same files the loader does.
func ShippedFiles() fs.FS {
	return quizFiles
}

// QuizFile is the shape of one file on disk.
type QuizFile struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
	// PublishedAt is the day the quiz went up, written as 2006-01-02.
	PublishedAt string      `json:"publishedAt,omitempty"`
	Description string      `json:"description"`
	Rounds      []RoundFile `json:"rounds"`
}

type RoundFile struct {
	Round     int            `json:"round"`
	Questions []QuestionFile `json:"questions,omitempty"`
	// Words is round 4 whole: a word to describe carries nothing but itself.
	Words []string `json:"words,omitempty"`
}

// The field order is the key order the corpus is written in, which is what the generator's encoder reproduces.
type QuestionFile struct {
	Prompt     string `json:"prompt"`
	Category   string `json:"category,omitempty"`
	Difficulty string `json:"difficulty,omitempty"` // round 6 only
	// Answer is a pointer because zero is a real closest-guess answer -- a shark has no bones.
	Answer      *float64     `json:"answer,omitempty"`
	Unit        string       `json:"unit,omitempty"`
	Explanation string       `json:"explanation,omitempty"`
	Options     []OptionFile `json:"options,omitempty"`
	Answers     []AnswerFile `json:"answers,omitempty"`
}

type OptionFile struct {
	Text    string `json:"text"`
	Correct bool   `json:"correct,omitempty"`
}

type AnswerFile struct {
	Text string `json:"text"`
	// Aliases are wordings that also count. They never appear on screen.
	Aliases []string `json:"aliases,omitempty"`
}

// Seed brings the quizzes that ship with the app into the database.
func Seed(ctx context.Context, store Store) error {
	files, err := fs.Glob(quizFiles, path.Join(SeedRoot, "*", "*", "*.json"))
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
	locale, category, err := ShelfOf(file)
	if err != nil {
		return err
	}

	raw, err := quizFiles.ReadFile(file)
	if err != nil {
		return fmt.Errorf("read: %w", err)
	}

	return SeedQuiz(ctx, store, raw, locale, category)
}

// ParseQuizFile turns the bytes of one quiz file into a validated quiz, with no database in reach.
func ParseQuizFile(raw []byte, locale i18n.Locale, category Category) (*Quiz, error) {
	var parsed QuizFile
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields() // a typo in a key is a question that silently vanishes
	if err := decoder.Decode(&parsed); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}

	quiz, err := parsed.toQuiz(locale, category)
	if err != nil {
		return nil, err
	}
	if err := validate(quiz); err != nil {
		return nil, err
	}

	// The digest of the file rather than of the built quiz.
	sum := sha256.Sum256(raw)
	quiz.ContentHash = hex.EncodeToString(sum[:])

	return quiz, nil
}

// SeedQuiz writes one quiz file's worth of content, leaving the ids alone where the bytes have not changed.
func SeedQuiz(ctx context.Context, store Store, raw []byte, locale i18n.Locale, category Category) error {
	quiz, err := ParseQuizFile(raw, locale, category)
	if err != nil {
		return err
	}

	existing, err := store.QuizBySlug(ctx, quiz.Slug, quiz.Locale)
	switch {
	case errors.Is(err, ErrQuizNotFound):
		// New quiz -- write it.
	case err != nil:
		return err
	case existing.ContentHash == quiz.ContentHash:
		// Unchanged since the last boot.
		return nil
	}

	return store.ReplaceQuiz(ctx, quiz)
}

// ShelfOf reads the locale and category out of a file's path.
func ShelfOf(file string) (i18n.Locale, Category, error) {
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
		// Community quizzes are written by players.
		return "", "", fmt.Errorf("the loader does not ship community quizzes")
	}

	return locale, category, nil
}

// publishedAtLayout is how a file writes a date: the day, and nothing smaller.
const publishedAtLayout = "2006-01-02"

// weeklySlug is the YYYY-wNN a weekly quiz is named after.
var weeklySlug = regexp.MustCompile(`^(\d{4})-w(\d{1,2})$`)

// publishedAtFor is the day a quiz went up.
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

// WednesdayOfWeek is the day a weekly quiz belongs to, so a generator dates a week the way the loader reads it.
func WednesdayOfWeek(year, week int) (time.Time, error) {
	return wednesdayOfWeek(strconv.Itoa(year), strconv.Itoa(week))
}

// wednesdayOfWeek is the Wednesday of one ISO week, which is the day a weekly quiz belongs to.
func wednesdayOfWeek(year, week string) (time.Time, error) {
	y, err := strconv.Atoi(year)
	if err != nil {
		return time.Time{}, fmt.Errorf("%q is not a year", year)
	}

	w, err := strconv.Atoi(week)
	if err != nil || w < 1 || w > 53 {
		return time.Time{}, fmt.Errorf("%q is not a week of the year", week)
	}

	// The fourth of January is in ISO week 1 whichever weekday it lands on.
	anchor := time.Date(y, time.January, 4, 0, 0, 0, 0, time.UTC)
	weekday := int(anchor.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday closes an ISO week rather than opening one.
	}
	monday := anchor.AddDate(0, 0, 1-weekday)

	return monday.AddDate(0, 0, (w-1)*7+2), nil
}

func (f QuizFile) toQuiz(locale i18n.Locale, category Category) (*Quiz, error) {
	if strings.TrimSpace(f.Slug) == "" {
		return nil, fmt.Errorf("needs a slug")
	}
	if strings.TrimSpace(f.Title) == "" {
		return nil, fmt.Errorf("needs a title")
	}

	now := time.Now().UTC()

	// Published is the one timestamp that is about the quiz rather than about this boot.
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

		if len(round.Words) > 0 {
			if round.Round != RoundDescribe {
				return nil, fmt.Errorf("round %d carries words, which only round %d does", round.Round, RoundDescribe)
			}
			if len(round.Questions) > 0 {
				return nil, fmt.Errorf("round %d carries both words and questions", round.Round)
			}
		}

		for position, word := range round.Words {
			if strings.TrimSpace(word) == "" {
				return nil, fmt.Errorf("round %d word %d: needs a word", round.Round, position+1)
			}
			quiz.Questions = append(quiz.Questions, Question{
				ID:       uuid.New(),
				QuizID:   quiz.ID,
				Round:    round.Round,
				Kind:     kind,
				Position: position,
				Prompt:   word,
			})
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

func (f QuestionFile) toQuestion(quizID uuid.UUID, round, position int, kind QuestionKind) (*Question, error) {
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
	// Rounds 1 and 6 are both KindOpen, so which of them may carry a difficulty is validate's job rather than this switch's.
	question.Difficulty = Difficulty(f.Difficulty)

	switch kind {
	case KindClosest:
		question.NumericAnswer = f.Answer
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
					// An alias sits at its answer's position: it is the same answer said differently, not a fifth one.
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
func validate(quiz *Quiz) error {
	for round := 1; round <= Rounds; round++ {
		if err := checkRound(round, quiz.QuestionsIn(round)); err != nil {
			return fmt.Errorf("round %d %w", round, err)
		}
	}

	return nil
}

// CheckRound is validate's per-round half, so a generator can retry one round rather than a whole quiz.
func CheckRound(file RoundFile) error {
	if file.Round < 1 || file.Round > Rounds {
		return fmt.Errorf("round %d does not exist (1..%d)", file.Round, Rounds)
	}

	quiz, err := (QuizFile{Slug: "check", Title: "check", Rounds: []RoundFile{file}}).toQuiz(i18n.Default, CategoryWeekly)
	if err != nil {
		return err
	}

	return checkRound(file.Round, quiz.QuestionsIn(file.Round))
}

// checkRound is what one round has to carry: the exact count, every question well formed, and round 6's split.
func checkRound(round int, questions []Question) error {
	if want := QuestionsIn(round); len(questions) != want {
		return fmt.Errorf("has %d questions, needs exactly %d", len(questions), want)
	}

	for _, question := range questions {
		if err := validateQuestion(question); err != nil {
			return fmt.Errorf("question %d (%q): %w", question.Position+1, question.Prompt, err)
		}
	}

	return validateDifficulties(round, questions)
}

// validateDifficulties is round 6's own rule -- five easy and five hard -- and every other round's, which is to claim no difficulty at all.
func validateDifficulties(round int, questions []Question) error {
	if round != RoundDoubleDown {
		for _, question := range questions {
			if question.Difficulty != "" {
				return fmt.Errorf("question %d (%q) carries a difficulty, which only round %d does",
					question.Position+1, question.Prompt, RoundDoubleDown)
			}
		}

		return nil
	}

	counted := map[Difficulty]int{}

	for _, question := range questions {
		if !question.Difficulty.Valid() {
			return fmt.Errorf("question %d (%q) needs a difficulty of %q or %q",
				question.Position+1, question.Prompt, DifficultyEasy, DifficultyHard)
		}
		counted[question.Difficulty]++
	}

	for _, difficulty := range []Difficulty{DifficultyEasy, DifficultyHard} {
		if counted[difficulty] != DoubleDownPerDifficulty {
			return fmt.Errorf("has %d %s questions, needs exactly %d",
				counted[difficulty], difficulty, DoubleDownPerDifficulty)
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

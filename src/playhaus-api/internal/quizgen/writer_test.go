package quizgen

import (
	"encoding/json"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"
)

// TestEncodeWritesTheShapeTheCorpusIsWrittenIn is what keeps a generated week from
// arriving as a 70-question single-line diff next to files somebody wrote by hand.
// Every shipped quiz has to come back out of the encoder exactly as it went in.
func TestEncodeWritesTheShapeTheCorpusIsWrittenIn(t *testing.T) {
	shipped := pubquizr.ShippedFiles()

	files, err := fs.Glob(shipped, path.Join(pubquizr.SeedRoot, "*", "*", "*.json"))
	if err != nil {
		t.Fatalf("glob: %v", err)
	}
	if len(files) == 0 {
		t.Fatal("no shipped quizzes to compare against")
	}

	for _, file := range files {
		raw, err := fs.ReadFile(shipped, file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}

		var quiz pubquizr.QuizFile
		if err := json.Unmarshal(raw, &quiz); err != nil {
			t.Fatalf("parse %s: %v", file, err)
		}

		got, err := Encode(quiz)
		if err != nil {
			t.Fatalf("encode %s: %v", file, err)
		}

		// A handful of round 3 year questions carry an empty unit, which the encoder
		// leaves out. The loader reads the two the same way, so it is the one
		// difference the corpus is allowed to have.
		want := strings.ReplaceAll(string(raw), `, "unit": ""`, "")
		if string(got) != want {
			t.Errorf("%s does not come back the way it went in", file)
		}
	}
}

// A shark has no bones, and that is a real answer rather than a missing one.
func TestEncodeKeepsAClosestAnswerOfZero(t *testing.T) {
	zero := 0.0
	quiz := pubquizr.QuizFile{
		Slug:  "zero",
		Title: "Zero",
		Rounds: []pubquizr.RoundFile{{
			Round: pubquizr.RoundClosest,
			Questions: []pubquizr.QuestionFile{{
				Prompt: "How many bones does a shark have?",
				Answer: &zero,
				Unit:   "bones",
			}},
		}},
	}

	got, err := Encode(quiz)
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	if !strings.Contains(string(got), `"answer": 0`) {
		t.Errorf("the answer went missing:\n%s", got)
	}
}

func TestWriteRefusesToReplaceAWeekThatAlreadyExists(t *testing.T) {
	dir := t.TempDir()
	quiz := fullQuiz(t, Week{Year: 2026, Week: 40})

	file, err := Write(dir, i18n.EN, quiz, false)
	if err != nil {
		t.Fatalf("write: %v", err)
	}
	if want := filepath.Join(dir, "en", "weekly", "2026-w40.json"); file != want {
		t.Errorf("wrote %s, want %s", file, want)
	}

	// Rewriting a quiz moves every question id, which dangles anybody mid-game.
	if _, err := Write(dir, i18n.EN, quiz, false); err == nil {
		t.Error("the second write went through without -force")
	}
	if _, err := Write(dir, i18n.EN, quiz, true); err != nil {
		t.Errorf("-force was refused: %v", err)
	}
}

// What Write puts on disk has to be a quiz the loader accepts, because seeding is a
// hard startup failure: a file that does not load stops the next deploy.
func TestWhatIsWrittenLoadsBack(t *testing.T) {
	dir := t.TempDir()
	week := Week{Year: 2026, Week: 40}

	file, err := Write(dir, i18n.NL, fullQuiz(t, week), false)
	if err != nil {
		t.Fatalf("write: %v", err)
	}

	raw, err := os.ReadFile(file)
	if err != nil {
		t.Fatalf("read back: %v", err)
	}

	quiz, err := pubquizr.ParseQuizFile(raw, i18n.NL, pubquizr.CategoryWeekly)
	if err != nil {
		t.Fatalf("load back: %v", err)
	}
	if quiz.Slug != week.Slug() {
		t.Errorf("slug %q, want %q", quiz.Slug, week.Slug())
	}
	for round := 1; round <= pubquizr.Rounds; round++ {
		if got, want := len(quiz.QuestionsIn(round)), pubquizr.QuestionsIn(round); got != want {
			t.Errorf("round %d came back with %d questions, want %d", round, got, want)
		}
	}
}

// fullQuiz is a quiz with nothing wrong with it except that nobody would enjoy it.
func fullQuiz(t *testing.T, week Week) pubquizr.QuizFile {
	t.Helper()

	rounds := make([]Round, 0, pubquizr.Rounds)
	for _, number := range Rounds() {
		rounds = append(rounds, filler(t, number))
	}

	quiz, err := Assemble(week, i18n.NL, rounds)
	if err != nil {
		t.Fatalf("assemble: %v", err)
	}

	return quiz
}

func filler(t *testing.T, round int) Round {
	t.Helper()

	built := Round{Round: round}
	count := pubquizr.QuestionsIn(round)

	for at := range count {
		prompt := strings.Repeat("x", at+1) + "?"

		switch round {
		case pubquizr.RoundDescribe:
			built.Words = append(built.Words, strings.Repeat("y", at+1))

		case pubquizr.RoundChoice:
			question := pubquizr.QuestionFile{Prompt: prompt}
			for option := range pubquizr.ChoiceOptions {
				question.Options = append(question.Options, pubquizr.OptionFile{
					Text:    strings.Repeat("z", option+1),
					Correct: option == 0,
				})
			}
			built.Questions = append(built.Questions, question)

		case pubquizr.RoundClosest:
			answer := float64(at)
			built.Questions = append(built.Questions, pubquizr.QuestionFile{
				Prompt: prompt,
				Answer: &answer,
				Unit:   "things",
			})

		case pubquizr.RoundList:
			question := pubquizr.QuestionFile{Prompt: prompt}
			for answer := range pubquizr.ListAnswersPerQuestion {
				question.Answers = append(question.Answers, pubquizr.AnswerFile{Text: strings.Repeat("w", answer+1)})
			}
			built.Questions = append(built.Questions, question)

		default:
			question := pubquizr.QuestionFile{
				Prompt:  prompt,
				Answers: []pubquizr.AnswerFile{{Text: "yes"}},
			}
			if round == pubquizr.RoundOpen {
				question.Category = Categories[at%len(Categories)]
			}
			if round == pubquizr.RoundDoubleDown {
				question.Difficulty = string(pubquizr.DifficultyEasy)
				if at >= pubquizr.DoubleDownPerDifficulty {
					question.Difficulty = string(pubquizr.DifficultyHard)
				}
			}
			built.Questions = append(built.Questions, question)
		}
	}

	if err := built.check(nil); err != nil {
		t.Fatalf("round %d filler is not a round: %v", round, err)
	}

	return built
}

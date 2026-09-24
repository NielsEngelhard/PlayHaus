// Package quizgen writes one week of PubquizR, a round at a time, with a language model.
package quizgen

import (
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"
)

// Round is one round as it came back, before it is filed under a locale.
type Round struct {
	Round     int
	Questions []pubquizr.QuestionFile
	Words     []string
}

// Prompts is every prompt in the round, which is what dedupe and the avoid list work on.
func (r Round) Prompts() []string {
	if len(r.Words) > 0 {
		return r.Words
	}

	prompts := make([]string, 0, len(r.Questions))
	for _, question := range r.Questions {
		prompts = append(prompts, question.Prompt)
	}

	return prompts
}

// canonical is the round with its categories left in the enum's own words, which is how one locale is shown to another.
func (r Round) canonical() pubquizr.RoundFile {
	return pubquizr.RoundFile{Round: r.Round, Questions: r.Questions, Words: r.Words}
}

// check is the loader's own gate plus the things the loader cannot see: a blank, a repeat, a zero.
func (r Round) check(corpus *Corpus) error {
	if err := pubquizr.CheckRound(r.canonical()); err != nil {
		return err
	}

	for at, question := range r.Questions {
		where := fmt.Sprintf("question %d (%q)", at+1, question.Prompt)

		if strings.TrimSpace(question.Prompt) == "" {
			return fmt.Errorf("question %d has no prompt", at+1)
		}
		if question.Category != "" && !slices.Contains(Categories, question.Category) {
			return fmt.Errorf("%s is filed under %q, which is not one of the categories", where, question.Category)
		}
		for _, answer := range question.Answers {
			if strings.TrimSpace(answer.Text) == "" {
				return fmt.Errorf("%s has a blank answer", where)
			}
		}

		said := map[string]struct{}{}
		for _, option := range question.Options {
			if strings.TrimSpace(option.Text) == "" {
				return fmt.Errorf("%s has a blank option", where)
			}
			if _, twice := said[normalize(option.Text)]; twice {
				return fmt.Errorf("%s offers %q twice", where, option.Text)
			}
			said[normalize(option.Text)] = struct{}{}
		}
	}

	for at, word := range r.Words {
		if strings.TrimSpace(word) == "" {
			return fmt.Errorf("word %d is blank", at+1)
		}
	}

	if corpus != nil {
		if trivial := r.tooEasy(); trivial != "" {
			return fmt.Errorf("everybody answers %q without thinking, so it is not a question; ask something at least one player at a table of eight has to think about", trivial)
		}
		if repeats := corpus.Repeats(r); len(repeats) > 0 {
			return fmt.Errorf("asked before: %s", strings.Join(repeats, "; "))
		}
	}

	return nil
}

// file is the round as the loader reads it, with the categories written in one language.
func (r Round) file(locale i18n.Locale) (pubquizr.RoundFile, error) {
	file := pubquizr.RoundFile{Round: r.Round, Words: r.Words}

	for _, question := range r.Questions {
		if question.Category != "" {
			written, err := label(locale, question.Category)
			if err != nil {
				return pubquizr.RoundFile{}, err
			}
			question.Category = written
		}
		file.Questions = append(file.Questions, question)
	}

	return file, nil
}

// Assemble is the whole week: the rounds in playing order under the slug and the wording this locale uses.
func Assemble(week Week, locale i18n.Locale, rounds []Round) (pubquizr.QuizFile, error) {
	if len(rounds) != pubquizr.Rounds {
		return pubquizr.QuizFile{}, fmt.Errorf("a quiz is %d rounds, got %d", pubquizr.Rounds, len(rounds))
	}

	quiz := pubquizr.QuizFile{
		Slug:        week.Slug(),
		Title:       week.Title(locale),
		Description: week.Description(locale),
	}

	for _, round := range rounds {
		file, err := round.file(locale)
		if err != nil {
			return pubquizr.QuizFile{}, fmt.Errorf("round %d: %w", round.Round, err)
		}
		quiz.Rounds = append(quiz.Rounds, file)
	}

	return quiz, nil
}

// ReadQuiz is the inverse of Assemble: one written file back into rounds, so a second locale can be translated from the first.
func ReadQuiz(raw []byte, locale i18n.Locale) (Week, []Round, error) {
	var quiz pubquizr.QuizFile
	if err := json.Unmarshal(raw, &quiz); err != nil {
		return Week{}, nil, fmt.Errorf("parse: %w", err)
	}

	week, err := ParseWeek(quiz.Slug)
	if err != nil {
		return Week{}, nil, err
	}

	rounds := make([]Round, 0, len(quiz.Rounds))
	for _, file := range quiz.Rounds {
		round := Round{Round: file.Round, Words: file.Words}

		for _, question := range file.Questions {
			if question.Category != "" {
				back, err := canonical(locale, question.Category)
				if err != nil {
					return Week{}, nil, fmt.Errorf("round %d: %w", file.Round, err)
				}
				question.Category = back
			}
			round.Questions = append(round.Questions, question)
		}
		rounds = append(rounds, round)
	}

	return week, rounds, nil
}

// Rounds is the round numbers a quiz is generated in, which is also the order they are written in.
func Rounds() []int {
	numbers := make([]int, 0, pubquizr.Rounds)
	for _, spec := range specs {
		numbers = append(numbers, spec.Round)
	}

	return numbers
}

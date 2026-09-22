package quizgen

import (
	"encoding/json"
	"fmt"
	"slices"

	"playhaus-api/internal/pubquizr"
)

// Spec is one round: what to ask for, how many, and the exact shape it has to come back in.
type Spec struct {
	Round int
	Count int
	Name  string
	Brief string

	schema map[string]any
	decode func(raw []byte) (Round, error)
}

func object(properties map[string]any, required ...string) map[string]any {
	return map[string]any{
		"type":                 "object",
		"properties":           properties,
		"required":             required,
		"additionalProperties": false,
	}
}

// exactly is how a count gets into the schema rather than only into the brief.
func exactly(count int, items map[string]any) map[string]any {
	return map[string]any{"type": "array", "items": items, "minItems": count, "maxItems": count}
}

func text(description string) map[string]any {
	return map[string]any{"type": "string", "description": description}
}

func textList(description string) map[string]any {
	return map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "description": description}
}

// answerSchema is one right answer plus the other wordings that also count.
var answerSchema = object(map[string]any{
	"text":    text("the answer as the quizmaster reads it out"),
	"aliases": textList("other wordings that also count, never shown on screen; an empty array where the answer has only one wording"),
}, "text", "aliases")

type answerOut struct {
	Text    string   `json:"text"`
	Aliases []string `json:"aliases"`
}

func (a answerOut) file() pubquizr.AnswerFile {
	file := pubquizr.AnswerFile{Text: a.Text}
	for _, alias := range a.Aliases {
		if alias != "" && alias != a.Text {
			file.Aliases = append(file.Aliases, alias)
		}
	}

	return file
}

type openOut struct {
	Prompt   string    `json:"prompt"`
	Category string    `json:"category"`
	Answer   answerOut `json:"answer"`
}

func (o openOut) file() pubquizr.QuestionFile {
	return pubquizr.QuestionFile{
		Prompt:   o.Prompt,
		Category: o.Category,
		Answers:  []pubquizr.AnswerFile{o.Answer.file()},
	}
}

type choiceOut struct {
	Prompt       string   `json:"prompt"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
}

func (c choiceOut) file() (pubquizr.QuestionFile, error) {
	if c.CorrectIndex < 0 || c.CorrectIndex >= len(c.Options) {
		return pubquizr.QuestionFile{}, fmt.Errorf("correctIndex %d points at no option", c.CorrectIndex)
	}

	question := pubquizr.QuestionFile{Prompt: c.Prompt}
	for i, option := range c.Options {
		question.Options = append(question.Options, pubquizr.OptionFile{Text: option, Correct: i == c.CorrectIndex})
	}

	return question, nil
}

type closestOut struct {
	Prompt      string  `json:"prompt"`
	Answer      float64 `json:"answer"`
	Unit        string  `json:"unit"`
	Explanation string  `json:"explanation"`
}

func (c closestOut) file() pubquizr.QuestionFile {
	return pubquizr.QuestionFile{
		Prompt:      c.Prompt,
		Answer:      &c.Answer,
		Unit:        c.Unit,
		Explanation: c.Explanation,
	}
}

type listOut struct {
	Prompt  string      `json:"prompt"`
	Answers []answerOut `json:"answers"`
}

func (l listOut) file() pubquizr.QuestionFile {
	question := pubquizr.QuestionFile{Prompt: l.Prompt}
	for _, answer := range l.Answers {
		question.Answers = append(question.Answers, answer.file())
	}

	return question
}

// specs is every round, in the order they are played and generated.
var specs = []Spec{
	{
		Round: pubquizr.RoundOpen,
		Count: pubquizr.OpenQuestions,
		Name:  "round 1, the opening round",
		Brief: "Plain trivia, read out loud and answered out loud, one right answer each. Spread them over the categories and keep each one short enough to read in a single breath. Mix the difficulty: the first few warm the table up, the later ones separate it.",
		schema: object(map[string]any{
			"questions": exactly(pubquizr.OpenQuestions, object(map[string]any{
				"prompt":   text("the question, one sentence"),
				"category": map[string]any{"type": "string", "enum": Categories, "description": "which shelf the question belongs on"},
				"answer":   answerSchema,
			}, "prompt", "category", "answer")),
		}, "questions"),
		decode: decodeOpen(pubquizr.RoundOpen),
	},
	{
		Round: pubquizr.RoundChoice,
		Count: pubquizr.ChoiceQuestions,
		Name:  "round 2, the multiple choice round",
		Brief: "Four options, one right, and hard on purpose: a table guessing at random should get about one in four. Every wrong option has to be plausible to somebody who half knows the answer, so no filler and no jokes.",
		schema: object(map[string]any{
			"questions": exactly(pubquizr.ChoiceQuestions, object(map[string]any{
				"prompt":       text("the question, one sentence"),
				"options":      exactly(pubquizr.ChoiceOptions, map[string]any{"type": "string", "description": "one option, as it is shown on screen"}),
				"correctIndex": map[string]any{"type": "integer", "minimum": 0, "maximum": pubquizr.ChoiceOptions - 1, "description": "which option in the array is the right one"},
			}, "prompt", "options", "correctIndex")),
		}, "questions"),
		decode: decodeChoice,
	},
	{
		Round: pubquizr.RoundClosest,
		Count: pubquizr.ClosestQuestions,
		Name:  "round 3, the closest guess round",
		Brief: "Every answer is one number and the nearest guess wins, so nobody should know it exactly and everybody should be able to reason towards it. Heights, distances, counts and years all work. Only use numbers you are certain of and that do not move from one year to the next.",
		schema: object(map[string]any{
			"questions": exactly(pubquizr.ClosestQuestions, object(map[string]any{
				"prompt":      text("the question, phrased so the answer is a single number"),
				"answer":      map[string]any{"type": "number", "description": "the number itself, no unit and no thousands separator"},
				"unit":        text("what the number counts, lower case, as it would be read out; an empty string for a year"),
				"explanation": text("one sentence on why the number is what it is, or an empty string"),
			}, "prompt", "answer", "unit", "explanation")),
		}, "questions"),
		decode: decodeClosest,
	},
	{
		Round: pubquizr.RoundDescribe,
		Count: pubquizr.DescribeWords,
		Name:  "round 4, the describing round",
		Brief: "Single words or short names that one player describes out loud in thirty seconds while the table guesses. They have to be concrete and picturable: an object, an animal, a food, a place, a famous person, a film. No abstractions, nothing that gives itself away in one syllable, and nothing that needs specialist knowledge.",
		schema: object(map[string]any{
			"words": exactly(pubquizr.DescribeWords, map[string]any{"type": "string", "description": "one word or short name, capitalised"}),
		}, "words"),
		decode: decodeDescribe,
	},
	{
		Round: pubquizr.RoundList,
		Count: pubquizr.ListQuestions,
		Name:  "round 5, the four keywords round",
		Brief: "One subject, and the four things a table is most likely to shout about it. They have to be the obvious four rather than the clever four: a player gets twenty seconds and a point for each one they hit. Keep the subjects broad and famous.",
		schema: object(map[string]any{
			"questions": exactly(pubquizr.ListQuestions, object(map[string]any{
				"prompt":  text("the subject, phrased as a question asking for four keywords"),
				"answers": exactly(pubquizr.ListAnswersPerQuestion, answerSchema),
			}, "prompt", "answers")),
		}, "questions"),
		decode: decodeList,
	},
	{
		Round: pubquizr.RoundDoubleDown,
		Count: pubquizr.DoubleDownQuestions,
		Name:  "round 6, the double down round",
		Brief: "The player picks easy for one point or hard for three before hearing the question, so the two sides have to feel like what was asked for. An easy one is something almost everybody at the table knows. A hard one is something almost nobody does, and still has a single short answer.",
		schema: object(map[string]any{
			"easy": exactly(pubquizr.DoubleDownPerDifficulty, object(map[string]any{
				"prompt": text("the question, one sentence"),
				"answer": answerSchema,
			}, "prompt", "answer")),
			"hard": exactly(pubquizr.DoubleDownPerDifficulty, object(map[string]any{
				"prompt": text("the question, one sentence"),
				"answer": answerSchema,
			}, "prompt", "answer")),
		}, "easy", "hard"),
		decode: decodeDoubleDown,
	},
	{
		Round: pubquizr.RoundFinale,
		Count: pubquizr.FinaleQuestions,
		Name:  "round 7, the finale",
		Brief: "Head to head between the two highest scores, read out by a third player. Each question can decide the game, so every one has to be unambiguous, short, and answerable in a single word or name. Pitch them hard but fair: a good pub team should get most of them.",
		schema: object(map[string]any{
			"questions": exactly(pubquizr.FinaleQuestions, object(map[string]any{
				"prompt": text("the question, one sentence"),
				"answer": answerSchema,
			}, "prompt", "answer")),
		}, "questions"),
		decode: decodeOpen(pubquizr.RoundFinale),
	},
}

// SpecFor is the contract for one round.
func SpecFor(round int) (Spec, error) {
	if at := slices.IndexFunc(specs, func(spec Spec) bool { return spec.Round == round }); at >= 0 {
		return specs[at], nil
	}

	return Spec{}, fmt.Errorf("round %d has no spec", round)
}

// decodeOpen reads the two rounds that are a prompt and one answer; round 7 has no category in its schema, so it decodes to none.
func decodeOpen(round int) func([]byte) (Round, error) {
	return func(raw []byte) (Round, error) {
		var payload struct {
			Questions []openOut `json:"questions"`
		}
		if err := json.Unmarshal(raw, &payload); err != nil {
			return Round{}, err
		}

		built := Round{Round: round}
		for _, question := range payload.Questions {
			built.Questions = append(built.Questions, question.file())
		}

		return built, nil
	}
}

func decodeChoice(raw []byte) (Round, error) {
	var payload struct {
		Questions []choiceOut `json:"questions"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return Round{}, err
	}

	built := Round{Round: pubquizr.RoundChoice}
	for at, question := range payload.Questions {
		file, err := question.file()
		if err != nil {
			return Round{}, fmt.Errorf("question %d: %w", at+1, err)
		}
		built.Questions = append(built.Questions, file)
	}

	return built, nil
}

func decodeClosest(raw []byte) (Round, error) {
	var payload struct {
		Questions []closestOut `json:"questions"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return Round{}, err
	}

	built := Round{Round: pubquizr.RoundClosest}
	for _, question := range payload.Questions {
		built.Questions = append(built.Questions, question.file())
	}

	return built, nil
}

func decodeDescribe(raw []byte) (Round, error) {
	var payload struct {
		Words []string `json:"words"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return Round{}, err
	}

	return Round{Round: pubquizr.RoundDescribe, Words: payload.Words}, nil
}

func decodeList(raw []byte) (Round, error) {
	var payload struct {
		Questions []listOut `json:"questions"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return Round{}, err
	}

	built := Round{Round: pubquizr.RoundList}
	for _, question := range payload.Questions {
		built.Questions = append(built.Questions, question.file())
	}

	return built, nil
}

func decodeDoubleDown(raw []byte) (Round, error) {
	var payload struct {
		Easy []openOut `json:"easy"`
		Hard []openOut `json:"hard"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return Round{}, err
	}

	sides := []struct {
		difficulty pubquizr.Difficulty
		questions  []openOut
	}{
		{pubquizr.DifficultyEasy, payload.Easy},
		{pubquizr.DifficultyHard, payload.Hard},
	}

	built := Round{Round: pubquizr.RoundDoubleDown}
	for _, side := range sides {
		for _, question := range side.questions {
			file := question.file()
			file.Category = ""
			file.Difficulty = string(side.difficulty)
			built.Questions = append(built.Questions, file)
		}
	}

	return built, nil
}

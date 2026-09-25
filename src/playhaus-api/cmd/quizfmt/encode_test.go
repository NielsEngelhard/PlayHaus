package main

import (
	"encoding/json"
	"io/fs"
	"path"
	"strings"
	"testing"

	"playhaus-api/internal/pubquizr"
)

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

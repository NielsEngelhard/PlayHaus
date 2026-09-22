package quizgen

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"
)

// Encode is the quiz in the shape the corpus is written in: a two-space frame with one question to a line.
func Encode(quiz pubquizr.QuizFile) ([]byte, error) {
	var out bytes.Buffer

	// A weekly quiz carries no publishedAt: the loader reads its Wednesday out of the slug.
	header := []struct{ key, value string }{
		{"slug", quiz.Slug},
		{"title", quiz.Title},
		{"description", quiz.Description},
	}
	if quiz.PublishedAt != "" {
		header = append(header, struct{ key, value string }{"publishedAt", quiz.PublishedAt})
	}

	out.WriteString("{\n")
	for _, field := range header {
		text, err := compact(field.value)
		if err != nil {
			return nil, err
		}
		fmt.Fprintf(&out, "  %q: %s,\n", field.key, text)
	}

	out.WriteString("  \"rounds\": [\n")
	for at, round := range quiz.Rounds {
		out.WriteString("    {\n")
		fmt.Fprintf(&out, "      \"round\": %d,\n", round.Round)

		var lines []string
		key := "questions"
		if len(round.Words) > 0 {
			key = "words"
			for _, word := range round.Words {
				text, err := compact(word)
				if err != nil {
					return nil, err
				}
				lines = append(lines, text)
			}
		} else {
			for _, question := range round.Questions {
				text, err := compact(question)
				if err != nil {
					return nil, err
				}
				lines = append(lines, text)
			}
		}

		fmt.Fprintf(&out, "      %q: [\n", key)
		for nth, line := range lines {
			out.WriteString("        " + line)
			if nth < len(lines)-1 {
				out.WriteByte(',')
			}
			out.WriteByte('\n')
		}
		out.WriteString("      ]\n    }")

		if at < len(quiz.Rounds)-1 {
			out.WriteByte(',')
		}
		out.WriteByte('\n')
	}
	out.WriteString("  ]\n}\n")

	return out.Bytes(), nil
}

// compact is one value on one line, spaced the way the hand-written files space it.
func compact(value any) (string, error) {
	var raw bytes.Buffer
	encoder := json.NewEncoder(&raw)
	encoder.SetEscapeHTML(false) // an apostrophe in a prompt must stay an apostrophe
	if err := encoder.Encode(value); err != nil {
		return "", fmt.Errorf("encode: %w", err)
	}

	return space(strings.TrimRight(raw.String(), "\n")), nil
}

// space walks the compact form and puts back the one space the corpus keeps inside braces and after separators.
func space(compact string) string {
	var out strings.Builder

	inString, escaped := false, false
	for at := 0; at < len(compact); at++ {
		char := compact[at]

		if inString {
			out.WriteByte(char)
			switch {
			case escaped:
				escaped = false
			case char == '\\':
				escaped = true
			case char == '"':
				inString = false
			}

			continue
		}

		switch char {
		case '"':
			inString = true
			out.WriteByte(char)
		case '{':
			out.WriteByte(char)
			if at+1 < len(compact) && compact[at+1] != '}' {
				out.WriteByte(' ')
			}
		case '}':
			if out.Len() > 0 && compact[at-1] != '{' {
				out.WriteByte(' ')
			}
			out.WriteByte(char)
		case ':', ',':
			out.WriteByte(char)
			out.WriteByte(' ')
		default:
			out.WriteByte(char)
		}
	}

	return out.String()
}

// Write puts one week on disk, but only once the bytes it is about to write load back as the quiz they describe.
func Write(dir string, locale i18n.Locale, quiz pubquizr.QuizFile, force bool) (string, error) {
	raw, err := Encode(quiz)
	if err != nil {
		return "", err
	}
	if _, err := pubquizr.ParseQuizFile(raw, locale, pubquizr.CategoryWeekly); err != nil {
		return "", fmt.Errorf("what was written out does not load back: %w", err)
	}

	file := filepath.Join(dir, locale.String(), pubquizr.CategoryWeekly.String(), quiz.Slug+".json")
	if !force {
		if _, err := os.Stat(file); err == nil {
			// Reseeding a quiz regenerates every question id, which dangles anybody mid-game.
			return "", fmt.Errorf("%s already exists; pass -force to replace it", file)
		}
	}

	if err := os.MkdirAll(filepath.Dir(file), 0o755); err != nil {
		return "", fmt.Errorf("make %s: %w", filepath.Dir(file), err)
	}
	if err := os.WriteFile(file, raw, 0o644); err != nil {
		return "", fmt.Errorf("write %s: %w", file, err)
	}

	return file, nil
}

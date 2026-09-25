package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

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

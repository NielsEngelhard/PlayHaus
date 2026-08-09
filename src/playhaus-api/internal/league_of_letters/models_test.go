package leagueofletters

import (
	"strings"
	"testing"
)

// Marks are written as a compact string so the expectations stay readable:
// G(reen) correct, O(range) present, . absent.
func marksString(marks []Mark) string {
	var b strings.Builder
	for _, m := range marks {
		switch m {
		case MarkCorrect:
			b.WriteByte('G')
		case MarkPresent:
			b.WriteByte('O')
		default:
			b.WriteByte('.')
		}
	}
	return b.String()
}

func TestEvaluate(t *testing.T) {
	cases := []struct {
		name   string
		guess  string
		target string
		want   string
	}{
		{"all correct", "regen", "regen", "GGGGG"},
		{"nothing shared", "bos", "kat", "..."},
		{"misplaced letters", "groen", "regen", "OO.GG"},
		{"case is ignored", "REGEN", "regen", "GGGGG"},

		// The cases a single-pass implementation gets wrong: a letter in the
		// target can only be spent once, and an exact hit spends it first.
		{"repeat with one to spare", "geven", "regen", "OG.GG"},
		{"repeat with nothing left over", "aap", "kat", ".G."},
		{"exact hit claims the letter first", "kaas", "kras", "G.GG"},
		{"scattered repeats", "eerst", "beter", "OGO.O"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := marksString(Evaluate(c.guess, c.target))
			if got != c.want {
				t.Errorf("Evaluate(%q, %q) = %q, want %q", c.guess, c.target, got, c.want)
			}
		})
	}
}

func TestNewRoomCode(t *testing.T) {
	seen := make(map[string]bool)

	for range 100 {
		code, err := NewRoomCode()
		if err != nil {
			t.Fatalf("NewRoomCode() error: %v", err)
		}
		if len(code) != CodeLength {
			t.Fatalf("NewRoomCode() = %q, want %d characters", code, CodeLength)
		}
		for _, r := range code {
			if !strings.ContainsRune(codeAlphabet, r) {
				t.Fatalf("NewRoomCode() = %q, contains %q which is off the alphabet", code, r)
			}
		}
		seen[code] = true
	}

	// Not a distribution test — just a guard against a generator that has got
	// stuck returning one value.
	if len(seen) < 90 {
		t.Errorf("100 codes produced only %d distinct values", len(seen))
	}
}

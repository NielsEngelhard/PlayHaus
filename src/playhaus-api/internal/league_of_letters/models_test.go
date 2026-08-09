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

func TestNormalizeGuess(t *testing.T) {
	cases := map[string]string{
		"REGEN":   "regen",
		"  boter": "boter",
		"Appel\n": "appel",
		"water":   "water",
	}

	for in, want := range cases {
		if got := NormalizeGuess(in); got != want {
			t.Errorf("NormalizeGuess(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestValidGuess(t *testing.T) {
	cases := []struct {
		name   string
		word   string
		length int
		want   bool
	}{
		{"right shape", "regen", 5, true},
		{"too short", "reg", 5, false},
		{"too long", "regenen", 5, false},
		{"digits are not letters", "reg3n", 5, false},
		{"spaces are not letters", "re en", 5, false},
		{"empty", "", 5, false},

		// The caller normalizes first, so anything still upper case by the time
		// it gets here did not come through NormalizeGuess and is not a guess.
		{"upper case has not been normalized", "REGEN", 5, false},

		// Accented letters are outside a-z. No list has them, and letting them
		// through would mean two spellings of the same word could both be typed.
		{"accented letters", "café", 4, false},

		// Shape only: nothing here knows or cares whether this is a real word,
		// because the word lists are still placeholders.
		{"nonsense of the right length", "qqqqq", 5, true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := ValidGuess(c.word, c.length); got != c.want {
				t.Errorf("ValidGuess(%q, %d) = %v, want %v", c.word, c.length, got, c.want)
			}
		})
	}
}

func TestGuessScore(t *testing.T) {
	// Solving sooner is worth more, and the last guess is still worth something.
	want := map[int]int{1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1}

	for number, expected := range want {
		if got := GuessScore(number); got != expected {
			t.Errorf("GuessScore(%d) = %d, want %d", number, got, expected)
		}
	}

	// MaxGuesses caps how many a player gets, but a score of zero or less would
	// be a worse reward for solving than for not solving at all.
	if got := GuessScore(MaxGuesses + 3); got != 1 {
		t.Errorf("GuessScore past the last guess = %d, want 1", got)
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

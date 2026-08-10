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

func TestScoreGuess(t *testing.T) {
	cases := []struct {
		name string
		// The player's earlier guesses this round, oldest first.
		previous []string
		guess    string
		target   string
		want     int
	}{
		{
			// The letter was on the board before the player touched it.
			name: "the free first letter is worth nothing", guess: "kzzzz", target: "krant", want: 0,
		},
		{
			// r placed, and t and a shown to be in there somewhere.
			name: "placings and near misses", guess: "kreta", target: "krant", want: 5 + 2 + 2,
		},
		{
			// Same three facts, rearranged. Rearranging is not finding out.
			name: "nothing already known pays twice", previous: []string{"kreta"}, guess: "krtae", target: "krant", want: 0,
		},
		{
			// Knowing a is in there is not knowing where a goes.
			name: "a near miss that gets placed still pays", previous: []string{"kreta"}, guess: "kranz", target: "krant", want: 5 + 5,
		},
		{
			// Four positions found, minus the free one, plus the word.
			name: "solving cold", guess: "krant", target: "krant", want: 5 + 5 + 5 + 5 + PointsSolved,
		},
		{
			// r was already pinned, so only the other three positions, plus the word.
			name: "solving late pays only for what was left", previous: []string{"kreta"}, guess: "krant", target: "krant", want: 5 + 5 + 5 + PointsSolved,
		},
		{
			// Both e's are separate positions worth finding, and so is the n.
			name: "repeated letters are scored per position", guess: "geven", target: "regen", want: 5 + 5 + 5,
		},
		{
			// The e placed at 1 makes the e adrift at 2 old news, in the same guess.
			name: "placing a letter kills its own near miss", guess: "zeezr", target: "regen", want: 5 + 2,
		},
		{
			// Two of the same letter adrift is still just "there is an e in it".
			name: "one near miss per letter per guess", guess: "zzeez", target: "eerst", want: 2,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := ScoreGuess(c.guess, c.target, c.previous); got != c.want {
				t.Errorf("ScoreGuess(%q, %q, %v) = %d, want %d", c.guess, c.target, c.previous, got, c.want)
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

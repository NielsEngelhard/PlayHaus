package league_of_letters

import (
	"strings"
	"testing"

	"playhaus-api/internal/i18n"
)

// marks writes an expected result compactly: "cpa" is correct, present, absent.
func marks(shorthand string) []LetterStatus {
	out := make([]LetterStatus, 0, len(shorthand))
	for _, r := range shorthand {
		switch r {
		case 'c':
			out = append(out, LetterCorrect)
		case 'p':
			out = append(out, LetterPresent)
		case 'a':
			out = append(out, LetterAbsent)
		default:
			panic("unknown mark " + string(r))
		}
	}
	return out
}

func TestEvaluate(t *testing.T) {
	tests := []struct {
		name   string
		guess  string
		target string
		want   string
	}{
		{"exact", "regel", "regel", "ccccc"},
		{"nothing in common", "vocht", "spaar", "aaaaa"},
		{"all present, none placed", "trap", "part", "pppp"},

		// The reason Evaluate takes two passes. The target holds one e, so
		// exactly one of the guess's two may light up -- and it has to be the one
		// standing in the right place. The second e is spent, so it goes dark.
		{"repeat in guess, one in target", "geel", "gefk", "ccaa"},
		{"repeat in guess, exact hit wins", "eerst", "beste", "pcapp"},

		// The mirror: the target has two e's and the guess one. The guess's l
		// still pays, because the target's l is untouched.
		{"repeat in target, one in guess", "melk", "meel", "ccpa"},

		// The trailing a is an exact hit and claims one of koala's two a's; the
		// leading a takes the other. Had the target held only one, the leading a
		// would have gone dark.
		{"exact hit claims its letter first", "aroma", "koala", "papac"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Evaluate(tt.guess, tt.target)
			want := marks(tt.want)

			if len(got) != len(want) {
				t.Fatalf("got %d marks, want %d", len(got), len(want))
			}
			for i := range want {
				if got[i] != want[i] {
					t.Errorf("position %d (%q): got %q, want %q",
						i, string([]rune(tt.guess)[i]), got[i], want[i])
				}
			}
		})
	}
}

// However a guess is cased or padded on the way in, it is scored the same.
func TestEvaluateIgnoresCase(t *testing.T) {
	lower := Evaluate("regel", "geler")
	upper := Evaluate("REGEL", "GELER")

	for i := range lower {
		if lower[i] != upper[i] {
			t.Fatalf("position %d: lower %q, upper %q", i, lower[i], upper[i])
		}
	}
}

// A guess is never marked correct unless it really is the word -- the property
// the round's over-and-solved logic rests on.
func TestEvaluateAllCorrectOnlyForTheAnswer(t *testing.T) {
	for _, guess := range []string{"regel", "geler", "regen", "kegel"} {
		all := true
		for _, mark := range Evaluate(guess, "regel") {
			if mark != LetterCorrect {
				all = false
				break
			}
		}
		if all != (guess == "regel") {
			t.Errorf("%q: all-correct = %v, want %v", guess, all, guess == "regel")
		}
	}
}

func TestNormalizeGuess(t *testing.T) {
	for in, want := range map[string]string{
		"  Regel ":  "regel",
		"REGEL":     "regel",
		"regel":     "regel",
		"\tRegel\n": "regel",
	} {
		if got := NormalizeGuess(in); got != want {
			t.Errorf("NormalizeGuess(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestValidGuess(t *testing.T) {
	tests := []struct {
		name  string
		word  string
		first string
		want  bool
	}{
		{"right shape", "regel", "r", true},
		{"too short", "rege", "r", false},
		{"too long", "regels", "r", false},
		{"wrong opening letter", "kegel", "r", false},
		{"digits are not letters", "rege1", "r", false},
		{"punctuation is not a letter", "reg-l", "r", false},
		{"empty", "", "r", false},
		{"no hint means any opening letter", "kegel", "", true},

		// Accented letters count, and are still one rune each -- a Dutch list can
		// hold them and the length check must not read them as two.
		{"accented letters", "café1", "c", false},
		{"accented word of the right length", "réële", "r", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ValidGuess(tt.word, 5, tt.first); got != tt.want {
				t.Errorf("ValidGuess(%q, 5, %q) = %v, want %v", tt.word, tt.first, got, tt.want)
			}
		})
	}
}

// Every word a game can draw has to survive its own validator, or the round it
// is drawn for cannot be won: the board lays out wordLength tiles, and an answer
// of any other length is a puzzle with no solution.
//
// Checks the whole of every list rather than a sample -- a bad word only breaks
// the games unlucky enough to draw it, which is exactly the kind of bug a random
// spot check reports once a fortnight. This caught six 8-letter words filed in
// nl-7.txt, plus a stray nine in each of nl-8 and en-8.
func TestEveryListedWordIsAValidGuess(t *testing.T) {
	for _, locale := range []i18n.Locale{i18n.NL, i18n.EN} {
		for size := MinWordLength; size <= MaxWordLength; size++ {
			words, err := readFileAndGetLines(locale, size)
			if err != nil {
				t.Fatalf("%s-%d: %v", locale, size, err)
			}

			// generateRounds asks for one distinct word per round, so a list
			// shorter than the rounds a game draws fails at creation.
			if len(words) < determineNumberOfRounds(1) {
				t.Errorf("%s-%d: holds %d words, need at least %d",
					locale, size, len(words), determineNumberOfRounds(1))
			}

			seen := map[string]bool{}
			for _, word := range words {
				word = strings.ToLower(word)

				if !ValidGuess(word, size, string([]rune(word)[0])) {
					t.Errorf("%s-%d: %q is not a valid guess (%d runes)",
						locale, size, word, len([]rune(word)))
				}
				if !IsAllowedWord(locale, size, word) {
					t.Errorf("%s-%d: answer %q is not an allowed guess", locale, size, word)
				}
				if seen[word] {
					t.Errorf("%s-%d: %q is listed twice", locale, size, word)
				}
				seen[word] = true
			}
		}
	}
}

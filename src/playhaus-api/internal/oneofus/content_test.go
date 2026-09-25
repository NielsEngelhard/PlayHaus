package oneofus

import (
	"math"
	"strings"
	"testing"
	"unicode/utf8"

	"playhaus-api/internal/i18n"
)

// MaxWordUses keeps a word from turning up so often that the table learns its partners.
const MaxWordUses = 3

// A word from a small closed set gives the imposter the answer after two clues: there are only four seasons.
var closedSetWords = map[i18n.Locale][]string{
	i18n.NL: {
		"lente", "zomer", "herfst", "winter",
		"maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag",
		"januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december",
		"rood", "blauw", "geel", "groen", "paars", "oranje", "roze", "zwart", "wit", "grijs", "bruin",
		"noord", "oost", "zuid", "west", "noorden", "oosten", "zuiden", "westen",
		"mercurius", "venus", "mars", "jupiter", "saturnus", "uranus", "neptunus",
		"harten", "ruiten", "klaveren", "schoppen",
	},
	i18n.EN: {
		"spring", "summer", "autumn", "fall", "winter",
		"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
		"january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
		"red", "blue", "yellow", "green", "purple", "orange", "pink", "black", "white", "grey", "gray", "brown",
		"north", "east", "south", "west",
		"mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune",
		"hearts", "diamonds", "clubs", "spades",
	},
}

func allWordPairs(t *testing.T, locale i18n.Locale) []GameInputLine {
	t.Helper()
	lines, err := GetContentLines(locale, Word, math.MaxInt)
	if err != nil {
		t.Fatalf("GetContentLines(%s, word): %v", locale, err)
	}
	return lines
}

func sharedAffix(a, b string) int {
	ra, rb := []rune(a), []rune(b)
	prefix := 0
	for prefix < len(ra) && prefix < len(rb) && ra[prefix] == rb[prefix] {
		prefix++
	}
	suffix := 0
	for suffix < len(ra) && suffix < len(rb) && ra[len(ra)-1-suffix] == rb[len(rb)-1-suffix] {
		suffix++
	}
	return max(prefix, suffix)
}

func TestWordPairsAreTwoDifferentThingsNotTwoSpellingsOfOne(t *testing.T) {
	for _, locale := range i18n.Locales {
		for _, line := range allWordPairs(t, locale) {
			a, b := strings.ToLower(line.RealLine), strings.ToLower(line.ImposterLine)
			shorter, longer := a, b
			if utf8.RuneCountInString(shorter) > utf8.RuneCountInString(longer) {
				shorter, longer = longer, shorter
			}

			switch {
			case a == "" || b == "":
				t.Errorf("%s: %q --- %q has an empty side", locale, line.RealLine, line.ImposterLine)
			case a == b:
				t.Errorf("%s: %q is paired with itself", locale, line.RealLine)
			case utf8.RuneCountInString(shorter) >= 4 && strings.Contains(longer, shorter):
				t.Errorf("%s: %q --- %q, one side contains the other", locale, line.RealLine, line.ImposterLine)
			case sharedAffix(a, b) >= 5:
				t.Errorf("%s: %q --- %q share too much of their spelling", locale, line.RealLine, line.ImposterLine)
			}
		}
	}
}

func TestWordPairsAvoidClosedSets(t *testing.T) {
	for _, locale := range i18n.Locales {
		closed := map[string]bool{}
		for _, word := range closedSetWords[locale] {
			closed[word] = true
		}
		for _, line := range allWordPairs(t, locale) {
			for _, side := range []string{line.RealLine, line.ImposterLine} {
				if closed[strings.ToLower(side)] {
					t.Errorf("%s: %q comes from a closed set", locale, side)
				}
			}
		}
	}
}

func TestWordPairsAreNotRepeatedAndWordsAreNotOverused(t *testing.T) {
	for _, locale := range i18n.Locales {
		pairs := map[[2]string]bool{}
		uses := map[string]int{}
		for _, line := range allWordPairs(t, locale) {
			a, b := strings.ToLower(line.RealLine), strings.ToLower(line.ImposterLine)
			key := [2]string{min(a, b), max(a, b)}
			if pairs[key] {
				t.Errorf("%s: %q --- %q appears twice", locale, line.RealLine, line.ImposterLine)
			}
			pairs[key] = true
			uses[a]++
			uses[b]++
		}
		for word, n := range uses {
			if n > MaxWordUses {
				t.Errorf("%s: %q is used %d times, want at most %d", locale, word, n, MaxWordUses)
			}
		}
	}
}

func TestPairsAreDealtInBothDirections(t *testing.T) {
	data, err := contentFiles.ReadFile(buildDataFilePath(i18n.NL, Word))
	if err != nil {
		t.Fatal(err)
	}
	written := map[string]bool{}
	for line := range strings.SplitSeq(string(data), "\n") {
		parts := strings.SplitN(line, ContentDivider, 2)
		if len(parts) == 2 {
			written[strings.TrimSpace(parts[0])+"|"+strings.TrimSpace(parts[1])] = true
		}
	}

	asWritten, flipped := 0, 0
	for _, line := range allWordPairs(t, i18n.NL) {
		if written[line.RealLine+"|"+line.ImposterLine] {
			asWritten++
		} else {
			flipped++
		}
	}
	if asWritten == 0 || flipped == 0 {
		t.Errorf("dealt %d pairs as written and %d flipped, want both", asWritten, flipped)
	}
}

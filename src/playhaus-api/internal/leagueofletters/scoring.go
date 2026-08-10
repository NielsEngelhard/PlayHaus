package leagueofletters

import (
	"sort"
	"strings"
	"unicode/utf8"
)

// Mark is what one letter of a guess turned out to be worth.
//
// Marks are never stored. They are derived from the guess and the round's word
// whenever a guess is read, which keeps a scoring bug a redeploy rather than a
// migration, and means the guesses table holds only what the player actually
// did.
type Mark string

const (
	MarkCorrect Mark = "correct" // Right letter, right place. Green.
	MarkPresent Mark = "present" // Right letter, wrong place. Orange.
	MarkAbsent  Mark = "absent"
)

// Evaluate scores a guess against the round's word.
//
// Two passes, because a letter can only be spent once. Guessing "geel" against
// "regel" has to mark exactly one of the two e's — the pass that finds exact
// hits claims its letters first, so the near-miss pass can only use what is
// genuinely left over. A single pass would light up both.
func Evaluate(guess, target string) []Mark {
	g := []rune(strings.ToLower(guess))
	t := []rune(strings.ToLower(target))

	marks := make([]Mark, len(g))

	remaining := make(map[rune]int, len(t))
	for _, r := range t {
		remaining[r]++
	}

	for i := range g {
		if i < len(t) && g[i] == t[i] {
			marks[i] = MarkCorrect
			remaining[g[i]]--
		}
	}

	for i := range g {
		if marks[i] == MarkCorrect {
			continue
		}
		if remaining[g[i]] > 0 {
			marks[i] = MarkPresent
			remaining[g[i]]--
			continue
		}
		marks[i] = MarkAbsent
	}

	return marks
}

// NormalizeGuess puts a submitted word in the shape everything else here works
// in: trimmed and lower case. The words in the lists are stored that way and
// Evaluate lowers its arguments anyway, so normalizing once on the way in means
// nothing downstream has to think about it.
func NormalizeGuess(word string) string {
	return strings.ToLower(strings.TrimSpace(word))
}

// ValidGuess reports whether a normalized guess is the right shape for a game.
//
// Shape only — it does not ask whether the word exists. The embedded lists are
// still ten-word placeholders, so a dictionary check against them would reject
// very nearly every real word a player typed, which is worse than not checking.
//
// TODO: once the lists are real, require the guess to be in one and give the
// app a distinct error for it, so "not a word" can be told from "wrong length".
func ValidGuess(word string, length int) bool {
	if utf8.RuneCountInString(word) != length {
		return false
	}

	for _, r := range word {
		if r < 'a' || r > 'z' {
			return false
		}
	}

	return true
}

// What a guess can earn. The scale rewards information: a letter is only worth
// something the first time the player finds it, so the way to score is to keep
// turning up things about the word nobody had yet.
const (
	// A letter pinned to a position that was still unknown.
	PointsCorrectSpot = 5
	// A letter shown to be in the word, but not yet where.
	PointsPresentLetter = 2
	// On top of the letters, for the guess that actually lands the word.
	PointsSolved = 5
)

// ScoreGuess is what one guess earns the player who made it, given the earlier
// guesses they made in the same round.
//
// Only new information pays. Re-guessing a letter you have already placed, or
// re-parking one you already know is in there, is worth nothing — otherwise the
// cheapest strategy would be to guess the same near-miss six times over.
//
// "New" is measured two different ways on purpose. A correct letter is scored
// per position, because a word with two E's has two separate positions worth
// finding. A misplaced letter is scored per letter, because all it tells you is
// that the letter is in there somewhere, and it can only tell you that once.
//
// The first position is never scored. Its letter is on the board from the
// moment the round is drawn, so putting it there is not a guess. That exemption
// is the position's alone: the same letter turning up again elsewhere is a real
// find and pays like any other.
func ScoreGuess(guess, target string, previous []string) int {
	// Positions already pinned, and letters already known to be in the word.
	pinned := make(map[int]bool)
	known := make(map[rune]bool)

	for _, earlier := range previous {
		letters := []rune(strings.ToLower(earlier))
		for i, mark := range Evaluate(earlier, target) {
			switch mark {
			case MarkCorrect:
				pinned[i] = true
				known[letters[i]] = true
			case MarkPresent:
				known[letters[i]] = true
			}
		}
	}

	letters := []rune(strings.ToLower(guess))
	marks := Evaluate(guess, target)

	points := 0

	// Placings first, so that a letter this guess pins down cannot also be paid
	// for as a near miss somewhere else in the same guess.
	for i, mark := range marks {
		if i == 0 || mark != MarkCorrect {
			continue
		}
		if !pinned[i] {
			points += PointsCorrectSpot
		}
		known[letters[i]] = true
	}

	for i, mark := range marks {
		if i == 0 || mark != MarkPresent {
			continue
		}
		if !known[letters[i]] {
			points += PointsPresentLetter
			// Two of the same letter adrift in one guess is still the one fact.
			known[letters[i]] = true
		}
	}

	if NormalizeGuess(guess) == NormalizeGuess(target) {
		points += PointsSolved
	}

	return points
}

// guessWords pulls just the words out, in the order given, for the scorer.
func guessWords(guesses []Guess) []string {
	words := make([]string, 0, len(guesses))
	for _, guess := range guesses {
		words = append(words, guess.Word)
	}
	return words
}

// guessPoints works out what each guess in a round was worth, keyed by guess ID.
//
// Like marks, points are derived on read rather than stored: a guess is worth
// what it revealed, and what it revealed is fully determined by the word and the
// guesses that player had already made. Replaying it here means the running
// total on the scoreboard and the per-guess figures on the board can never drift
// apart, and a change to the scale needs no migration.
//
// The rows arrive in board order, which is not necessarily one player's own
// order, so each player's guesses are replayed in their own numbering.
func guessPoints(guesses []Guess, word string) map[string]int {
	byPlayer := make(map[string][]Guess)
	for _, guess := range guesses {
		byPlayer[guess.UserID] = append(byPlayer[guess.UserID], guess)
	}

	points := make(map[string]int, len(guesses))
	for _, mine := range byPlayer {
		sort.Slice(mine, func(i, j int) bool { return mine[i].Number < mine[j].Number })

		previous := make([]string, 0, len(mine))
		for _, guess := range mine {
			points[guess.ID] = ScoreGuess(guess.Word, word, previous)
			previous = append(previous, guess.Word)
		}
	}

	return points
}

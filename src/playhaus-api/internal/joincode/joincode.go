// Package joincode is the code a player types to get into somebody else's game, for
// every game that has one.
//
// One package rather than a generator per game, because there is only one rule and it
// is worth having in one place: five characters, the first of which says which game it
// belongs to. Before this the whole mechanism lived inside League of Letters -- which
// was honest while it was the only game with a room, and would have become three copies
// of the same loop the moment it was not.
package joincode

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
)

const (
	// Length is the whole code, prefix included. Five characters: one to name the game
	// and four drawn, which is a million codes per game -- see Free.
	Length = 5
	// BodyLength is the part that is actually drawn.
	BodyLength = Length - 1
	// draws is how many codes Free asks for before it gives up.
	draws = 10
)

// alphabet is what a code's body is drawn from: thirty-two characters with every
// ambiguous one taken out, so that nothing in a code can be misread off a screen. No I
// or 1, no O or 0.
//
// Unexported on purpose. Nobody outside needs to build a code by hand, and a caller that
// could would be a second generator -- which is the thing this package exists to stop
// there being three of.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

var (
	ErrMalformed   = errors.New("join code is not the shape of a code")
	ErrUnknownGame = errors.New("join code names no game this build has")
	ErrNoFreeCode  = errors.New("could not find a free join code")
)

// Taken answers whether a code is already in use. See Free for why this is a parameter.
type Taken func(ctx context.Context, code string) (bool, error)

// New is one code for g, free or not.
//
// Cryptographic randomness rather than math/rand, which is not about secrecy so much as
// not wanting the codes handed out in one minute to be guessable from the codes handed
// out in the last one. A room has no other lock on it.
func New(g Game) (string, error) {
	prefix := g.Prefix()
	if prefix == 0 {
		return "", fmt.Errorf("new join code: %w: %q", ErrUnknownGame, g)
	}

	code := make([]byte, Length)
	code[0] = prefix

	for i := 1; i < Length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		code[i] = alphabet[n.Int64()]
	}

	return string(code), nil
}

// Free draws codes for one game until it finds one nobody is using.
//
// The check is passed in rather than made here, because uniqueness is not this package's
// to know: every game keeps its rooms in its own table and the code is that table's
// primary key, so "is this one taken" is a question only that game's store can answer.
// Which also means the prefix is doing more work than it looks like -- two games cannot
// collide even in principle, because they are not looking in the same place and could
// not agree on a first character if they were.
//
// What lives here instead is the part all three games would otherwise each have written
// for themselves: the draw, the retry, and the decision about how many retries is
// enough. Thirty-two characters to the fourth is about a million codes per game and a
// room lives for minutes, so the first draw is almost always free -- but "almost always"
// is not a primary key, and a collision would hand two rooms the same door. Ten draws is
// the answer: with a hundred rooms alive at once, all ten of them colliding is a great
// deal less likely than the disk failing halfway through the insert.
func Free(ctx context.Context, g Game, taken Taken) (string, error) {
	for range draws {
		code, err := New(g)
		if err != nil {
			return "", fmt.Errorf("generate join code: %w", err)
		}

		inUse, err := taken(ctx, code)
		if err != nil {
			return "", fmt.Errorf("check join code: %w", err)
		}
		if !inUse {
			return code, nil
		}
	}

	return "", ErrNoFreeCode
}

// Normalize is the one shape a code is compared in: trimmed, uppercase, and with the
// first character read as the game it can only have meant.
//
// The uppercasing is load-bearing rather than tidy -- a code is a primary key in SQLite,
// which compares text byte for byte, so a room reached in lower case is no room at all.
//
// The fold is the price of O. A zero in the first position is a character no game claims
// and no code contains, so it can only ever have been a player typing what they read as
// an O; a one, likewise, can only have been an L. Both are simply read as the letter.
//
// Nowhere else, and nothing else. A zero further along is a character no code can hold,
// and turning it into an O -- which is also not in the alphabet -- would invent a code
// the player did not type and swap a clear "no such room" for a confusing one. An I is
// left alone for the same reason: it is neither a prefix nor an alphabet character, so
// there is nothing it can only have meant.
func Normalize(raw string) string {
	code := strings.ToUpper(strings.TrimSpace(raw))
	if code == "" {
		return code
	}

	switch code[0] {
	case '0':
		return "O" + code[1:]
	case '1':
		return "L" + code[1:]
	}

	return code
}

// Valid is whether a normalized code could be a code at all: the right length, a first
// character that names a game, and a body drawn from the alphabet.
func Valid(code string) bool {
	_, _, err := parse(code)
	return err == nil
}

// GameFor is the game a code's first character names.
func GameFor(code string) (Game, bool) {
	g, _, err := parse(code)
	if err != nil {
		return "", false
	}
	return g, true
}

// Parse is Normalize, Valid and GameFor in one -- the shape a handler wants, which is
// "here is what arrived, tell me whose room it is or why it is nobody's".
//
// Answers the normalized code alongside the game so that a caller cannot go on to look
// the room up by the raw string it was handed.
func Parse(raw string) (Game, string, error) {
	return parse(Normalize(raw))
}

// parse is Parse on a code that has already been normalized, which is the form every
// check here is written against.
func parse(code string) (Game, string, error) {
	if len(code) != Length {
		return "", "", fmt.Errorf("parse join code: %w: want %d characters, got %d", ErrMalformed, Length, len(code))
	}

	// The body first: a code whose tail holds characters we never hand out is malformed
	// whoever it claims to belong to, and saying so is more use than naming a game that
	// was never going to have the room.
	for i := 1; i < len(code); i++ {
		if !strings.ContainsRune(alphabet, rune(code[i])) {
			return "", "", fmt.Errorf("parse join code: %w: %q is not a code character", ErrMalformed, code[i])
		}
	}

	for _, g := range Games {
		if g.Prefix() == code[0] {
			return g, code, nil
		}
	}

	return "", "", fmt.Errorf("parse join code: %w: no game is %q", ErrUnknownGame, code[0])
}

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
	Length     = 5
	BodyLength = Length - 1 // without "length game indicator prefix"
	draws      = 10         // draws is how many codes Free asks for before it gives up.
)

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

var (
	ErrMalformed   = errors.New("join code is not the shape of a code")
	ErrUnknownGame = errors.New("join code names no game this build has")
	ErrNoFreeCode  = errors.New("could not find a free join code")
)

type Taken func(ctx context.Context, code string) (bool, error)

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

// Generates join codes
// If already used join code is generated, it will generate a new one
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

func Valid(code string) bool {
	_, _, err := parse(code)
	return err == nil
}

func GameFor(code string) (Game, bool) {
	g, _, err := parse(code)
	if err != nil {
		return "", false
	}
	return g, true
}

func Parse(raw string) (Game, string, error) {
	return parse(Normalize(raw))
}

func parse(code string) (Game, string, error) {
	if len(code) != Length {
		return "", "", fmt.Errorf("parse join code: %w: want %d characters, got %d", ErrMalformed, Length, len(code))
	}

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

package joincode

import (
	"context"
	"errors"
	"strings"
	"testing"
)

// A thousand draws per game rather than one, because the things worth catching here are
// off-by-ones: a body one character short, a prefix written over by the first draw, an
// alphabet index that can reach past the end. All of them are either always wrong or
// wrong rarely, and a single code cannot tell the two apart.
func TestNewIsAlwaysTheRightShape(t *testing.T) {
	for _, g := range Games {
		for range 1000 {
			code, err := New(g)
			if err != nil {
				t.Fatalf("New(%s): %v", g, err)
			}
			if len(code) != Length {
				t.Fatalf("New(%s) = %q, want %d characters", g, code, Length)
			}
			if code[0] != g.Prefix() {
				t.Fatalf("New(%s) = %q, want it to start with %q", g, code, g.Prefix())
			}
			for i := 1; i < len(code); i++ {
				if !strings.ContainsRune(alphabet, rune(code[i])) {
					t.Fatalf("New(%s) = %q, which holds %q from outside the alphabet", g, code, code[i])
				}
			}
		}
	}
}

func TestNewRoundTripsThroughGameFor(t *testing.T) {
	for _, g := range Games {
		code, err := New(g)
		if err != nil {
			t.Fatalf("New(%s): %v", g, err)
		}

		got, ok := GameFor(code)
		if !ok {
			t.Fatalf("GameFor(%q) said it names no game", code)
		}
		if got != g {
			t.Errorf("GameFor(%q) = %s, want %s", code, got, g)
		}
	}
}

func TestNewRefusesAGameItDoesNotHave(t *testing.T) {
	if _, err := New(Game("nope")); !errors.Is(err, ErrUnknownGame) {
		t.Errorf("New(Game(\"nope\")) error = %v, want ErrUnknownGame", err)
	}
}

func TestFreeTakesTheFirstCodeNobodyIsUsing(t *testing.T) {
	calls := 0
	taken := func(_ context.Context, _ string) (bool, error) {
		calls++
		return calls < 3, nil // the first two are in use
	}

	code, err := Free(context.Background(), LeagueOfLetters, taken)
	if err != nil {
		t.Fatalf("Free: %v", err)
	}
	if calls != 3 {
		t.Errorf("asked %d times, want 3", calls)
	}
	if g, _ := GameFor(code); g != LeagueOfLetters {
		t.Errorf("Free gave %q, which is not a League of Letters code", code)
	}
}

func TestFreeGivesUpAfterTenDraws(t *testing.T) {
	calls := 0
	taken := func(_ context.Context, _ string) (bool, error) {
		calls++
		return true, nil
	}

	if _, err := Free(context.Background(), OneOfUs, taken); !errors.Is(err, ErrNoFreeCode) {
		t.Errorf("Free error = %v, want ErrNoFreeCode", err)
	}
	if calls != draws {
		t.Errorf("asked %d times, want %d", calls, draws)
	}
}

func TestFreePassesTheStoreErrorOn(t *testing.T) {
	boom := errors.New("database is on fire")
	taken := func(_ context.Context, _ string) (bool, error) { return false, boom }

	if _, err := Free(context.Background(), PubquizR, taken); !errors.Is(err, boom) {
		t.Errorf("Free error = %v, want it to wrap %v", err, boom)
	}
}

func TestNormalize(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want string
	}{
		{"trims and uppercases", " l4x2q ", "L4X2Q"},
		{"reads a leading zero as O", "0x4mn", "OX4MN"},
		{"reads a leading one as L", "1abcd", "LABCD"},
		{"leaves a zero in the body alone", "lo0ab", "LO0AB"},
		{"leaves an I alone", "libcd", "LIBCD"},
		{"is idempotent on a real code", "L4X2Q", "L4X2Q"},
		{"survives an empty string", "", ""},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Normalize(c.raw); got != c.want {
				t.Errorf("Normalize(%q) = %q, want %q", c.raw, got, c.want)
			}
		})
	}
}

func TestParse(t *testing.T) {
	// "lo0ab" normalizes to "LO0AB" and stays malformed, which is what pins the fold to
	// the first position: were it applied throughout, that zero would become an O and
	// this would parse as a One of Us code the player never typed.
	cases := []struct {
		name    string
		raw     string
		want    Game
		wantErr error
	}{
		{"a real code", "L4X2Q", LeagueOfLetters, nil},
		{"lower case", "l4x2q", LeagueOfLetters, nil},
		{"a game with no rooms yet", "P4X2Q", PubquizR, nil},
		{"a leading zero", "0X4MN", OneOfUs, nil},
		{"too short", "L4X2", "", ErrMalformed},
		{"too long", "L4X2QQ", "", ErrMalformed},
		{"an unclaimed first character", "K2V8X", "", ErrUnknownGame},
		{"a zero in the body", "LO0AB", "", ErrMalformed},
		{"an I in the body", "LIBCD", "", ErrMalformed},
		{"empty", "", "", ErrMalformed},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			g, code, err := Parse(c.raw)

			if c.wantErr != nil {
				if !errors.Is(err, c.wantErr) {
					t.Fatalf("Parse(%q) error = %v, want %v", c.raw, err, c.wantErr)
				}
				if Valid(Normalize(c.raw)) {
					t.Errorf("Valid(%q) = true, want false", c.raw)
				}
				return
			}

			if err != nil {
				t.Fatalf("Parse(%q): %v", c.raw, err)
			}
			if g != c.want {
				t.Errorf("Parse(%q) game = %s, want %s", c.raw, g, c.want)
			}
			if code != Normalize(c.raw) {
				t.Errorf("Parse(%q) code = %q, want the normalized %q", c.raw, code, Normalize(c.raw))
			}
		})
	}
}

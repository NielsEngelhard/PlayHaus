package joincode

import "testing"

// Looped over Games rather than written as a table of expected letters, because the
// thing worth catching is a fourth game being added without a letter of its own -- a
// table would simply not mention it, while this fails.
func TestEveryGameHasItsOwnPrefix(t *testing.T) {
	seen := map[byte]Game{}

	for _, g := range Games {
		prefix := g.Prefix()
		if prefix == 0 {
			t.Errorf("%s has no prefix", g)
			continue
		}
		if prefix < 'A' || prefix > 'Z' {
			t.Errorf("%s has prefix %q, want a single uppercase letter", g, prefix)
		}
		if other, taken := seen[prefix]; taken {
			t.Errorf("%s and %s both claim prefix %q", other, g, prefix)
		}
		seen[prefix] = g
	}
}

func TestEveryGameHasItsOwnNamespace(t *testing.T) {
	seen := map[string]bool{}

	for _, g := range Games {
		ns := g.Namespace()
		if ns == "" {
			t.Errorf("%s has an empty namespace", g)
		}
		if seen[ns] {
			t.Errorf("namespace %q is claimed twice", ns)
		}
		seen[ns] = true
	}
}

func TestEveryGameIsValid(t *testing.T) {
	for _, g := range Games {
		if !g.Valid() {
			t.Errorf("%s is in Games but reports itself invalid", g)
		}
	}
}

func TestUnknownGame(t *testing.T) {
	g := Game("nope")

	if g.Valid() {
		t.Error("Game(\"nope\").Valid() = true, want false")
	}
	if prefix := g.Prefix(); prefix != 0 {
		t.Errorf("Game(\"nope\").Prefix() = %q, want 0", prefix)
	}
}

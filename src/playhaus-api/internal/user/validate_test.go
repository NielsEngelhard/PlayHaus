package user

import (
	"errors"
	"strings"
	"testing"
)

func TestNormalizeEmail(t *testing.T) {
	valid := map[string]string{
		"nel@example.com":       "nel@example.com",
		"  nel@example.com  ":   "nel@example.com",
		"Nel@Example.COM":       "nel@example.com",
		"a.b+tag@example.co.uk": "a.b+tag@example.co.uk",
	}

	for in, want := range valid {
		t.Run(in, func(t *testing.T) {
			got, err := NormalizeEmail(in)
			if err != nil {
				t.Fatalf("NormalizeEmail(%q) error: %v", in, err)
			}
			if got != want {
				t.Errorf("NormalizeEmail(%q) = %q, want %q", in, got, want)
			}
		})
	}

	invalid := map[string]string{
		"empty":              "",
		"blank":              "   ",
		"no at sign":         "nel.example.com",
		"no domain":          "nel@",
		"no local part":      "@example.com",
		"two addresses":      "a@b.com, c@d.com",
		"display name form":  "Nel <nel@example.com>",
		"angle brackets":     "<nel@example.com>",
		"leading whitespace": "nel @example.com",
	}

	for name, in := range invalid {
		t.Run(name, func(t *testing.T) {
			if _, err := NormalizeEmail(in); !errors.Is(err, ErrEmailInvalid) {
				t.Errorf("NormalizeEmail(%q) error = %v, want ErrEmailInvalid", in, err)
			}
		})
	}
}

func TestValidateName(t *testing.T) {
	t.Run("trims", func(t *testing.T) {
		got, err := ValidateName("  Nel  ")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != "Nel" {
			t.Errorf("got %q, want %q", got, "Nel")
		}
	})

	t.Run("empty is refused", func(t *testing.T) {
		if _, err := ValidateName("   "); !errors.Is(err, ErrNameRequired) {
			t.Errorf("error = %v, want ErrNameRequired", err)
		}
	})

	t.Run("the limit is inclusive", func(t *testing.T) {
		if _, err := ValidateName(strings.Repeat("x", NameMaxLength)); err != nil {
			t.Errorf("a name of exactly the limit was refused: %v", err)
		}
		if _, err := ValidateName(strings.Repeat("x", NameMaxLength+1)); !errors.Is(err, ErrNameTooLong) {
			t.Errorf("error = %v, want ErrNameTooLong", err)
		}
	})

	// Counted in runes, not bytes, or a name of emoji would be rejected long
	// before it looked long to the person typing it.
	t.Run("multi-byte characters count once each", func(t *testing.T) {
		if _, err := ValidateName(strings.Repeat("é", NameMaxLength)); err != nil {
			t.Errorf("a name of %d accented characters was refused: %v", NameMaxLength, err)
		}
	})
}

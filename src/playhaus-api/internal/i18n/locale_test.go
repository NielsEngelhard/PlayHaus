package i18n

import "testing"

func TestValue(t *testing.T) {
	got, err := NL.Value()
	if err != nil {
		t.Fatalf("Value() error: %v", err)
	}
	if got != "nl" {
		t.Errorf("Value() = %v, want %q", got, "nl")
	}

	for _, l := range []Locale{"", "de", "EN"} {
		if _, err := l.Value(); err == nil {
			t.Errorf("Value() on %q = nil error, want an error", string(l))
		}
	}
}

func TestScan(t *testing.T) {
	// Drivers hand back a string or a []byte depending on the column type.
	tests := map[string]any{
		"string": "nl",
		"bytes":  []byte("nl"),
	}

	for name, src := range tests {
		t.Run(name, func(t *testing.T) {
			var l Locale
			if err := l.Scan(src); err != nil {
				t.Fatalf("Scan(%v) error: %v", src, err)
			}
			if l != NL {
				t.Errorf("Scan(%v) = %q, want %q", src, l, NL)
			}
		})
	}
}

func TestScanRejects(t *testing.T) {
	tests := map[string]any{
		"null":        nil,
		"unsupported": "de",
		"empty":       "",
		"wrong type":  42,
	}

	for name, src := range tests {
		t.Run(name, func(t *testing.T) {
			var l Locale
			if err := l.Scan(src); err == nil {
				t.Errorf("Scan(%v) = nil error, want an error", src)
			}
		})
	}
}

package leagueofletters

import (
	"testing"
	"time"
)

// The response builders are pure, so the rule that matters most here — when the
// answer is allowed to leave the server — can be checked in every state a game
// can be in, including the ones no HTTP test can reach because nothing sets a
// deadline yet.

func TestRoundResponseHidesTheWordWhileItIsStillWinnable(t *testing.T) {
	now := time.Date(2026, 8, 10, 12, 0, 0, 0, time.UTC)
	past := now.Add(-time.Minute)
	future := now.Add(time.Minute)

	const word = "regen"

	cases := []struct {
		name    string
		game    Game
		guesses []Guess
		want    string
	}{
		{
			name: "active with no guesses",
			game: Game{Status: StatusActive},
			want: "",
		},
		{
			name:    "active with a wrong guess",
			game:    Game{Status: StatusActive},
			guesses: []Guess{{ID: "1", UserID: "u", Number: 1, Word: "boter"}},
			want:    "",
		},
		{
			name: "still running on the clock",
			game: Game{Status: StatusActive, EndsAt: &future},
			want: "",
		},
		{
			name:    "somebody found it",
			game:    Game{Status: StatusActive},
			guesses: []Guess{{ID: "1", UserID: "u", Number: 1, Word: word}},
			want:    word,
		},
		{
			name: "the game is over",
			game: Game{Status: StatusFinished},
			want: word,
		},
		{
			name: "the clock ran out",
			game: Game{Status: StatusActive, EndsAt: &past},
			want: word,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := newRoundResponse(c.game, Round{Number: 1, Word: word}, c.guesses, now)

			if got.Word != c.want {
				t.Errorf("Word = %q, want %q", got.Word, c.want)
			}

			// The first letter is on the board from the moment the round is
			// drawn, whatever else is or is not revealed.
			if got.FirstLetter != "r" {
				t.Errorf("FirstLetter = %q, want %q", got.FirstLetter, "r")
			}
		})
	}
}

// A round with no word behind it must not panic a read of the game.
func TestRoundResponseSurvivesAnEmptyWord(t *testing.T) {
	got := newRoundResponse(Game{Status: StatusActive}, Round{Number: 1}, nil, time.Now())

	if got.FirstLetter != "" {
		t.Errorf("FirstLetter = %q, want empty", got.FirstLetter)
	}
}

func TestGameResponseMarksEveryGuessAndScoresIt(t *testing.T) {
	guesses := []Guess{
		{ID: "a", UserID: "u1", Number: 1, Word: "kreta"},
		{ID: "b", UserID: "u1", Number: 2, Word: "krant"},
	}

	got := newRoundResponse(Game{Status: StatusActive}, Round{Number: 1, Word: "krant"}, guesses, time.Now())

	if len(got.Guesses) != 2 {
		t.Fatalf("got %d guesses, want 2", len(got.Guesses))
	}

	// Marks are derived, never stored.
	if len(got.Guesses[0].Marks) != len("kreta") {
		t.Errorf("first guess has %d marks, want %d", len(got.Guesses[0].Marks), len("kreta"))
	}

	// The second guess is scored against what the first one already revealed,
	// so it cannot be paid twice for the same facts.
	if got.Guesses[1].Points != 5+5+5+PointsSolved {
		t.Errorf("solving guess scored %d, want %d", got.Guesses[1].Points, 5+5+5+PointsSolved)
	}
}

// Empty rather than null: the app renders a list, and a null is a crash waiting
// for the one game that has nobody in it yet.
func TestGameResponseAlwaysHasAPlayerSlice(t *testing.T) {
	got := newGameResponse(Game{Status: StatusLobby}, nil, nil, nil, time.Now())

	if got.Players == nil {
		t.Error("Players is nil; it must marshal as [] not null")
	}
	if got.Round != nil {
		t.Error("a game with no round got one anyway")
	}
	if got.MaxGuesses != MaxGuesses {
		t.Errorf("MaxGuesses = %d, want %d", got.MaxGuesses, MaxGuesses)
	}
}

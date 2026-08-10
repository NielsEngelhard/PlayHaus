package leagueofletters

import "time"

// The wire shapes, and the pure functions that build them.
//
// These exist so the round's word cannot leave by accident: the models are
// never marshalled directly, and RoundResponse only gains a Word once the round
// is decided. Keeping the builders pure — data in, data out, no database —
// means the rule about when the word is revealed can be tested exhaustively
// without a row anywhere.

type GameResponse struct {
	ID         string           `json:"id"`
	Code       *string          `json:"code,omitempty"`
	Mode       string           `json:"mode"`
	Status     string           `json:"status"`
	HostUserID string           `json:"hostUserId"`
	Language   string           `json:"language"`
	WordLength int              `json:"wordLength"`
	MaxGuesses int              `json:"maxGuesses"`
	StartedAt  *time.Time       `json:"startedAt,omitempty"`
	EndsAt     *time.Time       `json:"endsAt,omitempty"`
	Version    int              `json:"version"`
	Players    []PlayerResponse `json:"players"`
	Round      *RoundResponse   `json:"round,omitempty"`
	CreatedAt  time.Time        `json:"createdAt"`
}

type PlayerResponse struct {
	UserID        string    `json:"userId"`
	Name          string    `json:"name"`
	AvatarColorID string    `json:"avatarColorId"`
	Score         int       `json:"score"`
	JoinedAt      time.Time `json:"joinedAt"`
}

type RoundResponse struct {
	Number    int       `json:"number"`
	StartedAt time.Time `json:"startedAt"`

	// Absent on an untimed round, which is every solo one.
	EndsAt  *time.Time      `json:"endsAt,omitempty"`
	Guesses []GuessResponse `json:"guesses"`

	// Empty while the round is still winnable. See newRoundResponse.
	Word        string `json:"word,omitempty"`
	FirstLetter string `json:"firstLetter"`
}

type GuessResponse struct {
	UserID string `json:"userId"`
	Number int    `json:"number"`
	Word   string `json:"word"`
	Marks  []Mark `json:"marks"`

	// What this guess added to its player's score. Derived, never stored — see
	// guessPoints.
	Points    int       `json:"points"`
	CreatedAt time.Time `json:"createdAt"`
}

// newGameResponse assembles the client's view of a game: the game itself, who
// is in it, and the current round with everyone's guesses scored. It is what
// every read of a game returns, so the shape a client polls never changes with
// how it got there.
//
// A nil round is a game still in the lobby. That is not an error — it is what a
// lobby is.
func newGameResponse(game Game, players []ScoreboardRow, round *Round, guesses []Guess, now time.Time) GameResponse {
	out := GameResponse{
		ID:         game.ID,
		Code:       game.Code,
		Mode:       string(game.Mode),
		Status:     string(game.Status),
		HostUserID: game.HostUserID,
		Language:   game.Language,
		WordLength: game.WordLength,
		MaxGuesses: MaxGuesses,
		StartedAt:  game.StartedAt,
		EndsAt:     game.EndsAt,
		Version:    game.Version,
		Players:    make([]PlayerResponse, 0, len(players)),
		CreatedAt:  game.CreatedAt,
	}

	for _, row := range players {
		out.Players = append(out.Players, PlayerResponse{
			UserID:        row.UserID,
			Name:          row.Name,
			AvatarColorID: row.AvatarColorID,
			Score:         row.Score,
			JoinedAt:      row.JoinedAt,
		})
	}

	if round != nil {
		roundResponse := newRoundResponse(game, *round, guesses, now)
		out.Round = &roundResponse
	}

	return out
}

func newRoundResponse(game Game, round Round, guesses []Guess, now time.Time) RoundResponse {
	// Given away from the moment the round is drawn, unlike Word below: knowing the
	// letter it starts with is a head start, not the answer. Slicing a byte is safe
	// here — every word in the lists is plain a-z, the same shape ValidGuess demands —
	// and the empty check is only so a round with no word behind it cannot panic a
	// read of the game.
	firstLetter := ""
	if round.Word != "" {
		firstLetter = round.Word[:1]
	}

	out := RoundResponse{
		Number:      round.Number,
		StartedAt:   round.StartedAt,
		EndsAt:      round.EndsAt,
		Guesses:     make([]GuessResponse, 0, len(guesses)),
		FirstLetter: firstLetter,
	}

	points := guessPoints(guesses, round.Word)

	for _, guess := range guesses {
		out.Guesses = append(out.Guesses, GuessResponse{
			UserID:    guess.UserID,
			Number:    guess.Number,
			Word:      guess.Word,
			Marks:     Evaluate(guess.Word, round.Word),
			Points:    points[guess.ID],
			CreatedAt: guess.CreatedAt,
		})
	}

	// The answer is only ever handed over once it can no longer help: the round
	// is out of time, or somebody has already found it.
	if game.HasExpired(now) || game.Status == StatusFinished || containsSolution(out.Guesses, round.Word) {
		out.Word = round.Word
	}

	return out
}

func containsSolution(guesses []GuessResponse, word string) bool {
	for _, guess := range guesses {
		if guess.Word == word {
			return true
		}
	}
	return false
}

// Request data
type createGameRequest struct {
	Mode       string `json:"mode"`
	Language   string `json:"language"`
	WordLength int    `json:"wordLength"`
}

type createGuessRequest struct {
	Word string `json:"word"`
}

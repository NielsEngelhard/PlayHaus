package leagueofletters

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"playhausapi/internal/authctx"
	wordlists "playhausapi/internal/league_of_letters/words"
	json_utils "playhausapi/internal/util/json"

	"gorm.io/gorm"
)

type Handler struct {
	DB *gorm.DB
}

func New(db *gorm.DB) *Handler { return &Handler{DB: db} }

// How many times a room code collision is retried before giving up.
const codeAttempts = 5

// CreateGameHandler starts a new game, solo or multiplayer.
//
// The two modes differ only in when the clock starts. A solo game has nobody to
// wait for, so it is created active with its first round already drawn and its
// deadline set. A multiplayer game is created in the lobby with a room code and
// no round at all — the word is drawn when the host starts it, so a code that
// sits unused for an hour hasn't burned a word or quietly run out its clock.
//
// Must be wrapped in RequireAuth.
func (h *Handler) CreateGameHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req createGameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	mode, ok := ParseMode(req.Mode)
	if !ok {
		http.Error(w, "Unknown game mode", http.StatusBadRequest)
		return
	}

	// Parsed here only to reject bad input early; the game stores the raw
	// values and re-parses when it needs a word.
	if _, err := wordlists.ParseLanguage(req.Language); err != nil {
		http.Error(w, "Unsupported language", http.StatusBadRequest)
		return
	}
	if _, err := wordlists.ParseLength(req.WordLength); err != nil {
		http.Error(w, "Unsupported word length", http.StatusBadRequest)
		return
	}

	var game Game
	var err error
	for attempt := 0; attempt < codeAttempts; attempt++ {
		game, err = h.createGame(r.Context(), userID, mode, req.Language, req.WordLength)
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			// Two games drew the same room code. Nothing was written — the whole
			// create is one transaction — so just draw another one.
			continue
		}
		break
	}
	if err != nil {
		http.Error(w, "Could not create game", http.StatusInternalServerError)
		return
	}

	response, err := h.gameResponse(r.Context(), game)
	if err != nil {
		http.Error(w, "Could not load game", http.StatusInternalServerError)
		return
	}

	json_utils.WriteJSON(w, http.StatusCreated, response)
}

// createGame writes the game, its host as the first player, and — for a solo
// game — the opening round, as one transaction. Half a game is worse than no
// game: a row with no players in it would be joinable and unplayable.
func (h *Handler) createGame(ctx context.Context, userID string, mode Mode, language string, wordLength int) (Game, error) {
	now := time.Now()

	game := Game{
		HostUserID: userID,
		Mode:       mode,
		Status:     StatusLobby,
		Language:   language,
		WordLength: wordLength,
	}

	if mode == ModeMultiplayer {
		code, err := NewRoomCode()
		if err != nil {
			return Game{}, err
		}
		game.Code = &code
	} else {
		endsAt := now.Add(GameDuration)
		game.Status = StatusActive
		game.StartedAt = &now
		game.EndsAt = &endsAt
	}

	err := h.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&game).Error; err != nil {
			return err
		}

		if err := tx.Create(&Player{GameID: game.ID, UserID: userID, JoinedAt: now}).Error; err != nil {
			return err
		}

		if game.Status != StatusActive {
			return nil
		}

		round, err := NewRound(game, 1, *game.EndsAt)
		if err != nil {
			return err
		}
		return tx.Create(&round).Error
	})
	if err != nil {
		return Game{}, err
	}

	return game, nil
}

// gameResponse assembles the client's view of a game: the game itself, who is
// in it, and the current round with everyone's guesses scored. It is what every
// read of a game returns, so the shape a client polls never changes with how it
// got there.
func (h *Handler) gameResponse(ctx context.Context, game Game) (GameResponse, error) {
	players, err := h.playerResponses(ctx, game.ID)
	if err != nil {
		return GameResponse{}, err
	}

	response := GameResponse{
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
		Players:    players,
		CreatedAt:  game.CreatedAt,
	}

	var round Round
	err = h.DB.WithContext(ctx).
		Where("game_id = ?", game.ID).
		Order("number DESC").
		First(&round).Error

	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		// A game in the lobby has no round yet. Not an error — that is what a
		// lobby is.
		return response, nil
	case err != nil:
		return GameResponse{}, err
	}

	roundResponse, err := h.roundResponse(ctx, game, round)
	if err != nil {
		return GameResponse{}, err
	}
	response.Round = &roundResponse

	return response, nil
}

func (h *Handler) roundResponse(ctx context.Context, game Game, round Round) (RoundResponse, error) {
	var guesses []Guess
	if err := h.DB.WithContext(ctx).
		Where("round_id = ?", round.ID).
		Order("created_at").
		Find(&guesses).Error; err != nil {
		return RoundResponse{}, err
	}

	out := RoundResponse{
		Number:    round.Number,
		StartedAt: round.StartedAt,
		EndsAt:    round.EndsAt,
		Guesses:   make([]GuessResponse, 0, len(guesses)),
	}

	for _, guess := range guesses {
		out.Guesses = append(out.Guesses, GuessResponse{
			UserID:    guess.UserID,
			Number:    guess.Number,
			Word:      guess.Word,
			Marks:     Evaluate(guess.Word, round.Word),
			CreatedAt: guess.CreatedAt,
		})
	}

	// The answer is only ever handed over once it can no longer help: the round
	// is out of time, or somebody has already found it.
	if game.HasExpired(time.Now()) || game.Status == StatusFinished || containsSolution(out.Guesses, round.Word) {
		out.Word = round.Word
	}

	return out, nil
}

func containsSolution(guesses []GuessResponse, word string) bool {
	for _, guess := range guesses {
		if guess.Word == word {
			return true
		}
	}
	return false
}

// playerResponses reads the scoreboard. The join is against app_users rather
// than a stored copy of the name, so a player who renames mid-game is renamed
// on everyone's screen.
func (h *Handler) playerResponses(ctx context.Context, gameID string) ([]PlayerResponse, error) {
	var rows []struct {
		UserID        string
		Name          string
		AvatarColorID string
		Score         int
		JoinedAt      time.Time
	}

	err := h.DB.WithContext(ctx).
		Table("lol_players").
		Select("lol_players.user_id, app_users.name, app_users.avatar_color_id, lol_players.score, lol_players.joined_at").
		Joins("JOIN app_users ON app_users.id = lol_players.user_id").
		Where("lol_players.game_id = ?", gameID).
		Order("lol_players.joined_at").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	players := make([]PlayerResponse, 0, len(rows))
	for _, row := range rows {
		players = append(players, PlayerResponse{
			UserID:        row.UserID,
			Name:          row.Name,
			AvatarColorID: row.AvatarColorID,
			Score:         row.Score,
			JoinedAt:      row.JoinedAt,
		})
	}

	return players, nil
}

// Response data
//
// These exist so the round's word cannot leave by accident: the models are
// never marshalled directly, and RoundResponse only gains a Word once the round
// is decided.

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
	Number    int             `json:"number"`
	StartedAt time.Time       `json:"startedAt"`
	EndsAt    time.Time       `json:"endsAt"`
	Guesses   []GuessResponse `json:"guesses"`

	// Empty while the round is still winnable. See roundResponse.
	Word string `json:"word,omitempty"`
}

type GuessResponse struct {
	UserID    string    `json:"userId"`
	Number    int       `json:"number"`
	Word      string    `json:"word"`
	Marks     []Mark    `json:"marks"`
	CreatedAt time.Time `json:"createdAt"`
}

// Request data
type createGameRequest struct {
	Mode       string `json:"mode"`
	Language   string `json:"language"`
	WordLength int    `json:"wordLength"`
}

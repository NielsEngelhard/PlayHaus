package leagueofletters

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sort"
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
		game.Status = StatusActive
		game.StartedAt = &now
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

		round, err := NewRound(game, 1, game.EndsAt)
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

// Why a game read or a guess was refused. Handlers turn these into statuses in
// writeGameError; nothing outside this package needs to tell them apart.
var (
	errGameNotFound   = errors.New("game not found")
	errGameNotActive  = errors.New("game is not accepting guesses")
	errBadGuess       = errors.New("guess does not fit this game")
	errAlreadyGuessed = errors.New("word already guessed this round")
	errOutOfGuesses   = errors.New("no guesses left")
)

// GetGameHandler reads a game back.
//
// This is what the app polls: the response is the same shape every other read
// returns, so a client that can render a created game can render this one.
//
// Must be wrapped in RequireAuth.
func (h *Handler) GetGameHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	game, err := h.loadGameForPlayer(r.Context(), r.PathValue("id"), userID)
	if err != nil {
		writeGameError(w, err)
		return
	}

	game, err = h.finishIfExpired(r.Context(), game)
	if err != nil {
		http.Error(w, "Could not load game", http.StatusInternalServerError)
		return
	}

	response, err := h.gameResponse(r.Context(), game)
	if err != nil {
		http.Error(w, "Could not load game", http.StatusInternalServerError)
		return
	}

	json_utils.WriteJSON(w, http.StatusOK, response)
}

// CreateGuessHandler records a guess and hands back the whole game.
//
// The whole game rather than just the new guess: the guess is not the only
// thing that changed — it may have ended the round, moved a score, or revealed
// the answer — and a client that re-renders from one response can never hold a
// half-updated board.
//
// Must be wrapped in RequireAuth.
func (h *Handler) CreateGuessHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req createGuessRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	game, err := h.loadGameForPlayer(r.Context(), r.PathValue("id"), userID)
	if err != nil {
		writeGameError(w, err)
		return
	}

	// Settled before the guess is looked at, so a game whose clock ran out while
	// the player was typing refuses the word rather than accepting a late one.
	game, err = h.finishIfExpired(r.Context(), game)
	if err != nil {
		http.Error(w, "Could not load game", http.StatusInternalServerError)
		return
	}

	game, err = h.createGuess(r.Context(), game, userID, NormalizeGuess(req.Word))
	if err != nil {
		writeGameError(w, err)
		return
	}

	response, err := h.gameResponse(r.Context(), game)
	if err != nil {
		http.Error(w, "Could not load game", http.StatusInternalServerError)
		return
	}

	json_utils.WriteJSON(w, http.StatusCreated, response)
}

// createGuess writes the guess, the score it earned, and the game's new state
// as one transaction, then re-reads the game.
//
// Everything it needs to decide is read inside the transaction rather than
// passed in: how many guesses the player has already had is exactly the kind of
// thing two requests in flight at once would both read as five.
func (h *Handler) createGuess(ctx context.Context, game Game, userID, word string) (Game, error) {
	if game.Status != StatusActive {
		return Game{}, errGameNotActive
	}
	if !ValidGuess(word, game.WordLength) {
		return Game{}, errBadGuess
	}

	err := h.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var round Round
		err := tx.Where("game_id = ?", game.ID).Order("number DESC").First(&round).Error
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			// An active game always has a round. If it somehow doesn't, there is
			// nothing to guess against, which is the same answer as a finished one.
			return errGameNotActive
		case err != nil:
			return err
		}

		var mine []Guess
		if err := tx.Where("round_id = ? AND user_id = ?", round.ID, userID).
			Order("number").Find(&mine).Error; err != nil {
			return err
		}

		if len(mine) >= MaxGuesses {
			return errOutOfGuesses
		}
		for _, previous := range mine {
			if previous.Word == round.Word {
				// Already found it. The round is over for this player whatever the
				// game as a whole is still doing.
				return errGameNotActive
			}
			if previous.Word == word {
				return errAlreadyGuessed
			}
		}

		number := len(mine) + 1
		if err := tx.Create(&Guess{
			RoundID: round.ID,
			UserID:  userID,
			Number:  number,
			Word:    word,
		}).Error; err != nil {
			return err
		}

		solved := word == round.Word

		// Scored against what this player already knew, which is why `mine` had to
		// be read inside the transaction: the same guess is worth more or less
		// depending on which guess of theirs it is.
		if points := ScoreGuess(word, round.Word, guessWords(mine)); points > 0 {
			if err := tx.Model(&Player{}).
				Where("game_id = ? AND user_id = ?", game.ID, userID).
				Update("score", gorm.Expr("score + ?", points)).Error; err != nil {
				return err
			}
		}

		updates := map[string]any{"version": gorm.Expr("version + 1")}
		// A solo game is over the moment its only player is: they found the word,
		// or they have just spent the last guess. A multiplayer game is not —
		// everyone else is still playing — so it stays open on its own clock.
		if game.Mode == ModeSolo && (solved || number >= MaxGuesses) {
			updates["status"] = StatusFinished
		}

		return tx.Model(&Game{}).Where("id = ?", game.ID).Updates(updates).Error
	})
	if err != nil {
		return Game{}, err
	}

	return h.loadGame(ctx, game.ID)
}

// finishIfExpired closes a game whose clock has run out.
//
// Nothing sweeps games in the background, so expiry is settled on read: whoever
// looks next is the one who writes it down. Solo games have no deadline, so for
// them this never fires.
func (h *Handler) finishIfExpired(ctx context.Context, game Game) (Game, error) {
	if game.Status != StatusActive || !game.HasExpired(time.Now()) {
		return game, nil
	}

	err := h.DB.WithContext(ctx).Model(&Game{}).
		Where("id = ? AND status = ?", game.ID, StatusActive).
		Updates(map[string]any{
			"status":  StatusFinished,
			"version": gorm.Expr("version + 1"),
		}).Error
	if err != nil {
		return Game{}, err
	}

	return h.loadGame(ctx, game.ID)
}

func (h *Handler) loadGame(ctx context.Context, gameID string) (Game, error) {
	var game Game
	err := h.DB.WithContext(ctx).Where("id = ?", gameID).First(&game).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return Game{}, errGameNotFound
	}
	return game, err
}

// loadGameForPlayer reads a game the caller is actually in.
//
// Being in it is the whole of the permission model: there is nothing to see in
// a game you are not playing, and a solo game has exactly one player.
func (h *Handler) loadGameForPlayer(ctx context.Context, gameID, userID string) (Game, error) {
	if gameID == "" {
		return Game{}, errGameNotFound
	}

	game, err := h.loadGame(ctx, gameID)
	if err != nil {
		return Game{}, err
	}

	var players int64
	if err := h.DB.WithContext(ctx).Model(&Player{}).
		Where("game_id = ? AND user_id = ?", gameID, userID).
		Count(&players).Error; err != nil {
		return Game{}, err
	}
	if players == 0 {
		// Deliberately the same answer as a game that does not exist: whether an
		// id is real is not something a stranger gets to find out by asking.
		return Game{}, errGameNotFound
	}

	return game, nil
}

func writeGameError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errGameNotFound):
		http.Error(w, "Game not found", http.StatusNotFound)
	case errors.Is(err, errBadGuess):
		http.Error(w, "Guess does not fit this game", http.StatusBadRequest)
	case errors.Is(err, errGameNotActive):
		http.Error(w, "Game is not accepting guesses", http.StatusConflict)
	case errors.Is(err, errAlreadyGuessed):
		http.Error(w, "Word already guessed this round", http.StatusConflict)
	case errors.Is(err, errOutOfGuesses):
		http.Error(w, "No guesses left", http.StatusConflict)
	default:
		http.Error(w, "Could not load game", http.StatusInternalServerError)
	}
}

func determineTotalRounds(nPlayers uint8) uint8 {
	switch {
	case nPlayers <= 1:
		return 4
	case nPlayers == 2 || nPlayers == 3:
		return 6
	case nPlayers > 3 && nPlayers < 5:
		return nPlayers * 2
	default:
		return nPlayers * 1 // 1 per player
	}
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
	if game.HasExpired(time.Now()) || game.Status == StatusFinished || containsSolution(out.Guesses, round.Word) {
		out.Word = round.Word
	}

	return out, nil
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
	Number    int       `json:"number"`
	StartedAt time.Time `json:"startedAt"`

	// Absent on an untimed round, which is every solo one.
	EndsAt  *time.Time      `json:"endsAt,omitempty"`
	Guesses []GuessResponse `json:"guesses"`

	// Empty while the round is still winnable. See roundResponse.
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

// Request data
type createGameRequest struct {
	Mode       string `json:"mode"`
	Language   string `json:"language"`
	WordLength int    `json:"wordLength"`
}

type createGuessRequest struct {
	Word string `json:"word"`
}

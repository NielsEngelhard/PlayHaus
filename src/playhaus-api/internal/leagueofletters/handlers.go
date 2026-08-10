package leagueofletters

import (
	"errors"
	"net/http"

	"playhausapi/internal/authctx"
	"playhausapi/internal/database"
	"playhausapi/internal/httpjson"
)

// Handler is the HTTP surface of the game. It decodes, delegates, and maps
// errors onto statuses — every decision worth making happens in Service.
type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// New wires the whole package together for a caller that just wants routes.
func New(db *database.DB) *Handler {
	return NewHandler(NewService(NewStore(db)))
}

// CreateGame starts a game. Must be wrapped in RequireAuth.
func (h *Handler) CreateGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		httpjson.WriteUnauthorized(w)
		return
	}

	var req createGameRequest
	if err := httpjson.Decode(w, r, &req); err != nil {
		httpjson.WriteDecodeError(w, err)
		return
	}

	response, err := h.svc.CreateGame(r.Context(), userID, NewGame{
		Mode:       req.Mode,
		Language:   req.Language,
		WordLength: req.WordLength,
	})
	if err != nil {
		writeError(w, r, err)
		return
	}

	httpjson.Write(w, http.StatusCreated, response)
}

// GetGame reads a game back. Must be wrapped in RequireAuth.
func (h *Handler) GetGame(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		httpjson.WriteUnauthorized(w)
		return
	}

	response, err := h.svc.GameView(r.Context(), r.PathValue("id"), userID)
	if err != nil {
		writeError(w, r, err)
		return
	}

	httpjson.Write(w, http.StatusOK, response)
}

// CreateGuess records a guess. Must be wrapped in RequireAuth.
func (h *Handler) CreateGuess(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		httpjson.WriteUnauthorized(w)
		return
	}

	var req createGuessRequest
	if err := httpjson.Decode(w, r, &req); err != nil {
		httpjson.WriteDecodeError(w, err)
		return
	}

	response, err := h.svc.Guess(r.Context(), r.PathValue("id"), userID, req.Word)
	if err != nil {
		writeError(w, r, err)
		return
	}

	httpjson.Write(w, http.StatusCreated, response)
}

// writeError is the one place a game rule becomes a status code. Each error
// carries a stable code so the app can react to "out of guesses" differently
// from "not your game" without matching on prose.
func writeError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, errGameNotFound):
		httpjson.WriteError(w, http.StatusNotFound, "GAME_NOT_FOUND", "Game not found")
	case errors.Is(err, errUnknownMode):
		httpjson.WriteError(w, http.StatusBadRequest, "UNKNOWN_MODE", "Unknown game mode")
	case errors.Is(err, errUnsupportedLanguage):
		httpjson.WriteError(w, http.StatusBadRequest, "UNSUPPORTED_LANGUAGE", "Unsupported language")
	case errors.Is(err, errUnsupportedLength):
		httpjson.WriteError(w, http.StatusBadRequest, "UNSUPPORTED_WORD_LENGTH", "Unsupported word length")
	case errors.Is(err, errBadGuess):
		httpjson.WriteError(w, http.StatusBadRequest, "BAD_GUESS", "Guess does not fit this game")
	case errors.Is(err, errGameNotActive):
		httpjson.WriteError(w, http.StatusConflict, "GAME_NOT_ACTIVE", "Game is not accepting guesses")
	case errors.Is(err, errAlreadyGuessed):
		httpjson.WriteError(w, http.StatusConflict, "ALREADY_GUESSED", "Word already guessed this round")
	case errors.Is(err, errOutOfGuesses):
		httpjson.WriteError(w, http.StatusConflict, "OUT_OF_GUESSES", "No guesses left")
	default:
		httpjson.WriteInternal(w, r, err, "Could not load game")
	}
}

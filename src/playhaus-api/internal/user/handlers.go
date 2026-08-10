package user

import (
	"errors"
	"net/http"
	"strconv"

	"playhausapi/internal/authctx"
	"playhausapi/internal/database"
	"playhausapi/internal/httpjson"
	"playhausapi/internal/password"
)

// Paging limits for the account list.
const (
	defaultPageSize = 50
	maxPageSize     = 100
)

type Handler struct{ store *Store }

func NewHandler(store *Store) *Handler { return &Handler{store: store} }

func New(db *database.DB) *Handler { return NewHandler(NewStore(db)) }

// CreateUser registers a real account: a name, an address to recover it with,
// and a password.
//
// It cannot create a guest. Guests are minted by POST /guest, which also issues
// their session — the only thing that ever makes one usable. When this endpoint
// took an isGuestAccount flag from the request body, anyone could create a
// passwordless account holding somebody else's email address, and because a
// passwordless account can never log in, that address was then unusable by the
// person it belonged to.
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := httpjson.Decode(w, r, &req); err != nil {
		httpjson.WriteDecodeError(w, err)
		return
	}

	name, err := ValidateName(req.Name)
	if err != nil {
		writeValidationError(w, err)
		return
	}

	email, err := NormalizeEmail(req.Email)
	if err != nil {
		writeValidationError(w, err)
		return
	}

	hashed, err := password.Hash(req.Password)
	if err != nil {
		writeValidationError(w, err)
		return
	}

	account := AppUser{Name: name, Email: &email, PasswordHash: &hashed}

	if err := h.store.Create(r.Context(), &account); err != nil {
		if errors.Is(err, ErrEmailTaken) {
			httpjson.WriteError(w, http.StatusConflict, "EMAIL_IN_USE", "Email already in use")
			return
		}
		httpjson.WriteInternal(w, r, err, "Could not create user")
		return
	}

	httpjson.Write(w, http.StatusCreated, NewSelfResponse(account))
}

// UpdateProfile changes the signed-in account's profile: name, avatar colour,
// preferences.
//
// Every field is optional — the app saves a single toggle far more often than it
// saves the whole page — so the request uses pointers and only what was sent is
// written. Whose profile it is comes from the session, never from the body: an
// id in the body would let anyone edit anyone.
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		httpjson.WriteUnauthorized(w)
		return
	}

	var req updateProfileRequest
	if err := httpjson.Decode(w, r, &req); err != nil {
		httpjson.WriteDecodeError(w, err)
		return
	}

	changes := map[string]any{}

	if req.Name != nil {
		name, err := ValidateName(*req.Name)
		if err != nil {
			writeValidationError(w, err)
			return
		}
		changes["name"] = name
	}

	if req.AvatarColorID != nil {
		if !IsAvatarColorID(*req.AvatarColorID) {
			httpjson.WriteError(w, http.StatusBadRequest, "UNKNOWN_AVATAR_COLOR", "Unknown avatar colour")
			return
		}
		changes["avatar_color_id"] = *req.AvatarColorID
	}

	if req.SoundEnabled != nil {
		changes["sound_enabled"] = *req.SoundEnabled
	}
	if req.VibrationEnabled != nil {
		changes["vibration_enabled"] = *req.VibrationEnabled
	}

	// An empty body is not an error, it just has nothing to write — the store
	// skips the update and the current profile still comes back.
	if err := h.store.UpdateProfile(r.Context(), userID, changes); err != nil {
		httpjson.WriteInternal(w, r, err, "Could not update profile")
		return
	}

	// Read back rather than echoing the request: the response is the profile as
	// it now stands, which is what the app replaces its state with.
	account, err := h.store.ByID(r.Context(), userID)
	switch {
	case errors.Is(err, ErrNotFound):
		// The session outlived the account it points at.
		httpjson.WriteUnauthorized(w)
		return
	case err != nil:
		httpjson.WriteInternal(w, r, err, "Could not load user")
		return
	}

	httpjson.Write(w, http.StatusOK, NewSelfResponse(account))
}

// ListUsers returns a page of accounts as PublicResponse — no email addresses.
//
// It used to return every row in the table including every address, to any
// caller holding a session, and a session costs nothing: POST /guest issues one
// to anybody who asks. That made the whole account table, addresses included,
// public in everything but name.
//
// Nothing in the app calls this. It is kept because it is useful to have while
// building; if that stops being true, delete it rather than leaving a listing
// endpoint lying around.
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit := intParam(r, "limit", defaultPageSize, 1, maxPageSize)
	offset := intParam(r, "offset", 0, 0, 1<<30)

	accounts, err := h.store.List(r.Context(), limit, offset)
	if err != nil {
		httpjson.WriteInternal(w, r, err, "Could not list users")
		return
	}

	out := make([]PublicResponse, 0, len(accounts))
	for _, account := range accounts {
		out = append(out, NewPublicResponse(account))
	}

	httpjson.Write(w, http.StatusOK, listResponse[PublicResponse]{Data: out})
}

// intParam reads a bounded integer query parameter, falling back to a default
// rather than erroring: a nonsense ?limit= is not worth failing a request over.
func intParam(r *http.Request, name string, fallback, minimum, maximum int) int {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}

	return min(max(value, minimum), maximum)
}

func writeValidationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrNameRequired):
		httpjson.WriteError(w, http.StatusBadRequest, "NAME_REQUIRED", "Name cannot be empty")
	case errors.Is(err, ErrNameTooLong):
		httpjson.WriteError(w, http.StatusBadRequest, "NAME_TOO_LONG", "Name is too long")
	case errors.Is(err, ErrEmailInvalid):
		httpjson.WriteError(w, http.StatusBadRequest, "EMAIL_INVALID", "Email is not a valid address")
	case errors.Is(err, password.ErrTooShort):
		httpjson.WriteError(w, http.StatusBadRequest, "PASSWORD_TOO_SHORT",
			"Password must be at least "+strconv.Itoa(password.MinLength)+" characters")
	case errors.Is(err, password.ErrTooLong):
		httpjson.WriteError(w, http.StatusBadRequest, "PASSWORD_TOO_LONG", "Password is too long")
	default:
		httpjson.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Request is not valid")
	}
}

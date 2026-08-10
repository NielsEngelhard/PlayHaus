// Package httpjson reads and writes the JSON envelopes this API speaks.
//
// Every response — success or failure — leaves through here, so a client only
// ever has to parse one content type. Errors carry a stable machine-readable
// code alongside the human sentence, because "no guesses left" and "game is
// over" want different treatment in the UI and prose is a bad way to tell them
// apart.
package httpjson

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

// MaxBodyBytes caps how much of a request body will be read. Nothing this API
// accepts is close to it; the limit exists so an unbounded upload cannot hold
// a connection (and, with SQLite's single writer, the whole server) hostage.
const MaxBodyBytes = 1 << 20 // 1 MiB

// Write sends v as a JSON response body with the given status code.
func Write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// The status line is already on the wire, so there is no way to turn this
		// into an error response. All that is left is to record it.
		slog.Error("write json response", "error", err)
	}
}

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	// Code is stable across releases and safe to branch on. Message is for
	// people and may be reworded at any time.
	Code    string `json:"code"`
	Message string `json:"message"`
}

// WriteError sends a JSON error response.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	Write(w, status, errorEnvelope{Error: errorBody{Code: code, Message: message}})
}

// Error codes that any handler may produce.
const (
	CodeBadJSON      = "BAD_JSON"
	CodeBodyTooLarge = "BODY_TOO_LARGE"
	CodeUnauthorized = "UNAUTHORIZED"
	CodeInternal     = "INTERNAL"
)

// WriteUnauthorized is the one 401 body the whole API uses, so a failure to
// authenticate never reveals which part of the credential was wrong.
func WriteUnauthorized(w http.ResponseWriter) {
	WriteError(w, http.StatusUnauthorized, CodeUnauthorized, "Authentication required")
}

// WriteInternal reports a fault to the client without describing it. The detail
// goes to the log, where it is useful, rather than to the caller, where it is
// only a hint about the internals.
func WriteInternal(w http.ResponseWriter, r *http.Request, err error, message string) {
	slog.Error("request failed",
		"method", r.Method,
		"path", r.URL.Path,
		"error", err,
	)
	WriteError(w, http.StatusInternalServerError, CodeInternal, message)
}

var (
	// ErrEmptyBody means the body was empty. Decode treats that as an error and
	// DecodeOptional does not.
	ErrEmptyBody = errors.New("empty request body")

	// ErrBadJSON means the body was present but not decodable into the target.
	ErrBadJSON = errors.New("malformed JSON body")

	// ErrBodyTooLarge means the body ran past MaxBodyBytes.
	ErrBodyTooLarge = errors.New("request body too large")
)

// Decode reads a JSON request body into dst, requiring a body to be present.
//
// Unknown fields are deliberately ignored rather than rejected: a mobile client
// cannot be updated in lockstep with the server, so a field added by a newer
// build must not turn every request from an older one into a 400.
func Decode(w http.ResponseWriter, r *http.Request, dst any) error {
	return decode(w, r, dst, false)
}

// DecodeOptional is Decode for endpoints where an empty body is meaningful —
// it means "no fields given", not "malformed request".
func DecodeOptional(w http.ResponseWriter, r *http.Request, dst any) error {
	return decode(w, r, dst, true)
}

func decode(w http.ResponseWriter, r *http.Request, dst any, allowEmpty bool) error {
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)

	err := json.NewDecoder(r.Body).Decode(dst)
	switch {
	case err == nil:
		return nil
	case errors.Is(err, io.EOF):
		if allowEmpty {
			return nil
		}
		return ErrEmptyBody
	}

	if _, ok := errors.AsType[*http.MaxBytesError](err); ok {
		return ErrBodyTooLarge
	}

	// Wrapped so a handler can still match on ErrBadJSON while the detail stays
	// available for logging.
	return fmt.Errorf("%w: %v", ErrBadJSON, err)
}

// WriteDecodeError turns any error from Decode into the matching response.
func WriteDecodeError(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrBodyTooLarge) {
		WriteError(w, http.StatusRequestEntityTooLarge, CodeBodyTooLarge, "Request body is too large")
		return
	}
	WriteError(w, http.StatusBadRequest, CodeBadJSON, "Request body is not valid JSON")
}

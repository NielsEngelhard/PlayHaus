package httpx

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const maxBodyBytes = 1 << 20 // 1 MB

// Decode reads a JSON body into dst. The error message is safe to
// return to the client — it never leaks internals.
func Decode(w http.ResponseWriter, r *http.Request, dst any) error {
	if ct := r.Header.Get("Content-Type"); ct != "" {
		if mt := strings.TrimSpace(strings.Split(ct, ";")[0]); mt != "application/json" {
			return fmt.Errorf("Content-Type must be application/json")
		}
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return decodeError(err)
	}

	// Reject trailing content: {"a":1}{"b":2} must not silently pass.
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return fmt.Errorf("body must contain a single JSON object")
	}

	return nil
}

// decodeError turns encoding/json's errors into messages a client can act
// on. Anything unrecognised collapses to a generic string rather than
// echoing the decoder's internals back over the wire.
func decodeError(err error) error {
	var (
		syntaxErr    *json.SyntaxError
		unmarshalErr *json.UnmarshalTypeError
		maxBytesErr  *http.MaxBytesError
	)

	switch {
	case errors.As(err, &syntaxErr):
		return fmt.Errorf("body contains malformed JSON at position %d", syntaxErr.Offset)

	case errors.Is(err, io.ErrUnexpectedEOF):
		return fmt.Errorf("body contains malformed JSON")

	case errors.As(err, &unmarshalErr):
		if unmarshalErr.Field != "" {
			return fmt.Errorf("field %q has the wrong type", unmarshalErr.Field)
		}

		return fmt.Errorf("body contains a value of the wrong type")

	case errors.Is(err, io.EOF):
		return fmt.Errorf("body must not be empty")

	case errors.As(err, &maxBytesErr):
		return fmt.Errorf("body must be smaller than %d bytes", maxBytesErr.Limit)

	// DisallowUnknownFields has no typed error, only this prefix.
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		name := strings.TrimPrefix(err.Error(), "json: unknown field ")

		return fmt.Errorf("body contains unknown field %s", name)

	default:
		return fmt.Errorf("body could not be decoded")
	}
}

// WriteJSON sends body as JSON with the given status.
func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

// WriteError sends an error response. The message goes in a "title" field,
// which is the shape the app's api client reads errors from.
func WriteError(w http.ResponseWriter, status int, title string) {
	WriteJSON(w, status, map[string]string{"title": title})
}

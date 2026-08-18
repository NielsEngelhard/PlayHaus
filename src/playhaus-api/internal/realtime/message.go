// Package realtime is the socket layer every game in this API shares.
//
// It knows nothing about any particular game. A game registers a Handler under a
// namespace, players connect to a room inside that namespace, and the handler is
// told when somebody arrives, says something, or goes. Everything specific -- what
// a room means, what a message is allowed to do, what is broadcast back -- lives in
// the handler, which is why League of Letters and, later, PubquizR can share this
// without either of them appearing in it.
package realtime

import (
	"encoding/json"
	"fmt"
)

// Envelope is every frame on the wire, in both directions. One outer shape with a
// tag and an opaque body, so a handler can add a message type without this package
// learning about it and without an old client choking on the ones it does not know.
type Envelope struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// Message builds an envelope around anything that marshals.
//
// A payload that will not marshal is a programming error rather than a runtime
// condition -- the payloads are all structs this codebase owns -- so it comes back
// as an envelope carrying the failure instead of an error nobody would handle. The
// client sees a frame it cannot read; the server log gets the reason.
func Message(typ string, data any) Envelope {
	if data == nil {
		return Envelope{Type: typ}
	}

	encoded, err := json.Marshal(data)
	if err != nil {
		return Envelope{
			Type: TypeError,
			Data: json.RawMessage(fmt.Sprintf(`{"message":%q}`, "could not encode "+typ)),
		}
	}

	return Envelope{Type: typ, Data: encoded}
}

// Into unmarshals an envelope's body. The zero value of T is returned alongside the
// error, so a caller that ignores malformed input can do so in one line.
func Into[T any](env Envelope) (T, error) {
	var v T
	if len(env.Data) == 0 {
		return v, nil
	}
	if err := json.Unmarshal(env.Data, &v); err != nil {
		return v, fmt.Errorf("decode %s payload: %w", env.Type, err)
	}
	return v, nil
}

// TypeError is the one message type this package sends on its own behalf: a room it
// would not let someone into, a frame it could not read. Handlers use it too.
const TypeError = "error"

// Errorf is the refusal frame, formatted.
func Errorf(format string, args ...any) Envelope {
	return Message(TypeError, map[string]string{"message": fmt.Sprintf(format, args...)})
}

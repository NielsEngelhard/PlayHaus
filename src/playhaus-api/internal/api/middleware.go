package api

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"slices"
	"time"

	"playhaus-api/internal/auth"

	"github.com/google/uuid"
)

type middleware func(http.Handler) http.Handler

func chain(h http.Handler, mws ...middleware) http.Handler {
	for _, mw := range slices.Backward(mws) {
		h = mw(h)
	}
	return h
}

// ctxKey is an unexported type so no other package can collide with our keys,
// which is why a context.WithValue key should never be a plain string.
type ctxKey int

const (
	requestIDKey ctxKey = iota
	userIDKey
)

// RequestIDFrom returns the id assigned to r by the requestID middleware.
func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// UserIDFrom returns the authenticated user's id. ok is false on requests that
// did not pass through requireAuth, so a handler can never mistake "anonymous"
// for a user whose id happens to be the empty string.
//
// This is how a handler learns who is calling: the id comes from the session
// token in the Authorization header, never from the request body, so a client
// cannot claim to be someone else.
func UserIDFrom(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDKey).(string)
	return id, ok
}

// requestID assigns every request an id, echoes it back on the response, and
// makes it available to downstream handlers through the context.
func requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = uuid.NewString()
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
	})
}

// requireAuth rejects requests without a valid, unexpired session and puts the
// authenticated user's id on the request context for the wrapped handler.
//
// It wraps a single handler rather than sitting in the global chain because
// most routes need it and a few -- signup, guest, login -- must not: those are
// how a caller gets a token in the first place.
//
//	s.mux.HandleFunc("GET /api/v1/me", s.requireAuth(s.handleMe))
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := s.auth.Authenticate(r.Context(), auth.BearerToken(r))
		switch {
		case errors.Is(err, auth.ErrInvalidSession):
			writeError(w, http.StatusUnauthorized, "invalid or expired session")
			return
		case err != nil:
			s.log.Error("authenticate", "err", err, "request_id", RequestIDFrom(r.Context()))
			writeError(w, http.StatusInternalServerError, "something went wrong")
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next(w, r.WithContext(ctx))
	}
}

// statusRecorder remembers the status code so logRequests can report it.
type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (rec *statusRecorder) WriteHeader(status int) {
	rec.status = status
	rec.ResponseWriter.WriteHeader(status)
}

func (rec *statusRecorder) Write(b []byte) (int, error) {
	if rec.status == 0 {
		rec.status = http.StatusOK
	}
	n, err := rec.ResponseWriter.Write(b)
	rec.bytes += n
	return n, err
}

func logRequests(log *slog.Logger) middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w}

			next.ServeHTTP(rec, r)

			if rec.status == 0 {
				rec.status = http.StatusOK // handler wrote nothing at all
			}
			log.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", rec.status,
				"bytes", rec.bytes,
				"duration", time.Since(start),
				"request_id", RequestIDFrom(r.Context()),
			)
		})
	}
}

// recoverPanic keeps one bad handler from taking down the whole process.
func recoverPanic(log *slog.Logger) middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if v := recover(); v != nil {
					// Let the http package deal with a client that hung up.
					if v == http.ErrAbortHandler {
						panic(v)
					}
					log.Error("panic recovered",
						"err", v,
						"method", r.Method,
						"path", r.URL.Path,
						"request_id", RequestIDFrom(r.Context()),
					)
					w.Header().Set("Connection", "close")
					writeError(w, http.StatusInternalServerError, "something went wrong")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

package auth

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"playhausapi/internal/authctx"
	"playhausapi/internal/httpjson"
)

// RequireAuth rejects requests without a valid, unexpired session and puts the
// authenticated user's ID on the request context for the wrapped handler.
//
//	mux.HandleFunc("GET /api/v1/users", a.RequireAuth(h.ListUsers))
func (h *Handler) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := sessionToken(r)
		if token == "" {
			httpjson.WriteUnauthorized(w)
			return
		}

		session, err := h.sessions.ByTokenHash(r.Context(), hashToken(token))
		switch {
		case errors.Is(err, ErrNotFound):
			// The token references a session that no longer exists, e.g. after
			// logging out on another device. Clear the stale cookie.
			h.clearSessionCookie(w)
			httpjson.WriteUnauthorized(w)
			return
		case err != nil:
			httpjson.WriteInternal(w, r, err, "Could not verify session")
			return
		}

		if time.Now().After(session.ExpiresAt) {
			// Drop the row now rather than leaving it for the sweeper. Failing to
			// delete it does not change the answer — the session is expired either
			// way — so this is logged rather than returned.
			if err := h.sessions.DeleteByID(r.Context(), session.ID); err != nil {
				slog.Warn("delete expired session", "session_id", session.ID, "error", err)
			}
			h.clearSessionCookie(w)
			httpjson.WriteUnauthorized(w)
			return
		}

		ctx := authctx.WithUserID(r.Context(), session.UserID)
		next(w, r.WithContext(ctx))
	}
}

// DeleteExpiredSessions removes sessions past their expiry. Expired sessions
// are already rejected by RequireAuth; this just stops the table growing
// forever.
func (h *Handler) DeleteExpiredSessions(ctx context.Context) (int64, error) {
	return h.sessions.DeleteExpired(ctx, time.Now())
}

// SweepExpiredSessions runs DeleteExpiredSessions on a ticker until ctx is
// cancelled. Intended to be started in its own goroutine at boot.
//
// A goroutine rather than a cron entry because it is the only background job
// this API has, and one that must not outlive the process it belongs to: on
// shutdown the context is cancelled and the sweep stops with everything else.
func (h *Handler) SweepExpiredSessions(ctx context.Context, every time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			deleted, err := h.DeleteExpiredSessions(ctx)
			if err != nil {
				slog.Error("sweep expired sessions", "error", err)
				continue
			}
			if deleted > 0 {
				slog.Info("swept expired sessions", "deleted", deleted)
			}
		}
	}
}

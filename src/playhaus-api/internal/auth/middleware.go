package auth

import (
	"context"
	"errors"
	"net/http"
	"time"

	"playhausapi/internal/authctx"

	"gorm.io/gorm"
)

// RequireAuth rejects requests without a valid, unexpired session and puts the
// authenticated user's ID on the request context for the wrapped handler.
//
//	mux.HandleFunc("GET /api/v1/users", a.RequireAuth(h.GetUsersHandler))
func (h *Handler) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil || cookie.Value == "" {
			unauthenticated(w)
			return
		}

		var session Session
		err = h.DB.WithContext(r.Context()).
			Where("token_hash = ?", hashToken(cookie.Value)).
			First(&session).Error

		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			// Cookie references a session that no longer exists, e.g. after
			// logging out on another device. Clear the stale cookie.
			h.clearSessionCookie(w)
			unauthenticated(w)
			return
		case err != nil:
			http.Error(w, "Could not verify session", http.StatusInternalServerError)
			return
		}

		if time.Now().After(session.ExpiresAt) {
			// Drop the row now rather than leaving it for the sweeper.
			h.DB.WithContext(r.Context()).Delete(&Session{}, "id = ?", session.ID)
			h.clearSessionCookie(w)
			unauthenticated(w)
			return
		}

		ctx := authctx.WithUserID(r.Context(), session.UserID)
		next(w, r.WithContext(ctx))
	}
}

// DeleteExpiredSessions removes sessions past their expiry. Expired sessions
// are already rejected by RequireAuth; this just stops the table growing
// forever. Call it periodically from a goroutine or a cron job.
func (h *Handler) DeleteExpiredSessions(ctx context.Context) (int64, error) {
	res := h.DB.WithContext(ctx).
		Where("expires_at < ?", time.Now()).
		Delete(&Session{})
	return res.RowsAffected, res.Error
}

func unauthenticated(w http.ResponseWriter) {
	http.Error(w, "Authentication required", http.StatusUnauthorized)
}

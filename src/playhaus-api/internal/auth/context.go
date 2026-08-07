package auth

import (
	"context"

	"github.com/google/uuid"
)

// contextKey is unexported so no other package can write an identity into
// the context -- WithUserID is the only way in.
type contextKey struct{}

var userIDKey contextKey

// WithUserID returns a copy of ctx carrying the authenticated user's id.
// Only the middleware that verified the request should call this.
func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, id)
}

// UserIDFromContext returns the authenticated user's id. ok is false when
// the request never passed through authentication, which handlers must treat
// as unauthenticated rather than as a missing user.
func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)

	return id, ok
}

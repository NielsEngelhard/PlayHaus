// Package authctx carries the authenticated user's ID on a request context.
//
// It deliberately holds only the ID and imports no other internal package.
// The auth package already imports user, so if this stored a full
// user.AppUser then user could not read it back without creating an import
// cycle. Handlers that need the whole record load it from the DB.
package authctx

import "context"

// contextKey is an unexported type so no other package can collide with our
// key, which is why context.WithValue keys should never be plain strings.
type contextKey struct{}

var userIDKey contextKey

func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// UserID returns the authenticated user's ID. ok is false on requests that
// did not pass through auth middleware.
func UserID(ctx context.Context) (userID string, ok bool) {
	id, ok := ctx.Value(userIDKey).(string)
	return id, ok
}

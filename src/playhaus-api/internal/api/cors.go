package api

import (
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"
)

// AnyOrigin allows every origin. Sessions are bearer tokens rather than
// cookies, so a wildcard here hands out nothing on its own -- a browser still
// has to have been given a token to send one. Convenient in development;
// deployments should name their origins.
const AnyOrigin = "*"

// preflightMaxAge is how long a browser may cache the answer to an OPTIONS
// preflight. Ten minutes is long enough that a page does not preflight every
// call and short enough that a config change is picked up in one coffee break.
const preflightMaxAge = 10 * time.Minute

// allowedRequestHeaders is what the app actually sends: JSON bodies, the
// session's bearer token, and the request id when it wants a call traceable.
var allowedRequestHeaders = strings.Join([]string{
	"Content-Type",
	"Authorization",
	"X-Request-Id",
}, ", ")

var allowedMethods = strings.Join([]string{
	http.MethodGet,
	http.MethodPost,
	http.MethodPut,
	http.MethodPatch,
	http.MethodDelete,
	http.MethodOptions,
}, ", ")

// cors answers the browser's same-origin questions for the Expo web build,
// which runs on its own dev-server port and so is cross-origin to this API.
// Native builds never send an Origin header and pass straight through.
//
// An empty origins list turns the whole thing off: no headers are added and
// preflights are left to fall through to the mux, which is the right shape for
// a deployment that only serves the native app.
func cors(origins []string) middleware {
	return func(next http.Handler) http.Handler {
		if len(origins) == 0 {
			return next
		}

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// The response differs by origin, so a cache must key on it -- set
			// even when the origin is refused, since the refusal is itself an
			// origin-specific answer.
			w.Header().Add("Vary", "Origin")

			if origin == "" || !originAllowed(origins, origin) {
				// Not a browser, or not one we answer to. Either way there is
				// nothing to add: without the header the browser refuses the
				// response on its own, which is exactly the intended outcome.
				next.ServeHTTP(w, r)
				return
			}

			// Echo the origin rather than "*" even for AnyOrigin: it keeps the
			// response valid if credentials are ever turned on, and it is what
			// a proxy in front of this needs to cache correctly.
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-Id")

			// A preflight is answered here and never reaches the mux -- no route
			// is registered for OPTIONS, so falling through would 405 the very
			// request that is asking whether the real call is allowed.
			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				w.Header().Set("Access-Control-Allow-Methods", allowedMethods)
				w.Header().Set("Access-Control-Allow-Headers", allowedRequestHeaders)
				w.Header().Set("Access-Control-Max-Age", strconv.Itoa(int(preflightMaxAge.Seconds())))
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// originAllowed reports whether origin is one we answer to. Matching is exact
// -- scheme, host and port -- because that is what the browser sends and what
// the Origin header means.
func originAllowed(allowed []string, origin string) bool {
	return slices.Contains(allowed, AnyOrigin) || slices.Contains(allowed, origin)
}

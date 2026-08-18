package api

import (
	"errors"
	"net/http"
	"time"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/realtime"

	"github.com/coder/websocket"
)

// handleWebSocket upgrades a request into a room connection.
//
// Registered without requireAuth because it has to do its own. A browser's
// WebSocket constructor cannot set an Authorization header -- it takes a URL and
// nothing else -- so the session token comes in on the query string instead, and
// native clients that can send the header still may. Either way it is the same
// token, resolved by the same Authenticate, so a socket is exactly as easy or hard
// to forge as any other call.
//
// The query string is not written to the log: logRequests records r.URL.Path.
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID, err := s.auth.Authenticate(r.Context(), socketToken(r))
	switch {
	case errors.Is(err, auth.ErrInvalidSession):
		writeError(w, http.StatusUnauthorized, "invalid or expired session")
		return
	case err != nil:
		s.log.Error("authenticate socket", "err", err, "request_id", RequestIDFrom(r.Context()))
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	key, err := realtime.ParseKey(r.URL.Query().Get("room"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "room must be namespace:id")
		return
	}

	// The server's own read and write timeouts would cut a socket off after fifteen
	// seconds, which is what they are for on a request that is supposed to end. This
	// one is not, so they are cleared before the connection is taken over. Without
	// this every room would drop and reconnect four times a minute.
	rc := http.NewResponseController(w)
	if err := rc.SetReadDeadline(time.Time{}); err != nil {
		s.log.Error("clear socket read deadline", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}
	if err := rc.SetWriteDeadline(time.Time{}); err != nil {
		s.log.Error("clear socket write deadline", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		// The same list CORS answers to. A native client sends no Origin at all and
		// is waved through, exactly as it is on the HTTP routes.
		OriginPatterns:     s.allowedOrigins,
		InsecureSkipVerify: s.anyOriginAllowed,
	})
	if err != nil {
		// The handshake failed, which means the response is already spoken for.
		s.log.Debug("websocket handshake", "err", err, "room", key.String())
		return
	}
	defer conn.CloseNow()

	// Blocks for the whole life of the connection.
	if err := s.rt.Serve(r.Context(), key, userID, conn); err != nil {
		s.log.Debug("websocket closed", "err", err, "room", key.String(), "user", userID)
	}
}

// socketToken reads the session token, preferring the header when there is one.
func socketToken(r *http.Request) string {
	if token := auth.BearerToken(r); token != "" {
		return token
	}
	return r.URL.Query().Get("token")
}

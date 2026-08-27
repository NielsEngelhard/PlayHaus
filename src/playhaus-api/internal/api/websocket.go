package api

import (
	"errors"
	"net/http"
	"time"

	"playhaus-api/internal/auth"
	"playhaus-api/internal/joincode"
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

	// A room in a game's namespace is named by a join code, so the id has to be one --
	// for that game, and in the one spelling everything else compares it in.
	//
	// Namespaces that are not a game's are left alone: the hub refuses the ones nobody
	// has claimed, and a game whose rooms are named by something other than a code is
	// free to arrive here later without this having an opinion about it.
	//
	// The normalising is a fix rather than a tidy-up. ParseKey takes the id as written
	// while every publisher goes through its game's room key, which uppercases -- so a
	// client connecting to "lol:abcde" used to be put in a room of that exact name,
	// receive its state once on the way in, and then hear nothing ever again, because
	// nobody was publishing to a room spelled that way. Correctly connected to nothing
	// is the worst kind of broken: there is no error anywhere to find.
	//
	// The agreement check is the other half. Now that a code names its own game, a
	// namespace that disagrees with it is a client asking for a room that cannot exist,
	// and letting it in would recreate the same silence by a different route.
	if game := joincode.Game(key.Namespace); game.Valid() {
		named, code, err := joincode.Parse(key.ID)
		if err != nil || named != game {
			writeError(w, http.StatusBadRequest, "room is not a join code for that game")
			return
		}
		key.ID = code
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

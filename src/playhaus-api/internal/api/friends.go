package api

import (
	"context"
	"errors"
	"net/http"

	"playhaus-api/internal/fakefiller"
	"playhaus-api/internal/friend"
	"playhaus-api/internal/joincode"
	"playhaus-api/internal/lol"
	"playhaus-api/internal/oneofus"
	"playhaus-api/internal/pubquizr"
	"playhaus-api/internal/push"
	"playhaus-api/internal/realtime"
)

// friendResponse is deliberately the shape a lobby seat has, so a friend row and a player row are drawn by the same component.
type friendResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
	FriendsSince  string `json:"friendsSince"`
}

// inviteFromResponse is who sent it. The app has no user directory, so the name and swatch travel with the invite.
type inviteFromResponse struct {
	UserID        string `json:"userId"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
}

type inviteResponse struct {
	ID   string             `json:"id"`
	Code string             `json:"code"`
	Game string             `json:"game"`
	Kind string             `json:"kind"`
	From inviteFromResponse `json:"from"`
	// ExpiresAt lets the app drop a stale invite without asking again.
	ExpiresAt string `json:"expiresAt"`
	CreatedAt string `json:"createdAt"`
}

type createInviteRequest struct {
	Code   string `json:"code"`
	UserID string `json:"userId"`
}

func (r createInviteRequest) Validate() map[string]string {
	problems := map[string]string{}

	if !joincode.Valid(r.Code) {
		problems["code"] = "must be a join code"
	}
	if r.UserID == "" {
		problems["userId"] = "is required"
	}

	return problems
}

type seenInvitesRequest struct {
	IDs []string `json:"ids"`
}

func (r seenInvitesRequest) Validate() map[string]string {
	if len(r.IDs) == 0 {
		return map[string]string{"ids": "is required"}
	}
	return nil
}

func (s *Server) AddFriendHandlers() {
	s.mux.HandleFunc("GET /api/v1/friends", s.requireAuth(s.handleListFriends))
	s.mux.HandleFunc("GET /api/v1/friends/invites", s.requireAuth(s.handleListInvites))
	s.mux.HandleFunc("POST /api/v1/friends/invites", s.requireAuth(s.handleCreateInvite))
	s.mux.HandleFunc("POST /api/v1/friends/invites/seen", s.requireAuth(s.handleMarkInvitesSeen))
}

func (s *Server) handleListFriends(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleListFriends reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	rows, err := s.friends.List(r.Context(), userID)
	if err != nil {
		s.log.Error("list friends", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.FriendID)
	}
	users := s.usersByID(r.Context(), ids)

	friends := make([]friendResponse, 0, len(rows))
	for _, row := range rows {
		// A friend whose account has gone is dropped rather than drawn as a blank row.
		u, known := users[row.FriendID]
		if !known {
			continue
		}

		friends = append(friends, friendResponse{
			UserID:        row.FriendID,
			Name:          u.Name,
			AvatarColorID: u.Color,
			FriendsSince:  row.CreatedAt.Format(timeFormat),
		})
	}

	writeJSON(w, http.StatusOK, friends)
}

func (s *Server) handleListInvites(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleListInvites reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	invites, err := s.friends.Pending(r.Context(), userID)
	if err != nil {
		s.log.Error("list invites", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, s.newInviteResponses(r.Context(), invites))
}

func (s *Server) handleCreateInvite(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleCreateInvite reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, problems, err := decode[createInviteRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	game, code, err := joincode.Parse(req.Code)
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "lobby_not_found", "that room does not exist")
		return
	}

	room, err := s.inviteRoom(r.Context(), game, code)
	if err != nil {
		writeErrorCode(w, http.StatusNotFound, "lobby_not_found", "that room does not exist")
		return
	}

	// Being in the room is what makes this an invite rather than a way to message any user at all.
	if !room.has(userID) {
		writeErrorCode(w, http.StatusForbidden, "not_in_lobby", "you are not in that room")
		return
	}
	if room.has(req.UserID) {
		writeErrorCode(w, http.StatusConflict, "already_in_lobby", "they are already in that room")
		return
	}
	if room.started {
		writeErrorCode(w, http.StatusConflict, "lobby_started", "that game has already started")
		return
	}
	if room.full {
		writeErrorCode(w, http.StatusConflict, "lobby_full", "that room is full")
		return
	}

	invite, err := s.friends.Invite(r.Context(), userID, req.UserID, code, room.kind)
	switch {
	case errors.Is(err, friend.ErrInviteSelf):
		writeErrorCode(w, http.StatusUnprocessableEntity, "invite_self", "you cannot invite yourself")
		return
	case errors.Is(err, friend.ErrNotFriends):
		writeErrorCode(w, http.StatusForbidden, "not_friends", "you have not played with that person")
		return
	case err != nil:
		s.log.Error("create invite", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	body := s.newInviteResponses(r.Context(), []friend.Invite{*invite})
	s.deliverInvite(r.Context(), req.UserID, body[0])

	writeJSON(w, http.StatusCreated, body[0])
}

func (s *Server) handleMarkInvitesSeen(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleMarkInvitesSeen reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, problems, err := decode[seenInvitesRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	if err := s.friends.MarkSeen(r.Context(), userID, req.IDs); err != nil {
		s.log.Error("mark invites seen", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) newInviteResponses(ctx context.Context, invites []friend.Invite) []inviteResponse {
	ids := make([]string, 0, len(invites))
	for _, invite := range invites {
		ids = append(ids, invite.FromUserID)
	}
	users := s.usersByID(ctx, ids)

	out := make([]inviteResponse, 0, len(invites))
	for _, invite := range invites {
		name, color := nameAndColor(users, invite.FromUserID)
		game, _ := joincode.GameFor(invite.Code)

		out = append(out, inviteResponse{
			ID:   invite.ID,
			Code: invite.Code,
			Game: string(game),
			Kind: invite.Kind,
			From: inviteFromResponse{
				UserID:        invite.FromUserID,
				Name:          name,
				AvatarColorID: color,
			},
			ExpiresAt: invite.ExpiresAt.Format(timeFormat),
			CreatedAt: invite.CreatedAt.Format(timeFormat),
		})
	}
	return out
}

// deliverInvite nudges the app if it is listening and falls back to a push if it is not.
// The invite is already stored either way, so neither of these is how it arrives -- only how soon.
func (s *Server) deliverInvite(ctx context.Context, toUserID string, body inviteResponse) {
	s.rt.In(userRoom(toUserID), func(room *realtime.Room) {
		room.Broadcast(realtime.Message(typeInvite, body))
	})

	if s.rt.Has(userRoom(toUserID)) {
		return
	}

	// Off the request goroutine so a slow third party cannot hold the handler open,
	// which is exactly why the request's own context is no use: it dies when we return.
	go s.push.Send(context.WithoutCancel(ctx), toUserID, push.Notification{
		Title: body.From.Name,
		Body:  body.From.Name + " invited you to a game",
		Data:  map[string]string{"code": body.Code, "kind": body.Kind},
	})
}

// inviteLobby is the little an invite needs to know about a room, whichever game owns it.
type inviteLobby struct {
	// has is the game's own membership test, so this never re-implements one.
	has     func(userID string) bool
	full    bool
	started bool
	// kind separates a League of Letters bracket from an ordinary room, since the two share a code prefix.
	kind string
}

// inviteRoom loads a lobby through whichever service owns the code's game.
func (s *Server) inviteRoom(ctx context.Context, game joincode.Game, code string) (inviteLobby, error) {
	switch game {
	case joincode.LeagueOfLetters:
		lobby, err := s.leagueOfLetters.Lobby(ctx, code)
		if err != nil {
			return inviteLobby{}, err
		}
		return inviteLobby{
			has:     lobby.Has,
			full:    lobby.Full(),
			started: lobby.Status == lol.LobbyStarted,
			kind:    string(lobby.Kind),
		}, nil

	case joincode.PubquizR:
		lobby, err := s.pubquizr.Lobby(ctx, code)
		if err != nil {
			return inviteLobby{}, err
		}
		return inviteLobby{
			has:     lobby.Has,
			full:    lobby.Full(),
			started: lobby.Status == pubquizr.LobbyStarted,
			kind:    inviteKindRoom,
		}, nil

	case joincode.OneOfUs:
		lobby, err := s.oneOfUs.Lobby(ctx, code)
		if err != nil {
			return inviteLobby{}, err
		}
		return inviteLobby{
			has:     lobby.Has,
			full:    lobby.Full(),
			started: lobby.Status == oneofus.LobbyStarted,
			kind:    inviteKindRoom,
		}, nil

	case joincode.FakeFiller:
		lobby, err := s.fakeFiller.Lobby(ctx, code)
		if err != nil {
			return inviteLobby{}, err
		}
		return inviteLobby{
			has:     lobby.Has,
			full:    lobby.Full(),
			started: lobby.Status == fakefiller.LobbyStarted,
			kind:    inviteKindRoom,
		}, nil
	}

	return inviteLobby{}, joincode.ErrMalformed
}

// inviteKindRoom is what every game but a League of Letters bracket is.
const inviteKindRoom = "room"

// lobbyRoster is the ids out of a roster. Generic because the four games' player rows are four types with the same field.
func lobbyRoster[T any](players []T, userID func(T) string) []string {
	ids := make([]string, 0, len(players))
	for _, player := range players {
		ids = append(ids, userID(player))
	}
	return ids
}

// linkLobbyFriends befriends whoever just joined with everybody already sitting there.
// A failure is logged and swallowed: a social side effect must never cost somebody their seat.
func (s *Server) linkLobbyFriends(ctx context.Context, userID string, roster []string) {
	if err := s.friends.Link(ctx, userID, roster); err != nil {
		s.log.Error("link lobby friends", "err", err, "user", userID)
	}
}

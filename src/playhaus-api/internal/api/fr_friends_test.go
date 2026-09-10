package api

import (
	"net/http"
	"testing"

	"playhaus-api/internal/user"

	"gorm.io/gorm"
)

const friendsPath = "/api/v1/friends"

func listFriends(t *testing.T, h http.Handler, token string) []friendResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, friendsPath, "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("list friends: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[[]friendResponse](t, rec)
}

// hasFriend is whether a list names somebody, since order is by when you met.
func hasFriend(friends []friendResponse, userID string) bool {
	for _, f := range friends {
		if f.UserID == userID {
			return true
		}
	}
	return false
}

// The whole product rule: you do not add anybody, you play with them.
func TestPlayingTogetherMakesFriends(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	if rec := joinLobby(t, srv, guest.Token, lobby.Code); rec.Code != http.StatusOK {
		t.Fatalf("join: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if got := listFriends(t, srv, host.Token); !hasFriend(got, guest.User.ID) {
		t.Errorf("the host's friends are %v, want the guest who joined", got)
	}
	if got := listFriends(t, srv, guest.Token); !hasFriend(got, host.User.ID) {
		t.Errorf("the guest's friends are %v, want the host of the room they joined", got)
	}
}

// Opening a room is not playing with anybody, so it befriends nobody.
func TestOpeningARoomAloneMakesNoFriends(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	createLobby(t, srv, host.Token)

	if got := listFriends(t, srv, host.Token); len(got) != 0 {
		t.Errorf("a host sitting alone has friends: %v", got)
	}
}

// A friends list is drawn with names and swatches, because the app has no user directory to look them up in.
func TestAFriendComesWithTheirNameAndColour(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	joinLobby(t, srv, guest.Token, lobby.Code)

	friends := listFriends(t, srv, host.Token)
	if len(friends) != 1 {
		t.Fatalf("the host has %d friends, want 1", len(friends))
	}

	if friends[0].Name != guest.User.Name {
		t.Errorf("friend name = %q, want %q", friends[0].Name, guest.User.Name)
	}
	if friends[0].AvatarColorID == "" {
		t.Error("friend came without a swatch")
	}
	if friends[0].FriendsSince == "" {
		t.Error("friend came without a date")
	}
}

// Your list is yours: a third party who played with neither of you sees nothing.
func TestAFriendsListIsOnlyYourOwn(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)
	stranger := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	joinLobby(t, srv, guest.Token, lobby.Code)

	if got := listFriends(t, srv, stranger.Token); len(got) != 0 {
		t.Errorf("somebody who played with nobody has friends: %v", got)
	}
}

// A friendship whose other half has gone is dropped rather than drawn as a blank row.
func TestAFriendWhoseAccountIsGoneIsNotListed(t *testing.T) {
	srv, db := newTestServerWithDB(t)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	joinLobby(t, srv, guest.Token, lobby.Code)

	if err := db.Where("id = ?", guest.User.ID).Delete(&user.User{}).Error; err != nil {
		t.Fatalf("delete the friend: %v", err)
	}

	if got := listFriends(t, srv, host.Token); len(got) != 0 {
		t.Errorf("a deleted account is still listed: %v", got)
	}
}

// Upgrading keeps the same row id, so a guest who signs up does not lose the people they played with.
func TestUpgradingAGuestKeepsTheirFriends(t *testing.T) {
	srv := newTestServer(t)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	joinLobby(t, srv, guest.Token, lobby.Code)

	rec := do(t, srv, http.MethodPost, "/api/v1/user/upgrade",
		`{"email":"guest@example.com","password":"hunter2hunter2"}`, guest.Token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upgrade: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if got := listFriends(t, srv, guest.Token); !hasFriend(got, host.User.ID) {
		t.Errorf("an upgraded guest's friends are %v, want the host they played with", got)
	}
	if got := listFriends(t, srv, host.Token); !hasFriend(got, guest.User.ID) {
		t.Errorf("the host lost the guest who upgraded: %v", got)
	}
}

// A join is a join whichever game it is, so the graph is one graph across all four.
func TestPlayingAnyMultiDeviceGameMakesFriends(t *testing.T) {
	srv, _ := newTestServerWithDB(t)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	code := createFFLobby(t, srv, host.Token).Code
	if rec := do(t, srv, http.MethodPost, ffLobbyPlayersPath(code), "", guest.Token); rec.Code != http.StatusOK {
		t.Fatalf("join fake filler: status = %d (body: %s)", rec.Code, rec.Body)
	}

	if got := listFriends(t, srv, host.Token); !hasFriend(got, guest.User.ID) {
		t.Errorf("the fake filler host's friends are %v, want the guest who joined", got)
	}
}

// Rejoining is the app's normal behaviour -- useLobby joins on every mount -- so it must not write the same pair again.
func TestRejoiningDoesNotDuplicateAFriend(t *testing.T) {
	srv, db := newTestServerWithDB(t)

	host := newGuestSession(t, srv)
	guest := newGuestSession(t, srv)

	lobby := createLobby(t, srv, host.Token)
	joinLobby(t, srv, guest.Token, lobby.Code)
	joinLobby(t, srv, guest.Token, lobby.Code)

	if got := listFriends(t, srv, host.Token); len(got) != 1 {
		t.Errorf("the host has %d friends after one person joined twice, want 1", len(got))
	}
	if got := countFriendships(t, db); got != 2 {
		t.Errorf("friendship rows = %d, want 2 (one pair, both ways)", got)
	}
}

func countFriendships(t *testing.T, db *gorm.DB) int64 {
	t.Helper()

	var count int64
	if err := db.Table("friendships").Count(&count).Error; err != nil {
		t.Fatalf("count friendships: %v", err)
	}
	return count
}

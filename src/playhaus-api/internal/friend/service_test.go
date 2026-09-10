package friend

import (
	"context"
	"errors"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"playhaus-api/internal/platform/database"

	"gorm.io/gorm"
)

func newTestService(t *testing.T) (*Service, *gorm.DB) {
	t.Helper()

	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	// Windows won't delete t.TempDir() while the file is still open, so close it explicitly before cleanup runs.
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	models := Models()
	if err := database.Migrate(db, models[0], models[1:]...); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	return NewService(NewGormStore(db)), db
}

// friendIDs is somebody's list, as bare ids.
func friendIDs(t *testing.T, s *Service, userID string) []string {
	t.Helper()

	rows, err := s.List(context.Background(), userID)
	if err != nil {
		t.Fatalf("list %s: %v", userID, err)
	}

	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.FriendID)
	}
	slices.Sort(ids)
	return ids
}

// Walking into a room is the whole of adding somebody, and it works from both sides at once.
func TestPlayingTogetherMakesFriends(t *testing.T) {
	svc, _ := newTestService(t)

	if err := svc.Link(context.Background(), "carol", []string{"alice", "bob", "carol"}); err != nil {
		t.Fatalf("link: %v", err)
	}

	if got := friendIDs(t, svc, "carol"); !slices.Equal(got, []string{"alice", "bob"}) {
		t.Errorf("carol's friends = %v, want [alice bob]", got)
	}
	if got := friendIDs(t, svc, "alice"); !slices.Equal(got, []string{"carol"}) {
		t.Errorf("alice's friends = %v, want [carol]", got)
	}
	if got := friendIDs(t, svc, "bob"); !slices.Equal(got, []string{"carol"}) {
		t.Errorf("bob's friends = %v, want [carol]", got)
	}
}

// The roster a link is given includes the person doing the linking, and nobody is their own friend.
func TestNobodyBefriendsThemselves(t *testing.T) {
	svc, _ := newTestService(t)

	if err := svc.Link(context.Background(), "alice", []string{"alice"}); err != nil {
		t.Fatalf("link: %v", err)
	}

	if got := friendIDs(t, svc, "alice"); len(got) != 0 {
		t.Errorf("alice's friends = %v, want none", got)
	}
}

// The app re-joins a lobby on every mount, so linking twice has to be free and has to leave the first time alone.
func TestJoiningAgainDoesNotMoveWhenYouMet(t *testing.T) {
	svc, db := newTestService(t)
	ctx := context.Background()

	if err := svc.Link(ctx, "alice", []string{"bob"}); err != nil {
		t.Fatalf("first link: %v", err)
	}

	first, err := svc.List(ctx, "alice")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(first) != 1 {
		t.Fatalf("after one link alice has %d friends, want 1", len(first))
	}
	met := first[0].CreatedAt

	time.Sleep(2 * time.Millisecond)

	if err := svc.Link(ctx, "alice", []string{"bob"}); err != nil {
		t.Fatalf("second link: %v", err)
	}

	var count int64
	if err := db.Model(&Friendship{}).Count(&count).Error; err != nil {
		t.Fatalf("count rows: %v", err)
	}
	if count != 2 {
		t.Errorf("friendship rows = %d, want 2 (one pair, both ways)", count)
	}

	again, err := svc.List(ctx, "alice")
	if err != nil {
		t.Fatalf("list again: %v", err)
	}
	if !again[0].CreatedAt.Equal(met) {
		t.Errorf("friendsSince moved: %v, want %v", again[0].CreatedAt, met)
	}
}

// PubquizR's shared screen is a viewer rather than a player, and its user id is blank.
func TestABlankIdIsNotAFriend(t *testing.T) {
	svc, _ := newTestService(t)

	if err := svc.Link(context.Background(), "alice", []string{"", "bob"}); err != nil {
		t.Fatalf("link: %v", err)
	}

	if got := friendIDs(t, svc, "alice"); !slices.Equal(got, []string{"bob"}) {
		t.Errorf("alice's friends = %v, want [bob]", got)
	}
}

// You can only ask somebody you have played with -- that is the whole permission model.
func TestInvitingAStrangerIsRefused(t *testing.T) {
	svc, _ := newTestService(t)

	_, err := svc.Invite(context.Background(), "alice", "bob", "LZWQ9", "room")
	if !errors.Is(err, ErrNotFriends) {
		t.Errorf("invite a stranger: err = %v, want ErrNotFriends", err)
	}
}

func TestInvitingYourselfIsRefused(t *testing.T) {
	svc, _ := newTestService(t)

	_, err := svc.Invite(context.Background(), "alice", "alice", "LZWQ9", "room")
	if !errors.Is(err, ErrInviteSelf) {
		t.Errorf("invite yourself: err = %v, want ErrInviteSelf", err)
	}
}

// The invite is a row before it is a frame, which is what makes it survive a phone that was not listening.
func TestAnInviteWaitsForSomebodyWhoWasNotListening(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	if err := svc.Link(ctx, "alice", []string{"bob"}); err != nil {
		t.Fatalf("link: %v", err)
	}

	sent, err := svc.Invite(ctx, "alice", "bob", "LZWQ9", "room")
	if err != nil {
		t.Fatalf("invite: %v", err)
	}

	waiting, err := svc.Pending(ctx, "bob")
	if err != nil {
		t.Fatalf("pending: %v", err)
	}
	if len(waiting) != 1 || waiting[0].ID != sent.ID {
		t.Fatalf("bob has %d invites waiting, want the one alice sent", len(waiting))
	}
	if waiting[0].Code != "LZWQ9" {
		t.Errorf("invite code = %q, want LZWQ9", waiting[0].Code)
	}
}

// An invite outlives nothing: the room it points at is swept after an hour.
func TestAnExpiredInviteIsNotPending(t *testing.T) {
	svc, db := newTestService(t)
	ctx := context.Background()

	if err := svc.Link(ctx, "alice", []string{"bob"}); err != nil {
		t.Fatalf("link: %v", err)
	}
	if _, err := svc.Invite(ctx, "alice", "bob", "LZWQ9", "room"); err != nil {
		t.Fatalf("invite: %v", err)
	}

	past := time.Now().UTC().Add(-time.Minute)
	if err := db.Model(&Invite{}).Where("to_user_id = ?", "bob").Update("expires_at", past).Error; err != nil {
		t.Fatalf("age the invite: %v", err)
	}

	waiting, err := svc.Pending(ctx, "bob")
	if err != nil {
		t.Fatalf("pending: %v", err)
	}
	if len(waiting) != 0 {
		t.Errorf("bob has %d expired invites waiting, want none", len(waiting))
	}
}

// Seen is the banner having been shown, and it is only ever the recipient's to say.
func TestOnlyTheRecipientCanMarkAnInviteSeen(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	if err := svc.Link(ctx, "alice", []string{"bob"}); err != nil {
		t.Fatalf("link: %v", err)
	}
	sent, err := svc.Invite(ctx, "alice", "bob", "LZWQ9", "room")
	if err != nil {
		t.Fatalf("invite: %v", err)
	}

	if err := svc.MarkSeen(ctx, "carol", []string{sent.ID}); err != nil {
		t.Fatalf("mark seen as a stranger: %v", err)
	}

	waiting, err := svc.Pending(ctx, "bob")
	if err != nil {
		t.Fatalf("pending: %v", err)
	}
	if len(waiting) != 1 {
		t.Fatalf("carol marked bob's invite seen: %d left, want 1", len(waiting))
	}

	if err := svc.MarkSeen(ctx, "bob", []string{sent.ID}); err != nil {
		t.Fatalf("mark seen: %v", err)
	}

	waiting, err = svc.Pending(ctx, "bob")
	if err != nil {
		t.Fatalf("pending after seen: %v", err)
	}
	if len(waiting) != 0 {
		t.Errorf("bob still has %d invites pending after seeing them", len(waiting))
	}
}

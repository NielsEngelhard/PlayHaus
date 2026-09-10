package friend

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
)

type Store interface {
	Link(ctx context.Context, rows []Friendship) error
	List(ctx context.Context, userID string) ([]Friendship, error)
	AreFriends(ctx context.Context, userID, friendID string) (bool, error)
	CreateInvite(ctx context.Context, invite *Invite) error
	Pending(ctx context.Context, userID string, now time.Time) ([]Invite, error)
	MarkSeen(ctx context.Context, userID string, ids []string) error
	DeleteExpired(ctx context.Context, before time.Time) error
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

// Link befriends one player with everybody else on a roster, in both directions.
//
// Deliberately not "befriend every pair in this roster": the app re-joins a lobby
// on every mount of the room screen, so a whole-roster link would rewrite n(n-1)
// rows each time. Every other pair was already written when that player joined.
func (s *Service) Link(ctx context.Context, userID string, others []string) error {
	if userID == "" {
		return nil
	}

	now := time.Now().UTC()
	seen := map[string]bool{userID: true}
	rows := make([]Friendship, 0, 2*len(others))

	for _, other := range others {
		// A blank id is the shared screen rather than a player, and a repeat is a roster read twice.
		if other == "" || seen[other] {
			continue
		}
		seen[other] = true

		rows = append(rows,
			Friendship{UserID: userID, FriendID: other, CreatedAt: now},
			Friendship{UserID: other, FriendID: userID, CreatedAt: now},
		)
	}

	if len(rows) == 0 {
		return nil
	}

	if err := s.store.Link(ctx, rows); err != nil {
		return fmt.Errorf("link friends: %w", err)
	}
	return nil
}

// List is everybody you have played with, newest first.
func (s *Service) List(ctx context.Context, userID string) ([]Friendship, error) {
	return s.store.List(ctx, userID)
}

func (s *Service) AreFriends(ctx context.Context, userID, friendID string) (bool, error) {
	return s.store.AreFriends(ctx, userID, friendID)
}

// Invite records the ask. It is written before anything is published, so a socket
// frame that never lands costs nothing -- the row is still there to be fetched.
func (s *Service) Invite(ctx context.Context, fromUserID, toUserID, code, kind string) (*Invite, error) {
	if fromUserID == toUserID {
		return nil, ErrInviteSelf
	}

	friends, err := s.store.AreFriends(ctx, fromUserID, toUserID)
	if err != nil {
		return nil, fmt.Errorf("check friendship: %w", err)
	}
	if !friends {
		return nil, ErrNotFriends
	}

	now := time.Now().UTC()
	invite := &Invite{
		ID:         uuid.NewString(),
		FromUserID: fromUserID,
		ToUserID:   toUserID,
		Code:       code,
		Kind:       kind,
		Status:     InvitePending,
		CreatedAt:  now,
		ExpiresAt:  now.Add(InviteTTL),
	}

	if err := s.store.CreateInvite(ctx, invite); err != nil {
		return nil, fmt.Errorf("insert invite: %w", err)
	}
	return invite, nil
}

// Pending is the invites still worth showing somebody, newest first.
func (s *Service) Pending(ctx context.Context, userID string) ([]Invite, error) {
	return s.store.Pending(ctx, userID, time.Now().UTC())
}

// MarkSeen stops an invite reappearing as a banner. It stays readable until it expires.
func (s *Service) MarkSeen(ctx context.Context, userID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	return s.store.MarkSeen(ctx, userID, ids)
}

// SweepExpired keeps the invite table from growing forever. Expired invites are already filtered out of every read; this only deletes them.
func (s *Service) SweepExpired(ctx context.Context, every time.Duration, log *slog.Logger) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.store.DeleteExpired(ctx, time.Now().UTC()); err != nil {
				log.Error("sweep expired invites", "err", err)
			}
		}
	}
}

// Package friend is the social graph: who has played with whom, and the invites between them.
package friend

import (
	"errors"
	"time"
)

// Friendship is one direction of a mutual link. Every pair is stored twice, so
// listing somebody's friends is one lookup on the primary key's leading column.
type Friendship struct {
	UserID    string    `gorm:"primaryKey;type:text"`
	FriendID  string    `gorm:"primaryKey;type:text"`
	CreatedAt time.Time `gorm:"not null"`
}

func (Friendship) TableName() string { return "friendships" }

// InviteStatus is the life of an invite. It is only ever set by the sender's side; accepting is just walking into the room.
type InviteStatus string

const (
	InvitePending InviteStatus = "pending"
	InviteSeen    InviteStatus = "seen"
)

// InviteTTL is how long an invite is worth showing. A lobby is swept after an hour, so an invite outliving one is an invite into nothing.
const InviteTTL = time.Hour

// Invite is somebody being asked into a room they can already reach -- it carries no permission, only the code and who sent it.
type Invite struct {
	ID         string       `gorm:"primaryKey;type:text"`
	FromUserID string       `gorm:"type:text;not null"`
	ToUserID   string       `gorm:"type:text;index;not null"`
	Code       string       `gorm:"type:text;not null"`
	Kind       string       `gorm:"type:text;not null"`
	Status     InviteStatus `gorm:"type:text;not null"`
	CreatedAt  time.Time    `gorm:"not null"`
	ExpiresAt  time.Time    `gorm:"index;not null"`
}

func (Invite) TableName() string { return "friend_invites" }

func Models() []any {
	return []any{
		&Friendship{},
		&Invite{},
	}
}

var (
	ErrNotFriends    = errors.New("you have not played with that person")
	ErrInviteSelf    = errors.New("you cannot invite yourself")
	ErrInviteExpired = errors.New("that invite has expired")
)

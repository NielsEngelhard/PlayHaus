package user

import "time"

// Two views of an account, because two different audiences read one.
//
// SelfResponse goes only to the account it describes — /me, sign-in, signup,
// profile updates. PublicResponse is what anybody else may see, and it has no
// field for an email address at all. Making that a property of the type rather
// than of a `if caller == subject` check means a new endpoint cannot leak an
// address by forgetting to strip it.

type SelfResponse struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Email            *string   `json:"email,omitempty"`
	IsGuestAccount   bool      `json:"isGuestAccount"`
	AvatarColorID    string    `json:"avatarColorId"`
	SoundEnabled     bool      `json:"soundEnabled"`
	VibrationEnabled bool      `json:"vibrationEnabled"`
	CreatedAt        time.Time `json:"createdAt"`
}

func NewSelfResponse(u AppUser) SelfResponse {
	return SelfResponse{
		ID:               u.ID,
		Name:             u.Name,
		Email:            u.Email,
		IsGuestAccount:   u.IsGuestAccount,
		AvatarColorID:    u.AvatarColorID,
		SoundEnabled:     u.SoundEnabled,
		VibrationEnabled: u.VibrationEnabled,
		CreatedAt:        u.CreatedAt,
	}
}

// PublicResponse is an account as other players see it: enough to draw them in
// a player list, and nothing else.
type PublicResponse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	AvatarColorID string `json:"avatarColorId"`
}

func NewPublicResponse(u AppUser) PublicResponse {
	return PublicResponse{
		ID:            u.ID,
		Name:          u.Name,
		AvatarColorID: u.AvatarColorID,
	}
}

type listResponse[T any] struct {
	Data []T `json:"data"`
}

// Request data
type createUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Pointers, so a field that was left out reads as "leave it alone" rather than
// as "set it to empty/false".
type updateProfileRequest struct {
	Name             *string `json:"name"`
	AvatarColorID    *string `json:"avatarColorId"`
	SoundEnabled     *bool   `json:"soundEnabled"`
	VibrationEnabled *bool   `json:"vibrationEnabled"`
}

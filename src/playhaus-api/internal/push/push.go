// Package push sends device notifications through Expo's push service.
package push

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// Endpoint is Expo's push service. It takes the tokens the client library hands out and works for both APNs and FCM.
const Endpoint = "https://exp.host/--/api/v2/push/send"

// Platform is which store the token came from. Kept because a later change may need to route around one of them.
type Platform string

const (
	IOS     Platform = "ios"
	Android Platform = "android"
)

func (p Platform) Valid() bool { return p == IOS || p == Android }

// DeviceToken is one installation of the app. The token is the key: reinstalling gives a new one, and the old row simply stops being written to.
type DeviceToken struct {
	Token     string    `gorm:"primaryKey;type:text"`
	UserID    string    `gorm:"type:text;index;not null"`
	Platform  Platform  `gorm:"type:text;not null"`
	UpdatedAt time.Time `gorm:"not null"`
}

func (DeviceToken) TableName() string { return "device_tokens" }

func Models() []any {
	return []any{&DeviceToken{}}
}

type Store interface {
	Upsert(ctx context.Context, token *DeviceToken) error
	ByUserID(ctx context.Context, userID string) ([]DeviceToken, error)
}

// Notification is one message, before it is addressed to any particular device.
type Notification struct {
	Title string
	Body  string
	// Data is handed back to the app when the notification is opened, so it can route without asking the server again.
	Data map[string]string
}

type Service struct {
	store   Store
	client  *http.Client
	log     *slog.Logger
	enabled bool
}

// NewService takes the flag rather than reading it, so the sender is inert in tests without an environment variable.
func NewService(store Store, enabled bool, log *slog.Logger) *Service {
	return &Service{
		store:   store,
		client:  &http.Client{Timeout: 10 * time.Second},
		log:     log,
		enabled: enabled,
	}
}

func (s *Service) Register(ctx context.Context, userID, token string, platform Platform) error {
	return s.store.Upsert(ctx, &DeviceToken{
		Token:     token,
		UserID:    userID,
		Platform:  platform,
		UpdatedAt: time.Now().UTC(),
	})
}

// Send delivers to every device a user has registered. It reports nothing back:
// a failed push is a missed notification, never a failed request, and the caller
// has already written whatever the notification was about.
//
// Give this a context that outlives the request -- context.WithoutCancel -- when
// calling it from a goroutine, or it dies the moment the handler returns.
func (s *Service) Send(ctx context.Context, userID string, note Notification) {
	if !s.enabled {
		s.log.Debug("push disabled, notification skipped", "user", userID, "title", note.Title)
		return
	}

	tokens, err := s.store.ByUserID(ctx, userID)
	if err != nil {
		s.log.Error("look up device tokens", "err", err, "user", userID)
		return
	}
	if len(tokens) == 0 {
		return
	}

	messages := make([]expoMessage, 0, len(tokens))
	for _, t := range tokens {
		messages = append(messages, expoMessage{
			To:    t.Token,
			Title: note.Title,
			Body:  note.Body,
			Data:  note.Data,
			Sound: "default",
		})
	}

	if err := s.post(ctx, messages); err != nil {
		s.log.Error("send push", "err", err, "user", userID)
	}
}

type expoMessage struct {
	To    string            `json:"to"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data,omitempty"`
	Sound string            `json:"sound,omitempty"`
}

func (s *Service) post(ctx context.Context, messages []expoMessage) error {
	body, err := json.Marshal(messages)
	if err != nil {
		return fmt.Errorf("encode push messages: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, Endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build push request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	res, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("post to expo: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("expo push responded %d", res.StatusCode)
	}
	return nil
}

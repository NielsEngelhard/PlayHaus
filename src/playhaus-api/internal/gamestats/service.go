package gamestats

import (
	"context"
	"fmt"
)

type Store interface {
	Increment(ctx context.Context, counter Counter) error
	Totals(ctx context.Context) (*GamesPlayed, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Increment(ctx context.Context, counter Counter) error {
	if !counter.Valid() {
		return fmt.Errorf("unknown counter %q", counter)
	}
	return s.store.Increment(ctx, counter)
}

func (s *Service) Totals(ctx context.Context) (*GamesPlayed, error) {
	return s.store.Totals(ctx)
}

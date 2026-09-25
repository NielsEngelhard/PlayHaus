-- The finale pays stars rather than points, so a finalist's stars are kept apart from their score.

-- +goose Up
ALTER TABLE pq_session_players ADD COLUMN stars bigint DEFAULT 0 NOT NULL;

-- +goose Down
ALTER TABLE pq_session_players DROP COLUMN stars;

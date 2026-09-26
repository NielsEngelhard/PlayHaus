-- The seat whose round 1 run just reached the cap and was handed on, so every screen can say why.

-- +goose Up
ALTER TABLE pq_sessions ADD COLUMN streak_ended_seat bigint;

-- +goose Down
ALTER TABLE pq_sessions DROP COLUMN streak_ended_seat;

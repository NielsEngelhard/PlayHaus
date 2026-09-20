-- A multi device room either has a shared screen carrying the question, or every phone is a whole board.

-- +goose Up
ALTER TABLE pq_lobbies ADD COLUMN host_screen boolean DEFAULT false NOT NULL;
ALTER TABLE pq_sessions ADD COLUMN host_screen boolean DEFAULT false NOT NULL;

-- +goose Down
ALTER TABLE pq_sessions DROP COLUMN host_screen;
ALTER TABLE pq_lobbies DROP COLUMN host_screen;

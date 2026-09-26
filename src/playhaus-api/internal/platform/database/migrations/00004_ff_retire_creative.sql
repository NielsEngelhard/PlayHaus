-- The creative mode is gone and has no prompts left to deal, so a room still waiting on it is moved to facts.
-- A game already running on it plays out on the rounds it was dealt; nothing here touches ff_games.

-- +goose Up
UPDATE ff_lobbies SET game_mode = 'facts' WHERE game_mode = 'creative' AND status = 'waiting';

-- +goose Down
-- Nothing to undo: which rooms were creative is not recorded anywhere once they are facts.

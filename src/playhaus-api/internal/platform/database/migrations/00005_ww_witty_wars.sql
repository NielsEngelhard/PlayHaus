-- Witty Wars: two players answer one prompt, the rest of the table votes for the funnier one.

-- +goose Up
CREATE TABLE ww_lobbies (
    id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    game_mode text NOT NULL,
    answers_per_player bigint DEFAULT 3 NOT NULL,
    status text NOT NULL,
    game_id text,
    rematch_code text,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ww_lobby_players (
    lobby_id text NOT NULL,
    user_id text NOT NULL,
    seat bigint NOT NULL,
    joined_at timestamp with time zone NOT NULL
);

CREATE TABLE ww_games (
    id text NOT NULL,
    lobby_id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    game_mode text NOT NULL,
    answers_per_player bigint DEFAULT 3 NOT NULL,
    phase text NOT NULL,
    current_round bigint DEFAULT 1 NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ww_game_players (
    game_id text NOT NULL,
    user_id text NOT NULL,
    turn_order bigint NOT NULL,
    score bigint NOT NULL
);

CREATE TABLE ww_rounds (
    id text NOT NULL,
    game_id text NOT NULL,
    number bigint NOT NULL,
    line text NOT NULL,
    subject_user_id text NOT NULL,
    author_one_user_id text NOT NULL,
    author_two_user_id text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ww_round_options (
    round_id text NOT NULL,
    author_id text NOT NULL,
    answer text NOT NULL,
    slot bigint NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ww_votes (
    round_id text NOT NULL,
    voter_user_id text NOT NULL,
    voted_for_author_id text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

ALTER TABLE ONLY ww_lobbies
    ADD CONSTRAINT ww_lobbies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ww_lobby_players
    ADD CONSTRAINT ww_lobby_players_pkey PRIMARY KEY (lobby_id, user_id);

ALTER TABLE ONLY ww_games
    ADD CONSTRAINT ww_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ww_game_players
    ADD CONSTRAINT ww_game_players_pkey PRIMARY KEY (game_id, user_id);

ALTER TABLE ONLY ww_rounds
    ADD CONSTRAINT ww_rounds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ww_round_options
    ADD CONSTRAINT ww_round_options_pkey PRIMARY KEY (round_id, author_id);

ALTER TABLE ONLY ww_votes
    ADD CONSTRAINT ww_votes_pkey PRIMARY KEY (round_id, voter_user_id);

CREATE INDEX idx_ww_lobbies_owner_id ON ww_lobbies USING btree (owner_id);

CREATE INDEX idx_ww_lobbies_game_id ON ww_lobbies USING btree (game_id);

CREATE INDEX idx_ww_lobbies_rematch_code ON ww_lobbies USING btree (rematch_code);

CREATE INDEX idx_ww_lobby_players_user_id ON ww_lobby_players USING btree (user_id);

CREATE INDEX idx_ww_games_lobby_id ON ww_games USING btree (lobby_id);

CREATE INDEX idx_ww_games_owner_id ON ww_games USING btree (owner_id);

CREATE INDEX idx_ww_game_players_user_id ON ww_game_players USING btree (user_id);

CREATE UNIQUE INDEX idx_ww_round_game_number ON ww_rounds USING btree (game_id, number);

CREATE INDEX idx_ww_rounds_author_one_user_id ON ww_rounds USING btree (author_one_user_id);

CREATE INDEX idx_ww_rounds_author_two_user_id ON ww_rounds USING btree (author_two_user_id);

CREATE INDEX idx_ww_votes_voter_user_id ON ww_votes USING btree (voter_user_id);

ALTER TABLE ONLY ww_lobby_players
    ADD CONSTRAINT fk_ww_lobbies_players FOREIGN KEY (lobby_id) REFERENCES ww_lobbies(id) ON DELETE CASCADE;

ALTER TABLE ONLY ww_game_players
    ADD CONSTRAINT fk_ww_games_players FOREIGN KEY (game_id) REFERENCES ww_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY ww_rounds
    ADD CONSTRAINT fk_ww_games_rounds FOREIGN KEY (game_id) REFERENCES ww_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY ww_round_options
    ADD CONSTRAINT fk_ww_rounds_options FOREIGN KEY (round_id) REFERENCES ww_rounds(id) ON DELETE CASCADE;

ALTER TABLE ONLY ww_votes
    ADD CONSTRAINT fk_ww_rounds_votes FOREIGN KEY (round_id) REFERENCES ww_rounds(id) ON DELETE CASCADE;

-- +goose Down
DROP TABLE ww_votes;
DROP TABLE ww_round_options;
DROP TABLE ww_rounds;
DROP TABLE ww_game_players;
DROP TABLE ww_games;
DROP TABLE ww_lobby_players;
DROP TABLE ww_lobbies;

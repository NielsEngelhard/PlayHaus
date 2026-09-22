-- +goose Up
CREATE TABLE daily_lol_games (
    id text NOT NULL,
    owner_id text NOT NULL,
    day text NOT NULL,
    locale text NOT NULL,
    word_length bigint NOT NULL,
    status text NOT NULL,
    solved boolean DEFAULT false NOT NULL,
    guesses bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone
);

CREATE TABLE daily_lol_words (
    day text NOT NULL,
    locale text NOT NULL,
    word text NOT NULL,
    word_length bigint NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE device_tokens (
    token text NOT NULL,
    user_id text NOT NULL,
    platform text NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE ff_game_players (
    game_id text NOT NULL,
    user_id text NOT NULL,
    turn_order bigint NOT NULL,
    score bigint NOT NULL
);

CREATE TABLE ff_games (
    id text NOT NULL,
    lobby_id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    game_mode text NOT NULL,
    answers_per_player bigint DEFAULT 2 NOT NULL,
    phase text NOT NULL,
    current_round bigint DEFAULT 1 NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ff_lobbies (
    id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    game_mode text NOT NULL,
    answers_per_player bigint DEFAULT 2 NOT NULL,
    status text NOT NULL,
    game_id text,
    rematch_code text,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ff_lobby_players (
    lobby_id text NOT NULL,
    user_id text NOT NULL,
    seat bigint NOT NULL,
    joined_at timestamp with time zone NOT NULL
);

CREATE TABLE ff_round_options (
    round_id text NOT NULL,
    author_id text NOT NULL,
    fills text NOT NULL,
    slot bigint NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ff_rounds (
    id text NOT NULL,
    game_id text NOT NULL,
    number bigint NOT NULL,
    line text NOT NULL,
    blanks bigint NOT NULL,
    author_one_user_id text NOT NULL,
    author_two_user_id text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE ff_votes (
    round_id text NOT NULL,
    voter_user_id text NOT NULL,
    voted_for_author_id text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE friend_invites (
    id text NOT NULL,
    from_user_id text NOT NULL,
    to_user_id text NOT NULL,
    code text NOT NULL,
    kind text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL
);

CREATE TABLE friendships (
    user_id text NOT NULL,
    friend_id text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE lol_guesses (
    id text NOT NULL,
    round_id text NOT NULL,
    owner_id text NOT NULL,
    word text NOT NULL,
    guess_number bigint NOT NULL,
    skipped boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE lol_letters (
    id text NOT NULL,
    guess_id text NOT NULL,
    "position" bigint NOT NULL,
    letter text NOT NULL,
    status text NOT NULL
);

CREATE TABLE lol_rounds (
    id text NOT NULL,
    game_id text NOT NULL,
    round_number bigint NOT NULL,
    word text NOT NULL
);

CREATE TABLE mp_lol_game_players (
    game_id text NOT NULL,
    user_id text NOT NULL,
    turn_order bigint NOT NULL,
    score bigint NOT NULL
);

CREATE TABLE mp_lol_games (
    id text NOT NULL,
    lobby_id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    word_length bigint NOT NULL,
    current_round bigint NOT NULL,
    turn_user_id text NOT NULL,
    turn_ends_at timestamp with time zone NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    seconds_per_guess bigint DEFAULT 35 NOT NULL
);

CREATE TABLE mp_lol_lobbies (
    id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    word_length bigint NOT NULL,
    seconds_per_turn bigint NOT NULL,
    status text NOT NULL,
    game_id text,
    created_at timestamp with time zone NOT NULL,
    rematch_code text,
    kind text DEFAULT 'multiplayer'::text NOT NULL,
    tournament_id text
);

CREATE TABLE mp_lol_lobby_players (
    lobby_id text NOT NULL,
    user_id text NOT NULL,
    seat bigint NOT NULL,
    joined_at timestamp with time zone NOT NULL
);

CREATE TABLE oou_answers (
    round_id text NOT NULL,
    user_id text NOT NULL,
    text text NOT NULL,
    slot bigint NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE oou_game_players (
    game_id text NOT NULL,
    user_id text NOT NULL,
    seat bigint NOT NULL,
    role bigint NOT NULL,
    is_voted_out boolean DEFAULT false NOT NULL,
    is_mayor boolean DEFAULT false NOT NULL,
    voted_out_round bigint
);

CREATE TABLE oou_lobbies (
    id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    game_mode text NOT NULL,
    enabled_roles text NOT NULL,
    status text NOT NULL,
    game_id text,
    rematch_code text,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE oou_lobby_players (
    lobby_id text NOT NULL,
    user_id text NOT NULL,
    seat bigint NOT NULL,
    joined_at timestamp with time zone NOT NULL
);

CREATE TABLE oou_local_players (
    player_id text NOT NULL,
    session_id text NOT NULL,
    name text NOT NULL,
    score bigint DEFAULT 0 NOT NULL,
    role bigint NOT NULL,
    created_at timestamp with time zone NOT NULL,
    is_voted_out boolean NOT NULL,
    is_mayor boolean DEFAULT false NOT NULL
);

CREATE TABLE oou_multi_device_games (
    id text NOT NULL,
    lobby_id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    game_mode text NOT NULL,
    actual_question text NOT NULL,
    imposter_question text NOT NULL,
    phase text NOT NULL,
    current_round bigint DEFAULT 1 NOT NULL,
    status text NOT NULL,
    civilians_won boolean,
    finished_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE oou_rounds (
    id text NOT NULL,
    game_id text NOT NULL,
    number bigint NOT NULL,
    living_count bigint NOT NULL,
    eliminated_user_id text,
    eliminated_role bigint,
    eliminated_votes bigint DEFAULT 0 NOT NULL,
    tie_broken_by_mayor boolean DEFAULT false NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE oou_single_device_games (
    id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    actual_question text NOT NULL,
    imposter_question text NOT NULL,
    finished_at timestamp with time zone,
    civilians_won boolean
);

CREATE TABLE oou_votes (
    round_id text NOT NULL,
    voter_user_id text NOT NULL,
    accused_user_id text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_answers (
    id text NOT NULL,
    question_id text NOT NULL,
    "position" bigint NOT NULL,
    text text NOT NULL,
    correct boolean DEFAULT false NOT NULL,
    alias boolean DEFAULT false NOT NULL
);

CREATE TABLE pq_lobbies (
    id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    status text NOT NULL,
    quiz_id text,
    zen_mode boolean DEFAULT false NOT NULL,
    trivia_mode boolean DEFAULT false NOT NULL,
    session_id text,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_lobby_players (
    lobby_id text NOT NULL,
    user_id text NOT NULL,
    seat bigint NOT NULL,
    name text NOT NULL,
    joined_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_questions (
    id text NOT NULL,
    quiz_id text NOT NULL,
    round bigint NOT NULL,
    kind text NOT NULL,
    "position" bigint NOT NULL,
    prompt text NOT NULL,
    category text,
    difficulty text DEFAULT ''::text NOT NULL,
    numeric_answer numeric,
    unit text,
    explanation text
);

CREATE TABLE pq_quiz_plays (
    owner_id text NOT NULL,
    quiz_id text NOT NULL,
    played_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_quizzes (
    id text NOT NULL,
    slug text NOT NULL,
    locale text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    published_at timestamp with time zone,
    content_hash text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_session_answers (
    id text NOT NULL,
    session_id text NOT NULL,
    session_question_id text NOT NULL,
    seat bigint,
    answer_id text,
    numeric_value numeric,
    text text,
    correct boolean DEFAULT false NOT NULL,
    points bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_session_guesses (
    session_question_id text NOT NULL,
    seat bigint NOT NULL,
    session_id text NOT NULL,
    value numeric NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_session_players (
    session_id text NOT NULL,
    seat bigint NOT NULL,
    name text NOT NULL,
    user_id text,
    score bigint DEFAULT 0 NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_session_questions (
    id text NOT NULL,
    session_id text NOT NULL,
    round bigint NOT NULL,
    "position" bigint NOT NULL,
    question_id text NOT NULL,
    assigned_seat bigint,
    status text NOT NULL,
    points bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE pq_sessions (
    id text NOT NULL,
    quiz_id text NOT NULL,
    owner_id text NOT NULL,
    mode text NOT NULL,
    locale text NOT NULL,
    status text NOT NULL,
    lobby_id text,
    current_round bigint NOT NULL,
    current_position bigint NOT NULL,
    quiz_master_seat bigint NOT NULL,
    hot_seat bigint DEFAULT '-1'::integer NOT NULL,
    hot_seat_run bigint DEFAULT 0 NOT NULL,
    finalist_seat_a bigint DEFAULT '-1'::integer NOT NULL,
    finalist_seat_b bigint DEFAULT '-1'::integer NOT NULL,
    zen_mode boolean DEFAULT false NOT NULL,
    trivia_mode boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone
);

CREATE TABLE sessions (
    token_hash text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE solo_lol_games (
    id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    word_length bigint NOT NULL,
    seconds_per_guess bigint,
    current_round bigint NOT NULL,
    score bigint NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    competitive boolean DEFAULT false NOT NULL,
    time_bonus bigint DEFAULT 0 NOT NULL,
    finished_at timestamp with time zone
);

CREATE TABLE solo_lol_high_scores (
    user_id text NOT NULL,
    word_length bigint NOT NULL,
    score bigint NOT NULL,
    seconds bigint NOT NULL,
    game_id text NOT NULL,
    achieved_at timestamp with time zone NOT NULL
);

CREATE TABLE tn_lol_match_players (
    match_id text NOT NULL,
    user_id text NOT NULL,
    slot bigint NOT NULL,
    score bigint NOT NULL,
    place bigint NOT NULL
);

CREATE TABLE tn_lol_matches (
    id text NOT NULL,
    tournament_id text NOT NULL,
    stage bigint NOT NULL,
    bracket text NOT NULL,
    "position" bigint NOT NULL,
    lobby_id text,
    game_id text,
    status text NOT NULL,
    winner_id text,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE tn_lol_tournament_players (
    tournament_id text NOT NULL,
    user_id text NOT NULL,
    seed bigint NOT NULL,
    losses bigint NOT NULL,
    ready_stage bigint NOT NULL,
    placement bigint
);

CREATE TABLE tn_lol_tournaments (
    id text NOT NULL,
    lobby_id text NOT NULL,
    owner_id text NOT NULL,
    locale text NOT NULL,
    word_length bigint NOT NULL,
    seconds_per_turn bigint NOT NULL,
    stage bigint NOT NULL,
    status text NOT NULL,
    winner_id text,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password_hash text,
    is_guest boolean NOT NULL,
    locale text NOT NULL,
    color text DEFAULT 'lemon'::text NOT NULL,
    enable_sounds boolean DEFAULT true NOT NULL,
    enable_music boolean DEFAULT true NOT NULL,
    enable_vibration boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone
);

ALTER TABLE ONLY daily_lol_games
    ADD CONSTRAINT daily_lol_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY daily_lol_words
    ADD CONSTRAINT daily_lol_words_pkey PRIMARY KEY (day, locale);

ALTER TABLE ONLY device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (token);

ALTER TABLE ONLY ff_game_players
    ADD CONSTRAINT ff_game_players_pkey PRIMARY KEY (game_id, user_id);

ALTER TABLE ONLY ff_games
    ADD CONSTRAINT ff_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ff_lobbies
    ADD CONSTRAINT ff_lobbies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ff_lobby_players
    ADD CONSTRAINT ff_lobby_players_pkey PRIMARY KEY (lobby_id, user_id);

ALTER TABLE ONLY ff_round_options
    ADD CONSTRAINT ff_round_options_pkey PRIMARY KEY (round_id, author_id);

ALTER TABLE ONLY ff_rounds
    ADD CONSTRAINT ff_rounds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ff_votes
    ADD CONSTRAINT ff_votes_pkey PRIMARY KEY (round_id, voter_user_id);

ALTER TABLE ONLY friend_invites
    ADD CONSTRAINT friend_invites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (user_id, friend_id);

ALTER TABLE ONLY lol_guesses
    ADD CONSTRAINT lol_guesses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY lol_letters
    ADD CONSTRAINT lol_letters_pkey PRIMARY KEY (id);

ALTER TABLE ONLY lol_rounds
    ADD CONSTRAINT lol_rounds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY mp_lol_game_players
    ADD CONSTRAINT mp_lol_game_players_pkey PRIMARY KEY (game_id, user_id);

ALTER TABLE ONLY mp_lol_games
    ADD CONSTRAINT mp_lol_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY mp_lol_lobbies
    ADD CONSTRAINT mp_lol_lobbies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY mp_lol_lobby_players
    ADD CONSTRAINT mp_lol_lobby_players_pkey PRIMARY KEY (lobby_id, user_id);

ALTER TABLE ONLY oou_answers
    ADD CONSTRAINT oou_answers_pkey PRIMARY KEY (round_id, user_id);

ALTER TABLE ONLY oou_game_players
    ADD CONSTRAINT oou_game_players_pkey PRIMARY KEY (game_id, user_id);

ALTER TABLE ONLY oou_lobbies
    ADD CONSTRAINT oou_lobbies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY oou_lobby_players
    ADD CONSTRAINT oou_lobby_players_pkey PRIMARY KEY (lobby_id, user_id);

ALTER TABLE ONLY oou_local_players
    ADD CONSTRAINT oou_local_players_pkey PRIMARY KEY (player_id);

ALTER TABLE ONLY oou_multi_device_games
    ADD CONSTRAINT oou_multi_device_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY oou_rounds
    ADD CONSTRAINT oou_rounds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY oou_single_device_games
    ADD CONSTRAINT oou_single_device_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY oou_votes
    ADD CONSTRAINT oou_votes_pkey PRIMARY KEY (round_id, voter_user_id);

ALTER TABLE ONLY pq_answers
    ADD CONSTRAINT pq_answers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY pq_lobbies
    ADD CONSTRAINT pq_lobbies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY pq_lobby_players
    ADD CONSTRAINT pq_lobby_players_pkey PRIMARY KEY (lobby_id, user_id);

ALTER TABLE ONLY pq_questions
    ADD CONSTRAINT pq_questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY pq_quiz_plays
    ADD CONSTRAINT pq_quiz_plays_pkey PRIMARY KEY (owner_id, quiz_id);

ALTER TABLE ONLY pq_quizzes
    ADD CONSTRAINT pq_quizzes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY pq_session_answers
    ADD CONSTRAINT pq_session_answers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY pq_session_guesses
    ADD CONSTRAINT pq_session_guesses_pkey PRIMARY KEY (session_question_id, seat);

ALTER TABLE ONLY pq_session_players
    ADD CONSTRAINT pq_session_players_pkey PRIMARY KEY (session_id, seat);

ALTER TABLE ONLY pq_session_questions
    ADD CONSTRAINT pq_session_questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY pq_sessions
    ADD CONSTRAINT pq_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token_hash);

ALTER TABLE ONLY solo_lol_games
    ADD CONSTRAINT solo_lol_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solo_lol_high_scores
    ADD CONSTRAINT solo_lol_high_scores_pkey PRIMARY KEY (user_id, word_length);

ALTER TABLE ONLY tn_lol_match_players
    ADD CONSTRAINT tn_lol_match_players_pkey PRIMARY KEY (match_id, user_id);

ALTER TABLE ONLY tn_lol_matches
    ADD CONSTRAINT tn_lol_matches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tn_lol_tournament_players
    ADD CONSTRAINT tn_lol_tournament_players_pkey PRIMARY KEY (tournament_id, user_id);

ALTER TABLE ONLY tn_lol_tournaments
    ADD CONSTRAINT tn_lol_tournaments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_daily_lol_games_day ON daily_lol_games USING btree (day);

CREATE INDEX idx_daily_lol_games_owner_id ON daily_lol_games USING btree (owner_id);

CREATE UNIQUE INDEX idx_daily_lol_one_a_day ON daily_lol_games USING btree (owner_id, day);

CREATE INDEX idx_device_tokens_user_id ON device_tokens USING btree (user_id);

CREATE INDEX idx_ff_game_players_user_id ON ff_game_players USING btree (user_id);

CREATE INDEX idx_ff_games_lobby_id ON ff_games USING btree (lobby_id);

CREATE INDEX idx_ff_games_owner_id ON ff_games USING btree (owner_id);

CREATE INDEX idx_ff_lobbies_game_id ON ff_lobbies USING btree (game_id);

CREATE INDEX idx_ff_lobbies_owner_id ON ff_lobbies USING btree (owner_id);

CREATE INDEX idx_ff_lobbies_rematch_code ON ff_lobbies USING btree (rematch_code);

CREATE INDEX idx_ff_lobby_players_user_id ON ff_lobby_players USING btree (user_id);

CREATE UNIQUE INDEX idx_ff_round_game_number ON ff_rounds USING btree (game_id, number);

CREATE INDEX idx_ff_rounds_author_one_user_id ON ff_rounds USING btree (author_one_user_id);

CREATE INDEX idx_ff_rounds_author_two_user_id ON ff_rounds USING btree (author_two_user_id);

CREATE INDEX idx_ff_votes_voter_user_id ON ff_votes USING btree (voter_user_id);

CREATE INDEX idx_friend_invites_expires_at ON friend_invites USING btree (expires_at);

CREATE INDEX idx_friend_invites_to_user_id ON friend_invites USING btree (to_user_id);

CREATE UNIQUE INDEX idx_lol_guess_slot ON lol_guesses USING btree (round_id, guess_number);

CREATE INDEX idx_lol_guesses_owner_id ON lol_guesses USING btree (owner_id);

CREATE INDEX idx_lol_guesses_round_id ON lol_guesses USING btree (round_id);

CREATE INDEX idx_lol_letters_guess_id ON lol_letters USING btree (guess_id);

CREATE INDEX idx_lol_rounds_game_id ON lol_rounds USING btree (game_id);

CREATE INDEX idx_mp_lol_game_players_user_id ON mp_lol_game_players USING btree (user_id);

CREATE INDEX idx_mp_lol_games_lobby_id ON mp_lol_games USING btree (lobby_id);

CREATE INDEX idx_mp_lol_games_owner_id ON mp_lol_games USING btree (owner_id);

CREATE INDEX idx_mp_lol_lobbies_owner_id ON mp_lol_lobbies USING btree (owner_id);

CREATE INDEX idx_mp_lol_lobbies_tournament_id ON mp_lol_lobbies USING btree (tournament_id);

CREATE INDEX idx_mp_lol_lobby_players_user_id ON mp_lol_lobby_players USING btree (user_id);

CREATE INDEX idx_oou_answers_user_id ON oou_answers USING btree (user_id);

CREATE INDEX idx_oou_game_players_user_id ON oou_game_players USING btree (user_id);

CREATE INDEX idx_oou_lobbies_game_id ON oou_lobbies USING btree (game_id);

CREATE INDEX idx_oou_lobbies_owner_id ON oou_lobbies USING btree (owner_id);

CREATE INDEX idx_oou_lobbies_rematch_code ON oou_lobbies USING btree (rematch_code);

CREATE INDEX idx_oou_lobby_players_user_id ON oou_lobby_players USING btree (user_id);

CREATE INDEX idx_oou_local_players_session_id ON oou_local_players USING btree (session_id);

CREATE INDEX idx_oou_multi_device_games_lobby_id ON oou_multi_device_games USING btree (lobby_id);

CREATE INDEX idx_oou_multi_device_games_owner_id ON oou_multi_device_games USING btree (owner_id);

CREATE UNIQUE INDEX idx_oou_round_game_number ON oou_rounds USING btree (game_id, number);

CREATE INDEX idx_oou_single_device_games_owner_id ON oou_single_device_games USING btree (owner_id);

CREATE INDEX idx_oou_votes_accused_user_id ON oou_votes USING btree (accused_user_id);

CREATE INDEX idx_oou_votes_voter_user_id ON oou_votes USING btree (voter_user_id);

CREATE INDEX idx_pq_answers_question_id ON pq_answers USING btree (question_id);

CREATE INDEX idx_pq_lobbies_owner_id ON pq_lobbies USING btree (owner_id);

CREATE INDEX idx_pq_lobbies_quiz_id ON pq_lobbies USING btree (quiz_id);

CREATE INDEX idx_pq_lobbies_session_id ON pq_lobbies USING btree (session_id);

CREATE INDEX idx_pq_lobby_players_user_id ON pq_lobby_players USING btree (user_id);

CREATE UNIQUE INDEX idx_pq_question_slot ON pq_questions USING btree (quiz_id, round, "position");

CREATE INDEX idx_pq_questions_quiz_id ON pq_questions USING btree (quiz_id);

CREATE INDEX idx_pq_quiz_shelf ON pq_quizzes USING btree (locale, category, slug);

CREATE UNIQUE INDEX idx_pq_quiz_slug ON pq_quizzes USING btree (locale, slug);

CREATE INDEX idx_pq_session_answers_session_id ON pq_session_answers USING btree (session_id);

CREATE INDEX idx_pq_session_answers_session_question_id ON pq_session_answers USING btree (session_question_id);

CREATE INDEX idx_pq_session_guesses_session_id ON pq_session_guesses USING btree (session_id);

CREATE INDEX idx_pq_session_players_user_id ON pq_session_players USING btree (user_id);

CREATE INDEX idx_pq_session_questions_question_id ON pq_session_questions USING btree (question_id);

CREATE INDEX idx_pq_session_questions_session_id ON pq_session_questions USING btree (session_id);

CREATE UNIQUE INDEX idx_pq_session_slot ON pq_session_questions USING btree (session_id, round, "position");

CREATE INDEX idx_pq_sessions_lobby_id ON pq_sessions USING btree (lobby_id);

CREATE INDEX idx_pq_sessions_owner_id ON pq_sessions USING btree (owner_id);

CREATE INDEX idx_pq_sessions_quiz_id ON pq_sessions USING btree (quiz_id);

CREATE INDEX idx_sessions_expires_at ON sessions USING btree (expires_at);

CREATE INDEX idx_sessions_user_id ON sessions USING btree (user_id);

CREATE INDEX idx_solo_lol_games_owner_id ON solo_lol_games USING btree (owner_id);

CREATE INDEX idx_tn_lol_match_players_user_id ON tn_lol_match_players USING btree (user_id);

CREATE INDEX idx_tn_lol_matches_game_id ON tn_lol_matches USING btree (game_id);

CREATE INDEX idx_tn_lol_matches_tournament_id ON tn_lol_matches USING btree (tournament_id);

CREATE INDEX idx_tn_lol_matches_winner_id ON tn_lol_matches USING btree (winner_id);

CREATE INDEX idx_tn_lol_tournament_players_user_id ON tn_lol_tournament_players USING btree (user_id);

CREATE INDEX idx_tn_lol_tournaments_lobby_id ON tn_lol_tournaments USING btree (lobby_id);

CREATE INDEX idx_tn_lol_tournaments_owner_id ON tn_lol_tournaments USING btree (owner_id);

CREATE INDEX idx_tn_lol_tournaments_winner_id ON tn_lol_tournaments USING btree (winner_id);

CREATE UNIQUE INDEX idx_users_email ON users USING btree (email);

ALTER TABLE ONLY ff_game_players
    ADD CONSTRAINT fk_ff_games_players FOREIGN KEY (game_id) REFERENCES ff_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY ff_rounds
    ADD CONSTRAINT fk_ff_games_rounds FOREIGN KEY (game_id) REFERENCES ff_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY ff_lobby_players
    ADD CONSTRAINT fk_ff_lobbies_players FOREIGN KEY (lobby_id) REFERENCES ff_lobbies(id) ON DELETE CASCADE;

ALTER TABLE ONLY ff_round_options
    ADD CONSTRAINT fk_ff_rounds_options FOREIGN KEY (round_id) REFERENCES ff_rounds(id) ON DELETE CASCADE;

ALTER TABLE ONLY ff_votes
    ADD CONSTRAINT fk_ff_rounds_votes FOREIGN KEY (round_id) REFERENCES ff_rounds(id) ON DELETE CASCADE;

ALTER TABLE ONLY lol_letters
    ADD CONSTRAINT fk_lol_guesses_letters FOREIGN KEY (guess_id) REFERENCES lol_guesses(id) ON DELETE CASCADE;

ALTER TABLE ONLY lol_guesses
    ADD CONSTRAINT fk_lol_rounds_guesses FOREIGN KEY (round_id) REFERENCES lol_rounds(id) ON DELETE CASCADE;

ALTER TABLE ONLY mp_lol_game_players
    ADD CONSTRAINT fk_mp_lol_games_players FOREIGN KEY (game_id) REFERENCES mp_lol_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY mp_lol_lobby_players
    ADD CONSTRAINT fk_mp_lol_lobbies_players FOREIGN KEY (lobby_id) REFERENCES mp_lol_lobbies(id) ON DELETE CASCADE;

ALTER TABLE ONLY oou_lobby_players
    ADD CONSTRAINT fk_oou_lobbies_players FOREIGN KEY (lobby_id) REFERENCES oou_lobbies(id) ON DELETE CASCADE;

ALTER TABLE ONLY oou_game_players
    ADD CONSTRAINT fk_oou_multi_device_games_players FOREIGN KEY (game_id) REFERENCES oou_multi_device_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY oou_rounds
    ADD CONSTRAINT fk_oou_multi_device_games_rounds FOREIGN KEY (game_id) REFERENCES oou_multi_device_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY oou_answers
    ADD CONSTRAINT fk_oou_rounds_answers FOREIGN KEY (round_id) REFERENCES oou_rounds(id) ON DELETE CASCADE;

ALTER TABLE ONLY oou_votes
    ADD CONSTRAINT fk_oou_rounds_votes FOREIGN KEY (round_id) REFERENCES oou_rounds(id) ON DELETE CASCADE;

ALTER TABLE ONLY oou_local_players
    ADD CONSTRAINT fk_oou_single_device_games_players FOREIGN KEY (session_id) REFERENCES oou_single_device_games(id) ON DELETE CASCADE;

ALTER TABLE ONLY pq_lobby_players
    ADD CONSTRAINT fk_pq_lobbies_players FOREIGN KEY (lobby_id) REFERENCES pq_lobbies(id) ON DELETE CASCADE;

ALTER TABLE ONLY pq_answers
    ADD CONSTRAINT fk_pq_questions_answers FOREIGN KEY (question_id) REFERENCES pq_questions(id) ON DELETE CASCADE;

ALTER TABLE ONLY pq_questions
    ADD CONSTRAINT fk_pq_quizzes_questions FOREIGN KEY (quiz_id) REFERENCES pq_quizzes(id) ON DELETE CASCADE;

ALTER TABLE ONLY pq_session_players
    ADD CONSTRAINT fk_pq_sessions_players FOREIGN KEY (session_id) REFERENCES pq_sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY pq_session_questions
    ADD CONSTRAINT fk_pq_sessions_questions FOREIGN KEY (session_id) REFERENCES pq_sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY tn_lol_match_players
    ADD CONSTRAINT fk_tn_lol_matches_players FOREIGN KEY (match_id) REFERENCES tn_lol_matches(id) ON DELETE CASCADE;

ALTER TABLE ONLY tn_lol_matches
    ADD CONSTRAINT fk_tn_lol_tournaments_matches FOREIGN KEY (tournament_id) REFERENCES tn_lol_tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY tn_lol_tournament_players
    ADD CONSTRAINT fk_tn_lol_tournaments_players FOREIGN KEY (tournament_id) REFERENCES tn_lol_tournaments(id) ON DELETE CASCADE;


-- +goose Down
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tn_lol_tournaments CASCADE;
DROP TABLE IF EXISTS tn_lol_tournament_players CASCADE;
DROP TABLE IF EXISTS tn_lol_matches CASCADE;
DROP TABLE IF EXISTS tn_lol_match_players CASCADE;
DROP TABLE IF EXISTS solo_lol_high_scores CASCADE;
DROP TABLE IF EXISTS solo_lol_games CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS pq_sessions CASCADE;
DROP TABLE IF EXISTS pq_session_questions CASCADE;
DROP TABLE IF EXISTS pq_session_players CASCADE;
DROP TABLE IF EXISTS pq_session_guesses CASCADE;
DROP TABLE IF EXISTS pq_session_answers CASCADE;
DROP TABLE IF EXISTS pq_quizzes CASCADE;
DROP TABLE IF EXISTS pq_quiz_plays CASCADE;
DROP TABLE IF EXISTS pq_questions CASCADE;
DROP TABLE IF EXISTS pq_lobby_players CASCADE;
DROP TABLE IF EXISTS pq_lobbies CASCADE;
DROP TABLE IF EXISTS pq_answers CASCADE;
DROP TABLE IF EXISTS oou_votes CASCADE;
DROP TABLE IF EXISTS oou_single_device_games CASCADE;
DROP TABLE IF EXISTS oou_rounds CASCADE;
DROP TABLE IF EXISTS oou_multi_device_games CASCADE;
DROP TABLE IF EXISTS oou_local_players CASCADE;
DROP TABLE IF EXISTS oou_lobby_players CASCADE;
DROP TABLE IF EXISTS oou_lobbies CASCADE;
DROP TABLE IF EXISTS oou_game_players CASCADE;
DROP TABLE IF EXISTS oou_answers CASCADE;
DROP TABLE IF EXISTS mp_lol_lobby_players CASCADE;
DROP TABLE IF EXISTS mp_lol_lobbies CASCADE;
DROP TABLE IF EXISTS mp_lol_games CASCADE;
DROP TABLE IF EXISTS mp_lol_game_players CASCADE;
DROP TABLE IF EXISTS lol_rounds CASCADE;
DROP TABLE IF EXISTS lol_letters CASCADE;
DROP TABLE IF EXISTS lol_guesses CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS friend_invites CASCADE;
DROP TABLE IF EXISTS ff_votes CASCADE;
DROP TABLE IF EXISTS ff_rounds CASCADE;
DROP TABLE IF EXISTS ff_round_options CASCADE;
DROP TABLE IF EXISTS ff_lobby_players CASCADE;
DROP TABLE IF EXISTS ff_lobbies CASCADE;
DROP TABLE IF EXISTS ff_games CASCADE;
DROP TABLE IF EXISTS ff_game_players CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TABLE IF EXISTS daily_lol_words CASCADE;
DROP TABLE IF EXISTS daily_lol_games CASCADE;

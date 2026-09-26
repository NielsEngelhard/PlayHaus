-- One row of running totals: how many games of each mode have been created.

-- +goose Up
CREATE TABLE games_played_aggregated_data (
    id bigint NOT NULL,
    lol_wod_played bigint DEFAULT 0 NOT NULL,
    lol_solo_played bigint DEFAULT 0 NOT NULL,
    lol_mp_played bigint DEFAULT 0 NOT NULL,
    qz_singledevice_played bigint DEFAULT 0 NOT NULL,
    qz_multidevice_played bigint DEFAULT 0 NOT NULL,
    qz_multidevice_withhostscreen_played bigint DEFAULT 0 NOT NULL,
    oou_single_device_played bigint DEFAULT 0 NOT NULL,
    oou_multidevice_played bigint DEFAULT 0 NOT NULL,
    ff_played bigint DEFAULT 0 NOT NULL,
    ww_played bigint DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY games_played_aggregated_data
    ADD CONSTRAINT games_played_aggregated_data_pkey PRIMARY KEY (id);

INSERT INTO games_played_aggregated_data (id) VALUES (1);

-- +goose Down
DROP TABLE games_played_aggregated_data;

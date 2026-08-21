/**
 * The knobs a solo game is set up with. These mirror `MinWordLength`/`MaxWordLength`
 * in the API (`internal/league-of-letters/league-of-letters.go`) — keep the two in
 * step, since the values travel to the backend as-is.
 *
 * The language list is not here: it moved to `@/constants/languages` once an
 * account gained a language of its own, and a game only borrows it.
 */

import { DEFAULT_LANGUAGE, type LanguageCode } from '@/constants/languages';

/**
 * All five have word lists behind them, in both languages.
 *
 * Three is not among them: the backend enforces four to eight and ships no
 * three-letter lists, and with the opening letter given away a three-letter word
 * would be a two-letter puzzle anyway.
 */
export const WORD_LENGTHS = [4, 5, 6, 7, 8] as const;

export type WordLength = typeof WORD_LENGTHS[number];

/**
 * The shape of a solo game, for the setup screen to promise before one exists.
 *
 * Mirrors the backend, which is where these are actually decided: `MaxGuesses` in
 * `internal/league-of-letters/league-of-letters.go`, and `determineNumberOfRounds(1)`
 * in `internal/league-of-letters/service.go`. Keep the two in step.
 *
 * Duplicated here rather than read off the game because the setup screen shows them
 * *before* it creates anything — the server's `Game` carries `totalRounds` and
 * `maxGuesses`, but only once there is a game to carry them, which is after the one
 * button on this screen has already been pressed. Every screen that has a real `Game`
 * reads them off it instead of using these.
 */
export const SOLO_ROUNDS = 3;
export const SOLO_MAX_GUESSES = 6;

/**
 * Named to match the create-game body exactly, so the settings can be sent as
 * they stand. The backend rejects unknown fields, so a spare key here is a 400.
 */
export interface SoloSettings {
    locale: LanguageCode,
    wordLength: WordLength,
    hardMode: boolean,
    secondsPerGuess: number
}

/**
 * Classic League of Letters: five letters, Dutch.
 *
 * The locale here is only what a screen starts from before it knows whose game it
 * is — both the solo settings screen and the lobby replace it with the account's
 * own language as soon as the session has one.
 */
export const DEFAULT_LOL_SETTINGS: SoloSettings = {
    locale: DEFAULT_LANGUAGE,
    wordLength: 5,
    hardMode: false,
    secondsPerGuess: 35
};

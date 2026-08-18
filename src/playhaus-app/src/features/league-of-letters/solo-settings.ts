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
 * Named to match the create-game body exactly, so the settings can be sent as
 * they stand. The backend rejects unknown fields, so a spare key here is a 400.
 */
export interface SoloSettings {
    locale: LanguageCode,
    wordLength: WordLength
}

/**
 * Classic League of Letters: five letters, Dutch.
 *
 * The locale here is only what a screen starts from before it knows whose game it
 * is — both the solo settings screen and the lobby replace it with the account's
 * own language as soon as the session has one.
 */
export const DEFAULT_SOLO_SETTINGS: SoloSettings = {
    locale: DEFAULT_LANGUAGE,
    wordLength: 5
};

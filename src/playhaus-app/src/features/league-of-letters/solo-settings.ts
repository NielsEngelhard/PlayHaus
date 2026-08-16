/**
 * The knobs a solo game is set up with. These mirror `MinWordLength`/`MaxWordLength`
 * and `i18n.Locale` in the API (`internal/league-of-letters/league-of-letters.go`) —
 * keep the two in step, since the values travel to the backend as-is.
 */

/**
 * All five have word lists behind them, in both languages.
 *
 * Three is not among them: the backend enforces four to eight and ships no
 * three-letter lists, and with the opening letter given away a three-letter word
 * would be a two-letter puzzle anyway.
 */
export const WORD_LENGTHS = [4, 5, 6, 7, 8] as const;

export type WordLength = typeof WORD_LENGTHS[number];

export type LanguageCode = 'nl' | 'en';

export interface Language {
    code: LanguageCode,
    label: string,
    description: string
}

export const LANGUAGES: Language[] = [
    { code: 'nl', label: 'Nederlands', description: 'Woorden uit de Nederlandse lijst.' },
    { code: 'en', label: 'Engels', description: 'Woorden uit de Engelse lijst.' }
];

/**
 * Named to match the create-game body exactly, so the settings can be sent as
 * they stand. The backend rejects unknown fields, so a spare key here is a 400.
 */
export interface SoloSettings {
    locale: LanguageCode,
    wordLength: WordLength
}

/** Classic League of Letters: five letters, Dutch. */
export const DEFAULT_SOLO_SETTINGS: SoloSettings = {
    locale: 'nl',
    wordLength: 5
};

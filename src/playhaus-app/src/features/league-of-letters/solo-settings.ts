/**
 * The knobs a solo game is set up with. These mirror `WordLanguage` and `WordLength`
 * in the API (`internal/leagueofletters/words/wordlist-types.go`) — keep the two in
 * step, since the values travel to the backend as-is.
 */

/**
 * The API's `ParseLength` accepts all six, but only the 4-, 5- and 6-letter word lists
 * are embedded today — 3, 7 and 8 parse and then 404 on `/words/random`. Harmless while
 * creating a game is mocked; the lists need to land before this goes near the real call.
 */
export const WORD_LENGTHS = [3, 4, 5, 6, 7, 8] as const;

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

export interface SoloSettings {
    language: LanguageCode,
    wordLength: WordLength
}

/** Classic League of Letters: five letters, Dutch. */
export const DEFAULT_SOLO_SETTINGS: SoloSettings = {
    language: 'nl',
    wordLength: 5
};

// The knobs a solo game is set up with.

import { DEFAULT_LANGUAGE, type LanguageCode } from '@/constants/languages';

// All five have word lists behind them, in both languages.
export const WORD_LENGTHS = [4, 5, 6, 7, 8] as const;

export type WordLength = typeof WORD_LENGTHS[number];

// The shape of a solo game, for the setup screen to promise before one exists.
export const SOLO_ROUNDS = 3;
export const SOLO_MAX_GUESSES = 6;

// Named to match the create-game body exactly, so the settings can be sent as they stand.
export interface SoloSettings {
    locale: LanguageCode,
    wordLength: WordLength,
    hardMode: boolean,
}

// Classic League of Letters: five letters, Dutch.
export const DEFAULT_LOL_SETTINGS: SoloSettings = {
    locale: DEFAULT_LANGUAGE,
    wordLength: 5,
    hardMode: false,
};

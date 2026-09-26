// The knobs a solo game is set up with.

import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from '@/constants/languages';
import { boolParam, firstParam, toBoolParam } from '@/utils/search-params';

// All five have word lists behind them, in both languages.
export const WORD_LENGTHS = [4, 5, 6, 7, 8] as const;

export type WordLength = typeof WORD_LENGTHS[number];

// The shape of a solo game, for the setup screen to promise before one exists.
export const SOLO_ROUNDS = 3;
export const SOLO_MAX_GUESSES = 6;

// Zen is the game with nothing riding on it; competitive runs the clock and keeps score.
export type SoloMode = 'zen' | 'competitive';

// In the order the toggle shows them.
export const SOLO_MODES = ['zen', 'competitive'] as const satisfies readonly SoloMode[];

// After this long a competitive run is worth no bonus at all. Mirrors `lol.TimeBonusZeroAt`.
export const BONUS_WINDOW_MINUTES = 6;

// The knobs the setup screen holds, translated into the create-game body at the API boundary.
export interface SoloSettings {
    hardMode: boolean,
    locale: LanguageCode,
    mode: SoloMode,
    wordLength: WordLength,
}

// Classic League of Letters: five letters, Dutch, and no pressure.
export const DEFAULT_LOL_SETTINGS: SoloSettings = {
    hardMode: false,
    locale: DEFAULT_LANGUAGE,
    mode: 'zen',
    wordLength: 5,
};

// The same knobs as query params, which is how "play again" carries them from the finished game back to the setup screen.
export type SoloSettingsParams = Record<keyof SoloSettings, string>;

export function soloSettingsToParams(settings: SoloSettings): SoloSettingsParams {
    return {
        hardMode: toBoolParam(settings.hardMode),
        locale: settings.locale,
        mode: settings.mode,
        wordLength: String(settings.wordLength),
    };
}

// All or nothing: null unless every knob is there and valid, so a hand-edited URL falls back to the defaults.
export function soloSettingsFromParams(params: Partial<Record<keyof SoloSettings, string | string[]>>): SoloSettings | null {
    const hardMode = boolParam(params.hardMode);
    const locale = firstParam(params.locale);
    const mode = SOLO_MODES.find(candidate => candidate === firstParam(params.mode));
    const wordLength = WORD_LENGTHS.find(candidate => String(candidate) === firstParam(params.wordLength));

    if (hardMode === undefined || !isLanguageCode(locale) || mode === undefined || wordLength === undefined) return null;

    return { hardMode, locale, mode, wordLength };
}

import type { ParseKeys } from 'i18next';

/**
 * Every key the catalogs define, as a type.
 *
 * For the handful of places a translation has to be *stored* rather than performed on
 * the spot. `GAMES` in `constants/games.ts` is the one that matters: it is a plain array
 * built at module load, outside React, where no hook can reach it — so it holds the key
 * and the page resolves it at render. This type is what stops that key being any old
 * string.
 *
 * i18next's own docs spell the same idea `Parameters<TFunction>[0]`; `ParseKeys` is the
 * narrower half of that union and gives better autocomplete.
 */
export type TranslationKey = ParseKeys;

/**
 * A key plus the values it interpolates, for the cases where the key alone is not the
 * whole of what has to be stored.
 *
 * `startedAgo` in `features/reconnect/game-kinds.ts` is the one that needs it: it picks
 * *which* phrase a timestamp deserves — "zojuist", so many minutes, a date — and that
 * choice is arithmetic rather than translation, but the number it counted has to travel
 * with the key to the render that resolves it.
 *
 * The error mappers next door deliberately return a bare `TranslationKey` instead: they
 * never interpolate, and a plain key is the simpler thing to store in state.
 */
export interface Phrase {
    key: TranslationKey,
    values?: Record<string, string | number>,
    /**
     * Values that are themselves keys, translated before they are interpolated.
     *
     * One case needs this: a date past a week old reads "op 3 mrt 2026", where the month
     * is a word that has to come out of the catalogue too. Kept apart from `values`
     * rather than guessed at, because a plain string value that happened to look like a
     * key would otherwise be silently translated.
     */
    keyValues?: Record<string, TranslationKey>
}

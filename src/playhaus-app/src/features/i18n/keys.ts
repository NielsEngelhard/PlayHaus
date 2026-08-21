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

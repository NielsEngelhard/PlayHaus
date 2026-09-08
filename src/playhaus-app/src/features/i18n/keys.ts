import type { ParseKeys } from 'i18next';

// Every key the catalogs define, as a type.
export type TranslationKey = ParseKeys;

// A key plus the values it interpolates, for the cases where the key alone is not the whole of what has to be stored.
export interface Phrase {
    key: TranslationKey,
    values?: Record<string, string | number>,
    // Values that are themselves keys, translated before they are interpolated.
    keyValues?: Record<string, TranslationKey>
}

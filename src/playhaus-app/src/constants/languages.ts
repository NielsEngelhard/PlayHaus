// The languages the app plays in.

import type { TranslationKey } from '@/features/i18n/keys';

export type LanguageCode = 'nl' | 'en';

export interface Language {
    code: LanguageCode,
    // The language's name in its own language, and never translated.
    label: string,
    // The second line in the picker, saying what choosing this actually changes.
    descriptionKey: TranslationKey,
    // ISO 3166-1 alpha-2 country code for `CountryFlag`.
    flag: string
}

export const LANGUAGES: Language[] = [
    { code: 'nl', label: 'Nederlands', descriptionKey: 'languages.nl.description', flag: 'nl' },
    { code: 'en', label: 'English', descriptionKey: 'languages.en.description', flag: 'gb' }
];

/** Dutch, matching `i18n.Default` in the backend. */
export const DEFAULT_LANGUAGE: LanguageCode = 'nl';

// Always answers with a language, never nothing.
export function languageByCode(code: string): Language {
    return LANGUAGES.find(language => language.code === code)
        ?? LANGUAGES.find(language => language.code === DEFAULT_LANGUAGE)!;
}

// The language the *interface* speaks when nobody has said which to speak.
export const FALLBACK_UI_LANGUAGE: LanguageCode = 'en';

// Narrows anything — a device locale, a value off the wire — to a language this build ships a catalog for.
export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
    return LANGUAGES.some(language => language.code === value);
}

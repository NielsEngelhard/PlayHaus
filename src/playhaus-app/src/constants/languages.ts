/**
 * The languages the app plays in.
 *
 * Mirrors `i18n.Locales` in the API (`internal/i18n/locale.go`) — keep the two in
 * step, since these codes travel to the backend as-is and it refuses anything not
 * on its own list. Adding one there also means adding its word lists under
 * `internal/league-of-letters/data/`.
 *
 * Lives in `constants` rather than under `features/league-of-letters`, which is
 * where it started: a language is an account setting now, and the profile screen
 * has no business importing from a game to find out what languages exist.
 */

import type { TranslationKey } from '@/features/i18n/keys';

export type LanguageCode = 'nl' | 'en';

export interface Language {
    code: LanguageCode,
    /**
     * The language's name in its own language, and never translated.
     *
     * A picker is the one screen someone reads *before* the interface speaks their
     * language, so "Nederlands" has to stay "Nederlands" even to a reader who is
     * currently being shown English. Not a catalogue key for the same reason.
     */
    label: string,
    /**
     * The second line in the picker, saying what choosing this actually changes.
     *
     * This half *is* translated, so a key: it is a sentence about the language rather
     * than the name of one. Stored rather than resolved because `LANGUAGES` is built at
     * module load, where no hook can reach.
     */
    descriptionKey: TranslationKey,
    /**
     * ISO 3166-1 alpha-2 country code for `CountryFlag` — a different thing from
     * the language code, since English is drawn with the flag of Great Britain.
     * `CountryFlag` only carries the flags in its own `FLAGS` map, so a new
     * language means adding one there too.
     */
    flag: string
}

export const LANGUAGES: Language[] = [
    { code: 'nl', label: 'Nederlands', descriptionKey: 'languages.nl.description', flag: 'nl' },
    { code: 'en', label: 'English', descriptionKey: 'languages.en.description', flag: 'gb' }
];

/** Dutch, matching `i18n.Default` in the backend. */
export const DEFAULT_LANGUAGE: LanguageCode = 'nl';

/**
 * Always answers with a language, never nothing.
 *
 * Every caller is drawing a flag or a label off an account's locale, and the
 * backend only ever stores one of the codes above — so a miss means the two
 * lists have drifted, and a header with a gap in it would be a worse way to find
 * that out than one showing the language the backend falls back to anyway.
 */
export function languageByCode(code: string): Language {
    return LANGUAGES.find(language => language.code === code)
        ?? LANGUAGES.find(language => language.code === DEFAULT_LANGUAGE)!;
}

/**
 * The language the *interface* speaks when nobody has said which to speak — before a
 * session is restored, and for anyone whose device asks for a language this app has no
 * catalog for.
 *
 * Deliberately not `DEFAULT_LANGUAGE`. That one is Dutch because the backend's word
 * lists default to Dutch, and it is a value that travels to the API; this one never
 * leaves the app and only decides which words this app paints. They answer different
 * questions and are allowed to disagree — collapsing them into one would mean either an
 * English speaker reading a Dutch home page, or a guest created without a choice getting
 * English word lists.
 */
export const FALLBACK_UI_LANGUAGE: LanguageCode = 'en';

/**
 * Narrows anything — a device locale, a value off the wire — to a language this build
 * ships a catalog for.
 *
 * A type guard rather than `languageByCode`'s "always answers with something": the
 * callers here need to tell "the device asked for Dutch" apart from "the device asked
 * for something we don't have", because those two lead to different fallbacks.
 */
export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
    return LANGUAGES.some(language => language.code === value);
}

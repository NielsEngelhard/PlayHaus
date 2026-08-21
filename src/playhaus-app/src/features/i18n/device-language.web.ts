import { isLanguageCode, type LanguageCode } from '@/constants/languages';

/**
 * The web half of `device-language.ts`. See that file for why this pair exists.
 *
 * Guarded on `window` rather than on `navigator`, which is the trap here: Node defines a
 * global `navigator` of its own, with a `userAgent` and no `language` at all, so a
 * `typeof navigator` check sails straight through the static pre-render and reads
 * `undefined`.
 */
export function deviceLanguage(): LanguageCode | null {
    if (typeof window === 'undefined') return null;

    // `languages` is the full ordered preference list; `language` is only the top one,
    // and is the fallback for anything that does not expose the list.
    const tags = window.navigator.languages ?? [window.navigator.language];

    for (const tag of tags) {
        // 'nl-BE' -> 'nl'. Lowercased because the region half is conventionally
        // capitalised, and not every browser stops there.
        const code = tag?.split('-')[0]?.toLowerCase();

        if (isLanguageCode(code)) return code;
    }

    return null;
}

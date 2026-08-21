import { isLanguageCode, type LanguageCode } from '@/constants/languages';
import { getLocales } from 'expo-localization';

/**
 * The first language on the device's own preference list that this app ships a catalog
 * for, or `null` when it ships none of them.
 *
 * Synchronous — `getLocales()` reads something the OS handed the process at launch — and
 * that is what lets the very first frame paint in the right language without the splash
 * screen being held on anything, the way `ThemeProvider` has to hold it for the stored
 * scheme.
 *
 * Reads `languageCode` rather than `languageTag`: the tag is `nl-BE`, and this app ships
 * catalogs per language, not per region.
 *
 * `device-language.web.ts` sits beside this file and Metro picks per platform — see
 * `theme-store.ts` for why that pair exists at all. Here the reason is narrower:
 * `expo-localization` must not be reachable from the web bundle's module scope, because
 * `output: "static"` pre-renders every route in Node.
 */
export function deviceLanguage(): LanguageCode | null {
    for (const locale of getLocales()) {
        if (isLanguageCode(locale.languageCode)) return locale.languageCode;
    }

    return null;
}

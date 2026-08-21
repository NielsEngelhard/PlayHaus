import { FALLBACK_UI_LANGUAGE, LANGUAGES } from '@/constants/languages';
import { resources } from '@/features/i18n/catalog';
import i18n, { use as registerModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * The app's one i18next instance, initialised at import time.
 *
 * Nothing in this file touches `window`, `navigator` or `localStorage`, and that is
 * deliberate: `app.json` sets `web: { output: "static" }`, so every route is pre-rendered
 * in Node, where reaching for a browser API at module scope breaks the export. There is
 * nothing to detect and nothing to fetch here because the whole catalog is an object
 * Metro already bundled. Device-locale detection lives behind the platform fork in
 * `device-language.ts` precisely so it cannot be dragged in here.
 *
 * Note for whoever adds the first plural: Hermes ships no `Intl.PluralRules`, and
 * i18next dropped its `compatibilityJSON: 'v3'` fallback in v24 — so without a polyfill
 * only English-style one/other forms resolve, and Dutch counts wrong. The fix is
 * `npm install intl-pluralrules` and then `import 'intl-pluralrules';` as the *first*
 * line of this file, above every other import. It is a no-op where the runtime already
 * has the API, so it needs no `.web.ts` fork.
 */
if (!i18n.isInitialized) {
    // Imported as a named export rather than called as `i18n.use(...)`, which trips
    // `import/no-named-as-default-member` — and renamed on the way in, because a bare
    // `use` is React 19's own hook and the rules-of-hooks lint reads a top-level call to
    // it as a violation. i18next binds this to the same default instance in its
    // constructor. Registering `initReactI18next` on that instance is what lets
    // `useTranslation()` work anywhere without an `<I18nextProvider>` above it.
    void registerModule(initReactI18next)
        .init({
            resources,
            /**
             * Where the instance starts. Which language is actually painted is decided
             * per render, by `useT()` handing `lng` down from React state — see
             * `LanguageContext.tsx` for why this singleton is not allowed to be the
             * source of truth.
             */
            lng: FALLBACK_UI_LANGUAGE,
            fallbackLng: FALLBACK_UI_LANGUAGE,
            supportedLngs: LANGUAGES.map(language => language.code),
            defaultNS: 'translation',
            /**
             * The resources are already in memory, so deferring init into a `setTimeout`
             * would only guarantee that the first render happens before the store is
             * ready. (This option was `initImmediate` until v24 renamed it.)
             */
            initAsync: false,
            /**
             * React escapes everything it renders, and React Native has no HTML to inject
             * into anyway — left on, this would turn every apostrophe into `&#39;`.
             */
            interpolation: { escapeValue: false },
            returnNull: false,
            react: {
                /**
                 * Non-negotiable here: `useTranslation` *throws a promise* when it is not
                 * ready, and the root layout renders a bare `Slot` with no `<Suspense>`
                 * boundary anywhere above it. With everything bundled it is always ready,
                 * so switching this off only ever costs a warning nobody will see.
                 */
                useSuspense: false
            }
        });
}

export default i18n;

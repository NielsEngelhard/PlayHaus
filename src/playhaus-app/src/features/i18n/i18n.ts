import { FALLBACK_UI_LANGUAGE, LANGUAGES } from '@/constants/languages';
import { resources } from '@/features/i18n/catalog';
import i18n, { use as registerModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

// The app's one i18next instance, initialised at import time.
if (!i18n.isInitialized) {
    // Imported as a named export rather than called as `i18n.use(...)`, which trips `import/no-named-as-default-member`.
    void registerModule(initReactI18next)
        .init({
            resources,
            // Where the instance starts.
            lng: FALLBACK_UI_LANGUAGE,
            fallbackLng: FALLBACK_UI_LANGUAGE,
            supportedLngs: LANGUAGES.map(language => language.code),
            defaultNS: 'translation',
            // The resources are already in memory.
            initAsync: false,
            // React escapes everything it renders, and React Native has no HTML to inject into anyway.
            interpolation: { escapeValue: false },
            returnNull: false,
            react: {
                // Non-negotiable here: `useTranslation` *throws a promise* when it is not ready.
                useSuspense: false
            }
        });
}

export default i18n;

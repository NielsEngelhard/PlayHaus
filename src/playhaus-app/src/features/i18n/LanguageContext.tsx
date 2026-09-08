import { FALLBACK_UI_LANGUAGE, isLanguageCode, type LanguageCode } from '@/constants/languages';
import { useAuth } from '@/features/auth/useAuth';
import { deviceLanguage } from '@/features/i18n/device-language';
import i18n from '@/features/i18n/i18n';
import type { Phrase, TranslationKey } from '@/features/i18n/keys';
import type { TFunction } from 'i18next';
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageState {
    /** The language the interface is being painted in right now. */
    language: LanguageCode
}

const LanguageContext = createContext<LanguageState | undefined>(undefined);

// There is nothing to subscribe to.
function subscribeToDevice(): () => void {
    return () => { };
}

/** What the device asks for during the static web pre-render: nothing, in Node. */
function noDeviceLanguage(): LanguageCode | null {
    return null;
}

// Decides which language the interface speaks, for the whole app.
export function LanguageProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    // The device's own preference, read straight during render rather than mirrored into state.
    const device = useSyncExternalStore(subscribeToDevice, deviceLanguage, noDeviceLanguage);

    // Guarded rather than trusted.
    const account = isLanguageCode(user?.locale) ? user.locale : null;
    const language = account ?? device ?? FALLBACK_UI_LANGUAGE;

    // Keeps the singleton in step with React.
    useEffect(() => {
        void i18n.changeLanguage(language);
    }, [language]);

    const value = useMemo(() => ({ language }), [language]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageState(): LanguageState {
    const context = useContext(LanguageContext);

    if (context === undefined) {
        throw new Error('Language hooks must be used inside a LanguageProvider');
    }

    return context;
}

// The language the interface is in.
export function useUiLanguage(): LanguageCode {
    return useLanguageState().language;
}

// The translator.
export function useT(): TFunction {
    const language = useUiLanguage();
    const options = useMemo(() => ({ lng: language }), [language]);
    const { t } = useTranslation(undefined, options);

    return t;
}

// The translator, for a `Phrase` — a key that was chosen somewhere no hook could reach and carried here with the values it interpolates.
export function usePhrase(): (phrase: Phrase) => string {
    const t = useT();

    // `t`'s own overloads cannot see that a `Phrase`'s key and its values belong together.
    const translate = t as (key: TranslationKey, values?: Record<string, string | number>) => string;

    return useCallback((phrase: Phrase) => {
        const translated = phrase.keyValues
            ? Object.fromEntries(Object.entries(phrase.keyValues).map(([name, key]) => [name, translate(key)]))
            : undefined;

        return translate(phrase.key, { ...phrase.values, ...translated });
    }, [translate]);
}

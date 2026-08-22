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

/**
 * There is nothing to subscribe to: iOS fixes its locales for the lifetime of the
 * process, and while Android can change them under a running app it does so by
 * recreating the activity, which remounts this provider anyway.
 */
function subscribeToDevice(): () => void {
    return () => { };
}

/** What the device asks for during the static web pre-render: nothing, in Node. */
function noDeviceLanguage(): LanguageCode | null {
    return null;
}

/**
 * Decides which language the interface speaks, for the whole app.
 *
 * Derived, never set — the same shape `ThemeProvider` uses for `scheme`, and for the
 * same reason. There is no `setLanguage` here because there is nothing for it to set:
 * the account's `locale` is the answer, it is server-persisted, and the profile screen
 * already changes it through `useProfile().updateLocale`, which patches the session. That
 * one round trip re-renders this provider and the whole UI changes language with it,
 * without this file ever having to know the profile screen exists.
 *
 * Three sources, in order:
 *   1. the signed-in account's `locale` — the requirement, and the only one of the three
 *      that is a real answer rather than a guess;
 *   2. the device's own languages, for the window where there is no session to ask:
 *      `status` is `restoring` on every launch, and a signed-out visitor sits behind
 *      `AuthGate` with the home page visible underneath it;
 *   3. `FALLBACK_UI_LANGUAGE` — English — for a device that asks for neither.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    /**
     * The device's own preference, read straight during render rather than mirrored into
     * state.
     *
     * `useSyncExternalStore` and not `useState` + an effect, for the web export's sake.
     * `output: "static"` pre-renders every route in Node, where `deviceLanguage()` has no
     * `window` to ask — so the third argument answers for the pre-render, React re-reads
     * for real once the page hydrates, and the two never disagree mid-commit the way a
     * set-state-in-an-effect would. On native the pre-render arm is simply never called,
     * and `getLocales()` is synchronous, so the very first frame is already in the right
     * language.
     */
    const device = useSyncExternalStore(subscribeToDevice, deviceLanguage, noDeviceLanguage);

    /**
     * Guarded rather than trusted. `User.locale` is typed to the closed list, but it
     * arrives off the wire — and a backend that grew a third language before this app
     * shipped a catalog for it would otherwise paint every string on screen as its own
     * key.
     */
    const account = isLanguageCode(user?.locale) ? user.locale : null;
    const language = account ?? device ?? FALLBACK_UI_LANGUAGE;

    /**
     * Keeps the singleton in step with React. Nothing in the app reads it today —
     * `useT()` hands the language down explicitly instead — but anything translating
     * from outside a component will reach for `i18n.t`, and a singleton one language
     * behind is a bug nobody would think to come looking for in this file.
     *
     * An effect rather than a render-time call: `changeLanguage` emits events that make
     * other components set state.
     */
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

/**
 * The language the interface is in.
 *
 * For the things that need the code itself rather than a translated string — a flag, a
 * picker's current value, a value on its way to the API.
 */
export function useUiLanguage(): LanguageCode {
    return useLanguageState().language;
}

/**
 * The translator. One line at the top of a component, then `t('home.subtitle')`.
 *
 * Passing `lng` explicitly is the whole trick, and the reason this wrapper exists rather
 * than components calling `useTranslation()` directly. Left to itself that hook reads
 * `i18n.language` — module-level mutable state, changed outside React, reaching the tree
 * only through i18next's own event. Handing it the language from context instead makes
 * every rendered string a pure function of React state, which is what this app needs
 * under `reactCompiler: true`: the compiler is free to memoise the JSX around a `t(...)`
 * call and still be correct, because `t`'s identity changes precisely when `language`
 * does.
 *
 * The options object is memoised because react-i18next keys its `useSyncExternalStore`
 * subscription on that object's identity — a fresh literal every render would tear the
 * subscription down and rebuild it every render with it.
 */
export function useT(): TFunction {
    const language = useUiLanguage();
    const options = useMemo(() => ({ lng: language }), [language]);
    const { t } = useTranslation(undefined, options);

    return t;
}

/**
 * The translator, for a `Phrase` — a key that was chosen somewhere no hook could reach
 * and carried here with the values it interpolates.
 *
 * `startedAgo` is the one that produces them. The `keyValues` pass is what lets a phrase
 * hold a word that is itself in the catalogue, which is how "op 3 mrt 2026" gets its
 * month without the function that picked the date knowing what language it is in.
 */
export function usePhrase(): (phrase: Phrase) => string {
    const t = useT();

    /**
     * `t`'s own overloads cannot see that a `Phrase`'s key and its values belong
     * together: with the key widened to the whole union, TypeScript reaches for the
     * `(key, defaultValue)` overload and complains that an options object is not a
     * string. Narrowing the signature here says what is actually being called.
     */
    const translate = t as (key: TranslationKey, values?: Record<string, string | number>) => string;

    return useCallback((phrase: Phrase) => {
        const translated = phrase.keyValues
            ? Object.fromEntries(Object.entries(phrase.keyValues).map(([name, key]) => [name, translate(key)]))
            : undefined;

        return translate(phrase.key, { ...phrase.values, ...translated });
    }, [translate]);
}

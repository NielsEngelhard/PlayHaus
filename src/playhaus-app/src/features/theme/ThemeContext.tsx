import { Themes, type Scheme, type Theme } from '@/constants/theme';
import { readScheme, writeScheme } from '@/features/theme/theme-store';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

interface ThemeState {
    /** The resolved design system — palette, shadows, button chrome, page background. */
    theme: Theme
    /** Which of the two schemes is on. Light unless this player has said otherwise. */
    scheme: Scheme
    /**
     * False until the stored preference has been read back. The root layout holds the
     * splash screen on this, so nobody watches the app repaint itself a frame after launch.
     */
    ready: boolean
    setScheme: (scheme: Scheme) => void
    /** Flip to the other scheme, whichever one is showing right now. */
    toggle: () => void
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

/**
 * Decides light or dark, for the whole app. Wraps everything in the root layout.
 *
 * This is the only `if` in the codebase that asks which scheme is on. Every component
 * below it takes the answer through `useTheme()` or `createThemedStyles()` and never
 * names a scheme itself — which is what makes the toggle a one-line state change here
 * rather than something each stylesheet has to have been written to expect.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    /**
     * Light until somebody says otherwise, and the device does not get to say it.
     *
     * The app used to open in whatever scheme the phone was wearing, which meant a
     * fresh install on a dark phone was a dark app before anybody had asked for one.
     * A device-wide preference is not a choice about *this* app, and the paper the
     * whole design is drawn on is the light one — so every first launch is light, on
     * every phone, and only the toggle moves it. What that toggle chose is read back
     * out of storage below and is the one thing that can.
     */
    const [scheme, setSchemeState] = useState<Scheme>('light');
    const [ready, setReady] = useState(false);

    // Pull last launch's choice back in, once.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const stored = await readScheme();
                if (!cancelled && stored !== null) setSchemeState(stored);
            } catch {
                // A store that won't open is a preference we can't honour, not a reason
                // to fail to boot — the app stays on the light scheme it started in.
            } finally {
                // Inside `finally` on purpose: `ready` gates the splash screen, so a
                // throw above must not leave it held forever.
                if (!cancelled) setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const setScheme = useCallback((next: Scheme) => {
        setSchemeState(next);

        // Not awaited: the UI has already changed, and a write that fails only costs
        // the choice at next launch.
        void writeScheme(next);
    }, []);

    const toggle = useCallback(() => {
        setScheme(scheme === 'dark' ? 'light' : 'dark');
    }, [scheme, setScheme]);

    /**
     * Tell the platform too, so the parts of the UI this app does not draw — the
     * keyboard, native alerts, the text-selection handles — match the rest of it.
     *
     * Always an explicit override, never `'unspecified'`: the app does not follow the
     * device any more, so handing the platform back "whatever you were doing" would put
     * a dark keyboard under a light app on a dark phone.
     *
     * This is also why `app.json` keeps `userInterfaceStyle: "automatic"`. It reads
     * like the setting that caused the problem, but it is not — the scheme is decided
     * here. Pinning it to `light` there would lock the native side to light and make
     * this call a no-op, which is the toggle's dark mode broken.
     *
     * Native only. `react-native-web` has no `setColorScheme`.
     */
    useEffect(() => {
        if (Platform.OS === 'web') return;

        Appearance.setColorScheme(scheme);
    }, [scheme]);

    /**
     * The root view sits behind everything the app renders, including the gap a
     * bounced scroll opens up. Left alone it stays the platform default white, which
     * shows as a flash at the edges of a dark page.
     */
    useEffect(() => {
        void SystemUI.setBackgroundColorAsync(Themes[scheme].colors.background);
    }, [scheme]);

    const value = useMemo(
        () => ({ theme: Themes[scheme], scheme, ready, setScheme, toggle }),
        [scheme, ready, setScheme, toggle]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeState(): ThemeState {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error('Theme hooks must be used inside a ThemeProvider');
    }

    return context;
}

/**
 * The current design system.
 *
 * Reach for this when a colour is needed as a value — an icon's `color` prop, a fill
 * computed from data. Styles should go through `createThemedStyles` instead, which
 * builds each scheme's `StyleSheet` once rather than on every render.
 */
export function useTheme(): Theme {
    return useThemeState().theme;
}

/** For the toggle, and anything else that needs to change the scheme rather than read it. */
export function useScheme(): Pick<ThemeState, 'scheme' | 'setScheme' | 'toggle'> {
    const { scheme, setScheme, toggle } = useThemeState();

    return { scheme, setScheme, toggle };
}

/** Whether the stored preference has been read back yet. Used to hold the splash screen. */
export function useThemeReady(): boolean {
    return useThemeState().ready;
}

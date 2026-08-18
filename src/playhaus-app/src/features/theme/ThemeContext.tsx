import { Themes, type Scheme, type Theme } from '@/constants/theme';
import type { ThemeMode } from '@/features/theme/mode';
import { readThemeMode, writeThemeMode } from '@/features/theme/theme-store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

interface ThemeState {
    /** The resolved design system — palette, shadows, button chrome, page background. */
    theme: Theme
    /** What the app was told to do. `system` means "whatever the device says". */
    mode: ThemeMode
    /** What that resolved to. Always one of the two real schemes. */
    scheme: Scheme
    /**
     * False until the stored preference has been read back. The root layout holds the
     * splash screen on this, so nobody watches the app repaint itself a frame after launch.
     */
    ready: boolean
    setMode: (mode: ThemeMode) => void
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
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [ready, setReady] = useState(false);

    // Pull last launch's choice back in, once.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const stored = await readThemeMode();
                if (!cancelled && stored !== null) setModeState(stored);
            } catch {
                // A store that won't open is a preference we can't honour, not a reason
                // to fail to boot — the app falls back to following the device.
            } finally {
                // Inside `finally` on purpose: `ready` gates the splash screen, so a
                // throw above must not leave it held forever.
                if (!cancelled) setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // `unspecified` is a real value on Android, and it means the same as no answer.
    const scheme: Scheme = mode === 'system'
        ? (systemScheme === 'dark' ? 'dark' : 'light')
        : mode;

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);

        // Not awaited: the UI has already changed, and a write that fails only costs
        // the choice at next launch.
        void writeThemeMode(next);
    }, []);

    const toggle = useCallback(() => {
        setMode(scheme === 'dark' ? 'light' : 'dark');
    }, [scheme, setMode]);

    /**
     * Tell the platform too, so the parts of the UI this app does not draw — the
     * keyboard, native alerts, the text-selection handles — match the rest of it.
     *
     * Keyed on `mode` rather than `scheme`, and handing back `'unspecified'` for
     * `system`: an explicit override makes `useColorScheme()` return that override
     * instead of the device's real answer, so clearing it is what lets `system` keep
     * tracking the device.
     *
     * Native only. `react-native-web` has no `setColorScheme`.
     */
    useEffect(() => {
        if (Platform.OS === 'web') return;

        Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
    }, [mode]);

    /**
     * The root view sits behind everything the app renders, including the gap a
     * bounced scroll opens up. Left alone it stays the platform default white, which
     * shows as a flash at the edges of a dark page.
     */
    useEffect(() => {
        void SystemUI.setBackgroundColorAsync(Themes[scheme].colors.background);
    }, [scheme]);

    const value = useMemo(
        () => ({ theme: Themes[scheme], mode, scheme, ready, setMode, toggle }),
        [scheme, mode, ready, setMode, toggle]
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
export function useThemeMode(): Pick<ThemeState, 'mode' | 'scheme' | 'setMode' | 'toggle'> {
    const { mode, scheme, setMode, toggle } = useThemeState();

    return { mode, scheme, setMode, toggle };
}

/** Whether the stored preference has been read back yet. Used to hold the splash screen. */
export function useThemeReady(): boolean {
    return useThemeState().ready;
}

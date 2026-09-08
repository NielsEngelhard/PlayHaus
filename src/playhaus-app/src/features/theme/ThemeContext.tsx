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
    // False until the stored preference has been read back.
    ready: boolean
    setScheme: (scheme: Scheme) => void
    /** Flip to the other scheme, whichever one is showing right now. */
    toggle: () => void
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

// Decides light or dark, for the whole app.
export function ThemeProvider({ children }: { children: ReactNode }) {
    // Light until somebody says otherwise, and the device does not get to say it.
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
                // A store that won't open is a preference we can't honour, not a reason to fail to boot.
            } finally {
                // Inside `finally` on purpose: `ready` gates the splash screen, so a throw above must not leave it held forever.
                if (!cancelled) setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const setScheme = useCallback((next: Scheme) => {
        setSchemeState(next);

        // Not awaited: the UI has already changed, and a write that fails only costs the choice at next launch.
        void writeScheme(next);
    }, []);

    const toggle = useCallback(() => {
        setScheme(scheme === 'dark' ? 'light' : 'dark');
    }, [scheme, setScheme]);

    // Tell the platform too, so the parts of the UI this app does not draw.
    useEffect(() => {
        if (Platform.OS === 'web') return;

        Appearance.setColorScheme(scheme);
    }, [scheme]);

    // The root view sits behind everything the app renders, including the gap a bounced scroll opens up.
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

// The current design system.
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

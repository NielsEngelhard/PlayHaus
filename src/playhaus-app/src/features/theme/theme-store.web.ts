import type { ThemeMode } from '@/features/theme/mode';
import { isThemeMode } from '@/features/theme/mode';

/**
 * The web half of `theme-store.ts`. See that file for why this pair exists.
 *
 * `localStorage` rather than a cookie: the preference is only ever read by the client,
 * and this app pre-renders its pages in Node (`output: "static"`), where there is no
 * window at all — hence the guard on every access.
 */
const MODE_KEY = 'playhaus_theme_mode';

function storage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch {
        // Safari in private mode, and any browser with site data blocked, throws on
        // the property itself. The theme simply stops persisting, which is a far
        // better outcome than a crash on launch.
        return null;
    }
}

export async function readThemeMode(): Promise<ThemeMode | null> {
    const stored = storage()?.getItem(MODE_KEY);

    return isThemeMode(stored) ? stored : null;
}

export async function writeThemeMode(mode: ThemeMode): Promise<void> {
    try {
        storage()?.setItem(MODE_KEY, mode);
    } catch {
        // Over quota, or a store that reads fine and refuses writes. Not worth
        // failing a theme toggle over.
    }
}

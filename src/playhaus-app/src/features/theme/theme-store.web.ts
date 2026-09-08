import type { Scheme } from '@/constants/theme';
import { isScheme } from '@/features/theme/scheme';

// The web half of `theme-store.ts`.
const SCHEME_KEY = 'playhaus_theme_mode';

function storage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch {
        // Safari in private mode, and any browser with site data blocked, throws on the property itself.
        return null;
    }
}

export async function readScheme(): Promise<Scheme | null> {
    const stored = storage()?.getItem(SCHEME_KEY);

    return isScheme(stored) ? stored : null;
}

export async function writeScheme(scheme: Scheme): Promise<void> {
    try {
        storage()?.setItem(SCHEME_KEY, scheme);
    } catch {
        // Over quota, or a store that reads fine and refuses writes.
    }
}

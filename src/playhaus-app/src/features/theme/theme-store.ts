import * as SecureStore from 'expo-secure-store';

import type { ThemeMode } from '@/features/theme/mode';
import { isThemeMode } from '@/features/theme/mode';

/**
 * Where the chosen colour scheme lives between app launches.
 *
 * Nothing secret goes in here — it is a preference, not a credential — but
 * `expo-secure-store` is the key/value store this app already ships and configures,
 * so a theme flag rides along rather than pulling in a second storage library for
 * one string. It has no web implementation at all, which is why `theme-store.web.ts`
 * sits beside this file; Metro picks the right one per platform and callers import
 * `@/features/theme/theme-store` without caring which they got.
 */
const MODE_KEY = 'playhaus_theme_mode';

/** `null` for "never chosen", which is what keeps a fresh install on the system scheme. */
export async function readThemeMode(): Promise<ThemeMode | null> {
    const stored = await SecureStore.getItemAsync(MODE_KEY);

    // Guarded rather than cast: this string outlives any one build, so a mode that
    // used to exist and no longer does has to read as "never chosen" instead of
    // being handed to the provider as a scheme it cannot resolve.
    return isThemeMode(stored) ? stored : null;
}

export async function writeThemeMode(mode: ThemeMode): Promise<void> {
    await SecureStore.setItemAsync(MODE_KEY, mode);
}

import * as SecureStore from 'expo-secure-store';

import type { Scheme } from '@/constants/theme';
import { isScheme } from '@/features/theme/scheme';

/**
 * Where the chosen colour scheme lives between app launches.
 *
 * Nothing secret goes in here — it is a preference, not a credential — but
 * `expo-secure-store` is the key/value store this app already ships and configures,
 * so a theme flag rides along rather than pulling in a second storage library for
 * one string. It has no web implementation at all, which is why `theme-store.web.ts`
 * sits beside this file; Metro picks the right one per platform and callers import
 * `@/features/theme/theme-store` without caring which they got.
 *
 * The key still says `mode`, from when the stored value was a three-state mode rather
 * than a scheme. Left alone on purpose: renaming it would read as "never chosen" on
 * every phone that already has a choice on it, and quietly throw that choice away.
 */
const SCHEME_KEY = 'playhaus_theme_mode';

/** `null` for "never chosen", which is what keeps a fresh install on the light scheme. */
export async function readScheme(): Promise<Scheme | null> {
    const stored = await SecureStore.getItemAsync(SCHEME_KEY);

    // Guarded rather than cast: this string outlives any one build, so a value that
    // used to mean something and no longer does has to read as "never chosen" instead
    // of being handed to the provider as a scheme it cannot resolve.
    return isScheme(stored) ? stored : null;
}

export async function writeScheme(scheme: Scheme): Promise<void> {
    await SecureStore.setItemAsync(SCHEME_KEY, scheme);
}

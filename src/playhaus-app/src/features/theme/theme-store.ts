import * as SecureStore from 'expo-secure-store';

import type { Scheme } from '@/constants/theme';
import { isScheme } from '@/features/theme/scheme';

// Where the chosen colour scheme lives between app launches.
const SCHEME_KEY = 'playhaus_theme_mode';

/** `null` for "never chosen", which is what keeps a fresh install on the light scheme. */
export async function readScheme(): Promise<Scheme | null> {
    const stored = await SecureStore.getItemAsync(SCHEME_KEY);

    // Guarded rather than cast: this string outlives any one build.
    return isScheme(stored) ? stored : null;
}

export async function writeScheme(scheme: Scheme): Promise<void> {
    await SecureStore.setItemAsync(SCHEME_KEY, scheme);
}

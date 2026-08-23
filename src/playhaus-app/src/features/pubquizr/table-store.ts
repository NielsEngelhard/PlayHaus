import * as SecureStore from 'expo-secure-store';

import { parseTable } from '@/features/pubquizr/one-device-table';

/**
 * The last table that played, so the same group does not type itself in twice.
 *
 * A pub quiz is played by the same people most weeks, and the seating order is the one
 * thing this screen asks somebody to be careful about — throwing it away between
 * sessions would make them careful about it again every time.
 *
 * Nothing secret goes in here, but `expo-secure-store` is the key/value store this app
 * already ships and configures, so a row of names rides along rather than pulling in a
 * second storage library — the same trade `features/theme/theme-store.ts` makes and
 * explains. It has no web implementation at all, which is why `table-store.web.ts` sits
 * beside this file; Metro picks the right one per platform and callers import
 * `@/features/pubquizr/table-store` without caring which they got.
 */
const TABLE_KEY = 'playhaus_pubquizr_table';

export async function readTable(): Promise<string[] | null> {
    try {
        return parseTable(await SecureStore.getItemAsync(TABLE_KEY));
    } catch {
        // A keychain that will not open is not worth failing a setup screen over. The
        // form simply starts empty, which is where it started before this existed.
        return null;
    }
}

export async function writeTable(names: string[]): Promise<void> {
    try {
        await SecureStore.setItemAsync(TABLE_KEY, JSON.stringify(names));
    } catch {
        // Same: the quiz is already starting by the time this is called, and a table
        // that failed to be remembered must not take the game down with it.
    }
}

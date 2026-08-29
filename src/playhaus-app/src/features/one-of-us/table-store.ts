import * as SecureStore from 'expo-secure-store';

import { parseTable } from '@/features/one-of-us/one-device-table';

/**
 * The last table that played, so the same group does not type itself in twice.
 *
 * Forked for web the way `features/pubquizr/table-store.ts` is, and for the same
 * reason: `expo-secure-store` is native-only, so the web build needs the localStorage
 * half next door. The parsing both halves need lives in `one-device-table.ts`, because
 * Metro resolves this module path to the `.web.ts` fork on web and a fork importing it
 * would be importing itself.
 */
const TABLE_KEY = 'playhaus_oneofus_table';

export async function readTable(): Promise<string[] | null> {
    try {
        return parseTable(await SecureStore.getItemAsync(TABLE_KEY));
    } catch {
        return null;
    }
}

export async function writeTable(names: string[]): Promise<void> {
    try {
        await SecureStore.setItemAsync(TABLE_KEY, JSON.stringify(names));
    } catch {
    }
}

import * as SecureStore from 'expo-secure-store';

import { parseTable } from '@/features/pubquizr/one-device-table';

// The last table that played, so the same group does not type itself in twice.
const TABLE_KEY = 'playhaus_pubquizr_table';

export async function readTable(): Promise<string[] | null> {
    try {
        return parseTable(await SecureStore.getItemAsync(TABLE_KEY));
    } catch {
        // A keychain that will not open is not worth failing a setup screen over.
        return null;
    }
}

export async function writeTable(names: string[]): Promise<void> {
    try {
        await SecureStore.setItemAsync(TABLE_KEY, JSON.stringify(names));
    } catch {
        // Same: the quiz is already starting by the time this is called.
    }
}

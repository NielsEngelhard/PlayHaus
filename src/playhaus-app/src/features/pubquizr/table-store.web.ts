import { parseTable } from '@/features/pubquizr/one-device-table';

/**
 * The web half of `table-store.ts`. See that file for why this pair exists, and
 * `features/theme/theme-store.web.ts` for why every access is guarded.
 */
const TABLE_KEY = 'playhaus_pubquizr_table';

function storage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch {
        // Safari in private mode, and any browser with site data blocked, throws on
        // the property itself.
        return null;
    }
}

export async function readTable(): Promise<string[] | null> {
    return parseTable(storage()?.getItem(TABLE_KEY));
}

export async function writeTable(names: string[]): Promise<void> {
    try {
        storage()?.setItem(TABLE_KEY, JSON.stringify(names));
    } catch {
        // Over quota, or a store that reads fine and refuses writes.
    }
}

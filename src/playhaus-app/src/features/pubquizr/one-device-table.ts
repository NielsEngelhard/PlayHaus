import type { TranslationKey } from "@/features/i18n/keys";
import {
    parseStoredTable,
    tableProblemOf,
    type TableLimits
} from "@/features/table/one-device-table";

export { duplicateSeats, seatedNames } from "@/features/table/one-device-table";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

const LIMITS: TableLimits = { min: MIN_PLAYERS, max: MAX_PLAYERS };

// What is wrong with this table, said in pubquizr's own words.
export function tableProblem(names: string[]): TranslationKey | null {
    switch (tableProblemOf(names, LIMITS)) {
        case 'tooFew':
            return 'pubquizr.oneDevice.players.tooFew';
        case 'tooMany':
            return 'pubquizr.oneDevice.players.tooMany';
        case 'duplicate':
            return 'pubquizr.oneDevice.players.duplicate';
        default:
            return null;
    }
}

// Reads a stored table back into a row of names.
export function parseTable(stored: string | null | undefined): string[] | null {
    return parseStoredTable(stored, MAX_PLAYERS);
}

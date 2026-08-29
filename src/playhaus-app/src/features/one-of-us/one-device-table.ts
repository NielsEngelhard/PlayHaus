import type { TranslationKey } from "@/features/i18n/keys";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/features/one-of-us/oou-settings";
import {
    parseStoredTable,
    tableProblemOf,
    type TableLimits
} from "@/features/table/one-device-table";

export { duplicateSeats, seatedNames } from "@/features/table/one-device-table";

const LIMITS: TableLimits = { min: MIN_PLAYERS, max: MAX_PLAYERS };

/** What is wrong with this table, said in One of Us's own words. */
export function tableProblem(names: string[]): TranslationKey | null {
    switch (tableProblemOf(names, LIMITS)) {
        case 'tooFew':
            return 'oneOfUs.singleDevice.players.tooFew';
        case 'tooMany':
            return 'oneOfUs.singleDevice.players.tooMany';
        case 'duplicate':
            return 'oneOfUs.singleDevice.players.duplicate';
        default:
            return null;
    }
}

/** See `features/pubquizr/one-device-table.ts` for why the parsing lives beside the store. */
export function parseTable(stored: string | null | undefined): string[] | null {
    return parseStoredTable(stored, MAX_PLAYERS);
}

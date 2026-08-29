import type { TranslationKey } from "@/features/i18n/keys";
import {
    parseStoredTable,
    tableProblemOf,
    type TableLimits
} from "@/features/table/one-device-table";

export { duplicateSeats, seatedNames } from "@/features/table/one-device-table";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

const LIMITS: TableLimits = { min: MIN_PLAYERS, max: MAX_PLAYERS };

/**
 * What is wrong with this table, said in pubquizr's own words.
 *
 * The checking is shared (`features/table/one-device-table.ts`); only the naming is
 * here. A key has to be a literal at the point the catalogue checks it, so each game
 * spells its own out rather than building them from the tag.
 */
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

/**
 * Reads a stored table back into a row of names.
 *
 * Lives here rather than in `table-store.ts` because both halves of that pair need it
 * and neither may import the other: Metro resolves `@/features/pubquizr/table-store` to
 * the `.web.ts` fork on web, so the fork importing that path would be importing itself.
 */
export function parseTable(stored: string | null | undefined): string[] | null {
    return parseStoredTable(stored, MAX_PLAYERS);
}

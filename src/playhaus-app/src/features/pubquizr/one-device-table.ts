import type { TranslationKey } from "@/features/i18n/keys";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;

export function seatedNames(names: string[]): string[] {
    return names.map(name => name.trim()).filter(name => name !== '');
}

export function duplicateSeats(names: string[]): boolean {
    const seen = new Set<string>();

    for (const name of seatedNames(names)) {
        const key = name.toLowerCase();
        if (seen.has(key)) return true;
        seen.add(key);
    }

    return false;
}

export function tableProblem(names: string[]): TranslationKey | null {
    const seated = seatedNames(names);

    if (seated.length < MIN_PLAYERS) return 'pubquizr.oneDevice.players.tooFew';
    if (seated.length > MAX_PLAYERS) return 'pubquizr.oneDevice.players.tooMany';
    if (duplicateSeats(names)) return 'pubquizr.oneDevice.players.duplicate';

    return null;
}

/**
 * Reads a stored table back into a row of names, or `null` when there is nothing usable
 * there.
 *
 * Lives here rather than in `table-store.ts` because both halves of that pair need it
 * and neither may import the other: Metro resolves `@/features/pubquizr/table-store` to
 * the `.web.ts` fork on web, so the fork importing that path would be importing itself.
 *
 * Parsed defensively rather than cast. The stored string outlives any one build, and a
 * shape that used to be written and no longer is has to read as "no table remembered"
 * instead of being handed to the form as seats it cannot draw.
 */
export function parseTable(stored: string | null | undefined): string[] | null {
    if (!stored) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(stored);
    } catch {
        return null;
    }

    if (!Array.isArray(parsed)) return null;

    const names = parsed
        .filter((name): name is string => typeof name === 'string')
        .slice(0, MAX_PLAYERS);

    return names.length > 0 ? names : null;
}

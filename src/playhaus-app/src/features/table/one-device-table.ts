/**
 * A row of names typed into one phone, and what can be wrong with it.
 *
 * Every game played round one device opens on the same form and asks the same three
 * questions of it — are there enough people, are there too many, has somebody been typed
 * in twice. Only the answers to the first two differ: a pub quiz seats eight, One of Us
 * seats nine, and whatever comes next will want its own number.
 *
 * So the limits are arguments and the verdict is a tag rather than a line of copy. Each
 * game keeps its own `one-device-table.ts` next to its own translation keys and turns
 * the tag into something to read there — which is the half that genuinely cannot be
 * shared, because `TranslationKey` is checked against the catalogue at the call site.
 */

export interface TableLimits {
    min: number
    max: number
}

/** What is wrong with a table, or null when nothing is. */
export type TableProblem = 'tooFew' | 'tooMany' | 'duplicate';

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

export function tableProblemOf(names: string[], limits: TableLimits): TableProblem | null {
    const seated = seatedNames(names);

    if (seated.length < limits.min) return 'tooFew';
    if (seated.length > limits.max) return 'tooMany';
    if (duplicateSeats(names)) return 'duplicate';

    return null;
}

/**
 * Reads a stored table back into a row of names, or `null` when there is nothing usable
 * there.
 *
 * Parsed defensively rather than cast. The stored string outlives any one build, and a
 * shape that used to be written and no longer is has to read as "no table remembered"
 * instead of being handed to the form as seats it cannot draw.
 */
export function parseStoredTable(stored: string | null | undefined, maxPlayers: number): string[] | null {
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
        .slice(0, maxPlayers);

    return names.length > 0 ? names : null;
}

// A row of names typed into one phone, and what can be wrong with it.

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

// Reads a stored table back into a row of names, or `null` when there is nothing usable there.
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

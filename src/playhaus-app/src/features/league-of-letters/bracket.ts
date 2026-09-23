import { matchesInStage, type Bracket, type Tournament, type TournamentMatch } from '@/api/calls/league-of-letters-tournament';

// A round never spreads wider than this, so a phone can still draw it at cell size.
export const GRID_COLUMNS = 3;

export interface ProjectedMatch {
    feeders: string[]
    mine: boolean
}

// How many columns a round of this many matches is laid out in.
export function gridColumns(count: number): number {
    return Math.max(1, Math.min(GRID_COLUMNS, count));
}

// Chunks a round into rows, padding the last with null so every row keeps the same columns.
export function gridRows<T>(items: T[], columns: number): (T | null)[][] {
    const rows: (T | null)[][] = [];
    for (let i = 0; i < items.length; i += columns) {
        const row: (T | null)[] = items.slice(i, i + columns);
        while (row.length < columns) row.push(null);
        rows.push(row);
    }
    return rows;
}

// Mirrors the server's pairPool: an odd pool plays one three-way first, then pairs.
export function pairFeeders<T>(pool: T[]): T[][] {
    if (pool.length < 2) return [];

    const groups: T[][] = [];
    let rest = pool;
    if (rest.length % 2 === 1) {
        groups.push(rest.slice(0, 3));
        rest = rest.slice(3);
    }
    for (let i = 0; i < rest.length; i += 2) {
        groups.push(rest.slice(i, i + 2));
    }
    return groups;
}

// The matches of one half of one round, in bracket order.
export function roundOf(tournament: Tournament, stage: number, bracket: Bracket): TournamentMatch[] {
    return matchesInStage(tournament, stage).filter(match => match.bracket === bracket);
}

// A round with nothing left to play, which is what turns its funnel from grey to ink.
export function roundSettled(matches: TournamentMatch[]): boolean {
    return matches.length > 0 && matches.every(match => match.status === 'done' || match.status === 'bye');
}

// The winners round after the one on the table, before it is drawn.
export function projectedWinners(tournament: Tournament, userId: string | undefined): ProjectedMatch[] {
    const drawn = tournament.matches.some(match => match.stage > tournament.stage);
    if (drawn || tournament.status === 'completed') return [];

    // Winners stay in seed-nested order, so a feeder's position predicts its pairing.
    const feeders = roundOf(tournament, tournament.stage, 'winners');

    return pairFeeders(feeders).map(group => ({
        feeders: group.map(match => `W${match.position + 1}`),
        mine: userId !== undefined && group.some(match => match.players.some(player => player.userId === userId))
    }));
}

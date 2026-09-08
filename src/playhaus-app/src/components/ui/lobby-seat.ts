// What a waiting room has to know about one person.

/** One person in a room, in the only three properties a seat is drawn from. */
export interface LobbySeat {
    /** Who this is, in whatever ids the game's own API deals in. */
    userId: string,
    name: string,
    /** The swatch this player picked — `avatarColorById` turns it into a colour. */
    avatarColorId: string
}

// A seat with a score on it: what a scoreboard row is drawn from, and no more.
export interface ScoredPlayer extends LobbySeat {
    score: number
}

// The two letters on somebody's swatch.
export function initialsFor(name: string): string {
    return [...name].slice(0, 2).join('').toUpperCase() || '?';
}

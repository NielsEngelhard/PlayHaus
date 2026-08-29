/**
 * What a waiting room has to know about one person, and the one thing every roster that
 * draws them has to work out for itself.
 *
 * Structural rather than a game's own type. `LobbySeatGrid` draws seats for whichever
 * game is in the room, and League of Letters' `LobbyPlayer` — or the next game's — is
 * assignable to this without either side importing the other. Moved out of
 * `features/league-of-letters` for exactly that reason.
 */

/** One person in a room, in the only three properties a seat is drawn from. */
export interface LobbySeat {
    /** Who this is, in whatever ids the game's own API deals in. */
    userId: string,
    name: string,
    /** The swatch this player picked — `avatarColorById` turns it into a colour. */
    avatarColorId: string
}

/**
 * The two letters on somebody's swatch.
 *
 * Spread, not sliced: a name starting with an emoji or an accented pair, cut with
 * `slice`, comes out as half a glyph — invisible until it is not.
 */
export function initialsFor(name: string): string {
    return [...name].slice(0, 2).join('').toUpperCase() || '?';
}

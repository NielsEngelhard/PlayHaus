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
 * A seat with a score on it: what a scoreboard row is drawn from, and no more.
 *
 * The same structural trick one line up, carried into the half of a game that has scores.
 * League of Letters' `GamePlayer` and Fake Filler's `FFGamePlayer` are the same four
 * properties under two names — both games' APIs answer `{userId, name, avatarColorId,
 * score}` — so `PlayerScoreRow` and `FinalScoreboard` take this and neither game's board
 * has to know the other exists.
 */
export interface ScoredPlayer extends LobbySeat {
    score: number
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

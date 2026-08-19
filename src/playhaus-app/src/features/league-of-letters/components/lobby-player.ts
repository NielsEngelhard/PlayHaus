/**
 * The one thing both room rosters have to work out for themselves.
 *
 * Shared rather than duplicated because getting it wrong is invisible until it is not:
 * a name starting with an emoji or an accented pair, cut with `slice`, comes out as
 * half a glyph.
 */

/** The two letters on somebody's swatch. Spread, not sliced — see above. */
export function initialsFor(name: string): string {
    return [...name].slice(0, 2).join('').toUpperCase() || '?';
}

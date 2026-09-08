// What a join code is, and where one goes.

import { gameForJoinCode, type Game } from '@/constants/games';

// How long a whole code is, prefix included.
export const JOIN_CODE_LENGTH = 5;

// The characters a code's body can hold.
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Reads a leading `0` as `O` and a leading `1` as `L`.
export function foldPrefix(code: string): string {
    if (code.length === 0) return code;

    const first = code.charAt(0);
    const read = first === '0' ? 'O' : first === '1' ? 'L' : first;

    return read + code.slice(1);
}

// Everything a code is allowed to be, for text a *person* produced.
export function sanitize(text: string): string {
    const kept = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, JOIN_CODE_LENGTH);

    return foldPrefix(kept);
}

// Where a code goes, which is the question the join card asks and the only one it asks.
export type JoinTarget =
    /** Not a whole code yet. Say nothing — the field is still being typed into. */
    | { kind: 'incomplete' }
    /** A game, and the page to open. */
    | { kind: 'route', game: Game, href: string }
    // Nothing this build can open: an unclaimed first character, a game with no room yet, or a body holding characters we never hand out.
    | { kind: 'rejected' };

// The dispatch: a code in, somewhere to go or a refusal out.
export function resolveJoinCode(code: string): JoinTarget {
    const value = foldPrefix(code.toUpperCase());

    if (value.length !== JOIN_CODE_LENGTH) return { kind: 'incomplete' };

    // The prefix is checked by `gameForJoinCode`; this is the four characters after it.
    for (const character of value.slice(1)) {
        if (!JOIN_CODE_ALPHABET.includes(character)) return { kind: 'rejected' };
    }

    const game = gameForJoinCode(value);
    if (game?.roomRoute == null) return { kind: 'rejected' };

    return { kind: 'route', game, href: game.roomRoute(value) };
}

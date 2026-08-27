/**
 * What a join code is, and where one goes.
 *
 * The rule this file exists for: **the first character of a join code is the game**. `L`
 * is League of Letters, `P` is PubquizR, `O` is One of Us. Nothing looks a code up to
 * find out — somebody reads five characters off a friend's screen, types them in, and the
 * first of them decides which page opens. See `internal/joincode` on the server, which is
 * the same rule from the other end.
 *
 * Pure, and deliberately so: no `expo-*` imports, no navigation, no components. Every
 * function here is a string in and a value out, which makes this the first file in the app
 * worth a unit test the day a test runner arrives — and until then the first one worth
 * reading twice, because nothing but review is checking it.
 */

import { gameForJoinCode, type Game } from '@/constants/games';

/**
 * How long a whole code is, prefix included.
 *
 * Mirrors `Length` in `internal/joincode/joincode.go`. Four random characters after the
 * prefix, out of a 32-character alphabet, which is about a million codes per game — and a
 * room lives for minutes, so the number is not the interesting part. The interesting part
 * is that it is the same number on both sides: the server refuses anything else, so a
 * mismatch here is an app that cannot join anything at all.
 */
export const JOIN_CODE_LENGTH = 5;

/**
 * The characters a code's body can hold.
 *
 * Mirrors `alphabet` in `internal/joincode/joincode.go`. `I`, `O`, `0` and `1` are absent
 * on purpose: codes get read out loud across a room and copied off a screen at an angle,
 * and those are the two pairs nobody can tell apart doing either.
 *
 * This is the one place in the change where two files have to agree with no compiler
 * between them. It is used only to refuse a *completed* code early — so if the server's
 * alphabet ever widens, the symptom is this app rejecting codes that would have worked,
 * which is the failure worth having in that direction anyway.
 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Reads a leading `0` as `O` and a leading `1` as `L`.
 *
 * `O` had to be One of Us's letter — it is the obvious one and the game is called One of
 * Us — which puts back exactly the confusion the alphabet was stripped down to avoid. This
 * is the price being paid for it, and it is only payable in the first position: no game
 * claims a digit there, so a leading `0` can only ever have been meant as an `O`, and a
 * leading `1` as an `L`. There is nothing to guess.
 *
 * The body is left alone, and that is not an oversight. A `0` four characters in is a
 * character no code contains, so folding it would invent a code the player never typed and
 * then send them to whatever room happened to answer to it.
 */
export function foldPrefix(code: string): string {
    if (code.length === 0) return code;

    const first = code.charAt(0);
    const read = first === '0' ? 'O' : first === '1' ? 'L' : first;

    return read + code.slice(1);
}

/**
 * Everything a code is allowed to be, for text a *person* produced.
 *
 * Anything else is dropped as it arrives, which is what lets `l4-x2q` become `L4X2Q`
 * rather than being refused, and what lets the field accept a keystroke at a time — every
 * prefix of a code survives this unchanged, which is the property the typing path depends
 * on. The fold keeps that property because it touches only index 0, and index 0 is the
 * same character in every prefix of the same string.
 *
 * It is not clever, and must not become clever: it keeps the first five code characters it
 * finds and throws the rest away, so `code: L4X2Q` yields `CODEL`. That is the right trade
 * for a keyboard and the wrong one for a camera or a pasted link — see `codeFromScan` in
 * `join-link.ts`, which is the strict rule those two go through instead.
 */
export function sanitize(text: string): string {
    const kept = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, JOIN_CODE_LENGTH);

    return foldPrefix(kept);
}

/**
 * Where a code goes, which is the question the join card asks and the only one it asks.
 *
 * Three states rather than five. A code for a game that has no rooms yet is refused in the
 * same words as a code for no game at all, because the two are the same thing to the person
 * holding the phone: five characters that do not open anything. Telling them *why* would
 * mean explaining that PubquizR has a letter reserved for a feature it does not have, which
 * is a sentence about our roadmap dressed up as help.
 */
export type JoinTarget =
    /** Not a whole code yet. Say nothing — the field is still being typed into. */
    | { kind: 'incomplete' }
    /** A game, and the page to open. */
    | { kind: 'route', game: Game, href: string }
    /**
     * Nothing this build can open: an unclaimed first character, a game with no room yet,
     * or a body holding characters we never hand out.
     */
    | { kind: 'rejected' };

/**
 * The dispatch: a code in, somewhere to go or a refusal out.
 *
 * Runs only on a code that is *whole*. `sanitize` stays lenient on the way in and this is
 * strict on the way out, which is the division that matters — a field that silently
 * swallowed keystrokes because they were not going to be valid later is worse than a
 * refusal one screen on, and a player halfway through typing has not made a mistake yet.
 *
 * The body check is what saves a round trip when somebody types an `I` or a `0` into the
 * middle of a code: the server would 404 it, and it can be refused here without asking.
 */
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

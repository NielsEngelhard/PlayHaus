/**
 * The link that joins a room, and the way back out of one a camera has just read.
 *
 * Three places need to agree about this and used to be free not to: the share sheet on
 * the host's screen, the QR code beside it, and the scanner on the join card. A link that
 * is built in one shape and parsed in another is a bug nobody sees until two phones are
 * pointed at each other, so both halves live here.
 *
 * What a code *is* lives next door in `join-code.ts`. This file is only about codes with
 * a URL wrapped round them.
 */

import type { Game } from "@/constants/games";
import { gameForJoinCode } from "@/constants/games";
import { foldPrefix, JOIN_CODE_LENGTH } from "@/features/join/join-code";
import * as Linking from "expo-linking";

/**
 * The link that joins this game's room.
 *
 * The game comes in as a parameter rather than being read off the code, even though the
 * code now names it. Every caller is a host looking at their own room and already knows
 * which game they are in, and a lookup would mean this returning `string | null` and
 * pushing an impossible hide-the-QR branch into a screen that cannot reach it.
 *
 * Built rather than hardcoded, so it points back at wherever this build runs: the
 * deployed origin on web, the `playhausapp://` scheme on a phone. The native link only
 * opens for somebody who already has the app — which is the common case for the people
 * you invite, and the code printed beside it covers the rest.
 */
export function joinLink(game: Game, code: string): string {
    const room = game.roomRoute;
    if (room === null) {
        // Unreachable from any screen that exists: only a room screen shares a link, and
        // a game with no `roomRoute` has no room screen to be on. Thrown rather than
        // returned as null so that the day one is added, this is a stack trace during
        // development instead of a QR code of the word "null" on somebody's television.
        throw new Error(`${game.name} has no room to link to`);
    }

    return Linking.createURL(room(code));
}

/**
 * The segment every game's room sits under. See `ROUTES` — the paths are
 * `/games/{slug}/...`, and this is the part they share.
 *
 * Matched instead of `/room/`, which the old rule used: that segment is true only because
 * League of Letters happens to spell its route that way, and a rule keyed on one game's
 * URL shape is the same mistake as a join card that only knew one game.
 */
const GAMES_SEGMENT = '/games/';

/** A code and nothing else. Built from the length so the two cannot drift apart. */
const EXACTLY_A_CODE = new RegExp(`^[A-Za-z0-9]{${JOIN_CODE_LENGTH}}$`);

/**
 * The code inside something a camera just read, or null when there isn't one.
 *
 * A lens sweeping a room crosses every QR in it — a parcel label, a menu, the sticker on
 * the back of a router — so this has to be able to say no, and saying no is most of what
 * it does. Two things are accepted and nothing else: one of our own join links, and a
 * payload that is *exactly* a code.
 *
 * Deliberately stricter than `sanitize`, which is the rule for what a person types. That
 * one is lenient on purpose — it throws away whatever is not a code character and keeps
 * going, because someone typing has already decided what they mean. A camera has decided
 * nothing, and the same leniency applied to machine input reads `WIFI:S:home;T:WPA;…`
 * off a router sticker as a lobby code and marches the player into a room that was never
 * there. So a bare payload has to *be* a code rather than merely contain one.
 *
 * Four things have to hold, and the prefix is now the strongest of them: only three of
 * thirty-six possible first characters belong to a game, so roughly nine in ten
 * five-character URL tails are refused on that alone. Whether the game it names has a
 * room to open is not asked here — that is `resolveJoinCode`'s question, and a scanner
 * that quietly found nothing is worse than one that hands on a code and lets the card say
 * so out loud.
 */
export function codeFromScan(payload: string): string | null {
    const trimmed = payload.trim();

    // Anything with a scheme is a link, and a link has to be one of ours.
    if (trimmed.includes('://')) {
        if (!trimmed.includes(GAMES_SEGMENT)) return null;

        // The last segment, which is where the code sits in every room route we have.
        //
        // The query and hash come off first, and then any trailing slash: expo-router
        // appends neither, but a link that has been round a messaging app comes back with
        // a tracking tail as often as not, and some of them add the slash. Both are things
        // a person did not type and cannot see, so refusing over them would be refusing a
        // link that is, to the eye, our own.
        const path = trimmed.split(/[?#]/)[0].replace(/\/+$/, '');

        return exactly(path.slice(path.lastIndexOf('/') + 1));
    }

    return exactly(trimmed);
}

/**
 * A code for a game this build has heard of, or nothing.
 *
 * Case is forgiven because a code is case-free, and a leading digit is forgiven because
 * `O` and `0` are the pair the alphabet could not get rid of — see `foldPrefix`. A QR
 * carries what the host's own screen built, so neither should ever come up from a scan;
 * they come up from the clipboard, which goes through this same door.
 */
function exactly(text: string): string | null {
    if (!EXACTLY_A_CODE.test(text)) return null;

    const code = foldPrefix(text.toUpperCase());

    return gameForJoinCode(code) === null ? null : code;
}

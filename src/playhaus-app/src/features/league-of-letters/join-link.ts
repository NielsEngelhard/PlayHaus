/**
 * The link that joins a lobby, and the way back out of one a camera has just read.
 *
 * Three places need to agree about this and used to be free not to: the share sheet on
 * the host's screen, the QR code beside it, and the scanner on the join card. A link that
 * is built in one shape and parsed in another is a bug nobody sees until two phones are
 * pointed at each other, so both halves live here.
 */

import { LOBBY_CODE_LENGTH } from "@/api/calls/league-of-letters-lobby";
import { ROUTES } from "@/constants/routes";
import * as Linking from "expo-linking";

/**
 * Everything a code is allowed to be, for text a *person* produced.
 *
 * Anything else is dropped as it arrives, which is what lets `k2-v8` become `K2V8` rather
 * than being refused, and what lets the field accept a keystroke at a time — every prefix
 * of a code survives this unchanged, which is the property the typing path depends on.
 *
 * It is not clever, and must not become clever: it keeps the first four code characters
 * it finds and throws the rest away, so `code: K2V8` yields `CODE`. That is the right
 * trade for a keyboard and the wrong one for a camera or a pasted link — see
 * `codeFromScan`, which is the strict rule those two go through instead.
 */
export function sanitize(text: string): string {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LOBBY_CODE_LENGTH);
}

/**
 * The link that joins this lobby.
 *
 * Built rather than hardcoded, so it points back at wherever this build runs: the
 * deployed origin on web, the `playhausapp://` scheme on a phone. The native link only
 * opens for somebody who already has the app — which is the common case for the people
 * you invite, and the code printed beside it covers the rest.
 */
export function joinLink(code: string): string {
    return Linking.createURL(ROUTES.leagueOfLettersRoom(code));
}

/** The path segment `leagueOfLettersRoom` puts the code after. */
const ROOM_SEGMENT = '/room/';

/** A code and nothing else. Built from the length so the two cannot drift apart. */
const EXACTLY_A_CODE = new RegExp(`^[A-Za-z0-9]{${LOBBY_CODE_LENGTH}}$`);

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
 * off a router sticker as the lobby code `WIFI` and marches the player into a room that
 * was never there. So a bare payload has to *be* a code rather than merely contain one.
 *
 * A link is matched on `/room/` for the same reason: without it the tail of any
 * four-letter URL is a plausible code.
 */
export function codeFromScan(payload: string): string | null {
    const trimmed = payload.trim();

    // Anything with a scheme is a link, and a link has to be one of ours. `lastIndexOf`
    // rather than a split, because the code is whatever follows the *last* `/room/` — a
    // link that somehow carried two would still end on the real one.
    if (trimmed.includes('://')) {
        const at = trimmed.lastIndexOf(ROOM_SEGMENT);
        if (at === -1) return null;

        // Stops at the first `?` or `#`: expo-router appends nothing today, but a link
        // that has been round a messaging app often comes back with a tracking tail.
        return exactly(trimmed.slice(at + ROOM_SEGMENT.length).split(/[?#/]/)[0]);
    }

    return exactly(trimmed);
}

/** A code, or nothing. Case is the one thing forgiven, because a code is case-free. */
function exactly(text: string): string | null {
    return EXACTLY_A_CODE.test(text) ? text.toUpperCase() : null;
}

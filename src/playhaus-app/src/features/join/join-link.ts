// The link that joins a room, and the way back out of one a camera has just read.

import type { Game } from "@/constants/games";
import { gameForJoinCode } from "@/constants/games";
import { foldPrefix, JOIN_CODE_LENGTH } from "@/features/join/join-code";
import * as Linking from "expo-linking";

// The link that joins this game's room.
export function joinLink(game: Game, code: string): string {
    const room = game.roomRoute;
    if (room === null) {
        // Unreachable from any screen that exists.
        throw new Error(`${game.name} has no room to link to`);
    }

    return Linking.createURL(room(code));
}

// The segment every game's room sits under.
const GAMES_SEGMENT = '/games/';

/** A code and nothing else. Built from the length so the two cannot drift apart. */
const EXACTLY_A_CODE = new RegExp(`^[A-Za-z0-9]{${JOIN_CODE_LENGTH}}$`);

// The code inside something a camera just read, or null when there isn't one.
export function codeFromScan(payload: string): string | null {
    const trimmed = payload.trim();

    // Anything with a scheme is a link, and a link has to be one of ours.
    if (trimmed.includes('://')) {
        if (!trimmed.includes(GAMES_SEGMENT)) return null;

        // The last segment, which is where the code sits in every room route we have.
        const path = trimmed.split(/[?#]/)[0].replace(/\/+$/, '');

        return exactly(path.slice(path.lastIndexOf('/') + 1));
    }

    return exactly(trimmed);
}

// A code for a game this build has heard of, or nothing.
function exactly(text: string): string | null {
    if (!EXACTLY_A_CODE.test(text)) return null;

    const code = foldPrefix(text.toUpperCase());

    return gameForJoinCode(code) === null ? null : code;
}

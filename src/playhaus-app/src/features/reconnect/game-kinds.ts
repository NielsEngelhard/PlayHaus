import type { GameType, ReconnectableGame } from '@/api/calls/reconnect';
import { LEAGUE_OF_LETTERS_NAME } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import { Colors } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import type { Href } from 'expo-router';

/**
 * What one kind of game looks like in the reconnect list, and where its row goes.
 *
 * The list is one endpoint serving every game type there will ever be, so the row
 * cannot know what it is drawing. This is the lookup that tells it — add a game
 * type to the wire, add it here, and the list draws it without any other change.
 */
export interface GameKind {
    /** The game itself. The same name the home list and the header chip use. */
    title: string
    /** Which flavour of it — solo, a room, a tournament later on. */
    mode: string
    icon: keyof typeof Feather.glyphMap
    /** Fill behind the icon tile, so the types stay apart at a glance. */
    color: string
    /** Where the reconnect button goes. */
    href: (game: ReconnectableGame) => Href
}

/**
 * Partial on purpose: a build knows about the types it has screens for, and the
 * server is free to be newer than the app. A type missing from here has nowhere
 * to send anyone, so the list leaves it out rather than offering a row whose
 * button cannot do anything.
 */
export const GAME_KINDS: Partial<Record<GameType, GameKind>> = {
    lol_solo: {
        title: LEAGUE_OF_LETTERS_NAME,
        mode: 'Solo',
        icon: 'type',
        color: Colors.light.lemon,
        // Only the id travels, the same as when the game was started: the play
        // screen reads the length, the language and the round it left off at off
        // the game it fetches.
        href: game => ({ pathname: ROUTES.leagueOfLettersSolo, params: { gameId: game.id } })
    }
};

/** The look-up above, as a question the list can ask about a game. */
export function kindOf(game: ReconnectableGame): GameKind | undefined {
    return GAME_KINDS[game.type];
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/**
 * How long ago a game was started, as a phrase that follows "Gestart".
 *
 * Written out by hand rather than handed to `Intl`, which is not something every
 * runtime this app ships to can be relied on for, and which would want a locale
 * passed in anyway — this app is Dutch throughout.
 *
 * Answers `null` for a timestamp that will not parse, so the row can leave the
 * line out instead of printing "Invalid Date" at someone.
 */
export function startedAgo(createdAt: string, now: number = Date.now()): string | null {
    const started = new Date(createdAt).getTime();
    if (Number.isNaN(started)) return null;

    const elapsed = now - started;

    // A clock a little behind the server's would otherwise read as a game started
    // in the future, which is a stranger thing to show than "zojuist".
    if (elapsed < MINUTE) return 'zojuist';
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min geleden`;
    if (elapsed < DAY) {
        const hours = Math.floor(elapsed / HOUR);
        return `${hours} uur geleden`;
    }
    if (elapsed < 7 * DAY) {
        const days = Math.floor(elapsed / DAY);
        return days === 1 ? 'gisteren' : `${days} dagen geleden`;
    }

    // Past a week "34 dagen geleden" stops meaning anything, so it becomes a date.
    const date = new Date(started);
    return `op ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

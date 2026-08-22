import type { GameType, ReconnectableGame } from '@/api/calls/reconnect';
import { LEAGUE_OF_LETTERS_NAME } from '@/constants/games';
import { ROUTES } from '@/constants/routes';
import type { Phrase, TranslationKey } from '@/features/i18n/keys';
import type { Href } from 'expo-router';

/**
 * What one kind of game looks like in the reconnect list, and where its row goes.
 *
 * The list is one endpoint serving every game type there will ever be, so the row
 * cannot know what it is drawing. This is the lookup that tells it — add a game
 * type to the wire, add it here, and the list draws it without any other change.
 */
export interface GameKind {
    title: string
    modeKey: TranslationKey
    slug: string
    code?: (game: ReconnectableGame) => string
    href: (game: ReconnectableGame) => Href
}

export const GAME_KINDS: Partial<Record<GameType, GameKind>> = {
    lol_solo: {
        title: LEAGUE_OF_LETTERS_NAME,
        modeKey: 'reconnect.mode.solo',
        slug: 'league-of-letters',
        href: game => ({ pathname: ROUTES.leagueOfLettersSolo, params: { gameId: game.id } }),
    },
    lol_multiplayer: {
        title: LEAGUE_OF_LETTERS_NAME,
        modeKey: 'reconnect.mode.lobby',
        slug: 'league-of-letters',
        code: game => game.id,
        href: game => ROUTES.leagueOfLettersRoom(game.id) as Href,
    }
};

/** The look-up above, as a question the list can ask about a game. */
export function kindOf(game: ReconnectableGame): GameKind | undefined {
    return GAME_KINDS[game.type];
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The month names, as catalogue keys in calendar order.
 *
 * `Intl` is still not what formats this: it is not something every runtime this app
 * ships to can be relied on for, and the abbreviations the design wants are three
 * letters in both languages, which is a thing the catalogue can simply say.
 */
const MONTH_KEYS = [
    'common.time.months.jan', 'common.time.months.feb', 'common.time.months.mar',
    'common.time.months.apr', 'common.time.months.may', 'common.time.months.jun',
    'common.time.months.jul', 'common.time.months.aug', 'common.time.months.sep',
    'common.time.months.oct', 'common.time.months.nov', 'common.time.months.dec'
] as const satisfies readonly TranslationKey[];


export function startedAgo(createdAt: string, now: number = Date.now()): Phrase | null {
    const started = new Date(createdAt).getTime();
    if (Number.isNaN(started)) return null;

    const elapsed = now - started;

    // A clock a little behind the server's would otherwise read as a game started
    // in the future, which is a stranger thing to show than "just now".
    if (elapsed < MINUTE) return { key: 'common.time.justNow' };
    if (elapsed < HOUR) {
        return { key: 'common.time.minutesAgo', values: { minutes: Math.floor(elapsed / MINUTE) } };
    }
    if (elapsed < DAY) {
        return { key: 'common.time.hoursAgo', values: { hours: Math.floor(elapsed / HOUR) } };
    }
    if (elapsed < 7 * DAY) {
        const days = Math.floor(elapsed / DAY);
        return days === 1
            ? { key: 'common.time.yesterday' }
            : { key: 'common.time.daysAgo', values: { days } };
    }

    // Past a week "34 days ago" stops meaning anything, so it becomes a date.
    const date = new Date(started);
    return {
        key: 'common.time.onDate',
        values: { day: date.getDate(), year: date.getFullYear() },
        keyValues: { month: MONTH_KEYS[date.getMonth()] }
    };
}

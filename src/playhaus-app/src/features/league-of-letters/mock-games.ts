import type { Game, GameGuess, GamePlayer, Mark } from "@/api/calls/league-of-letters";

/**
 * Hand-written multiplayer games, for building the room screen against.
 *
 * TODO: delete once multiplayer is served by the API. Solo has stopped needing this —
 * it reads a real game through `useGame` — but a room still has no endpoints behind it:
 * nothing joins by code, nothing starts a lobby, and a guess in a shared round has
 * nowhere to go. Everything here is typed as the real `Game`, so the room screen swaps
 * this module for a fetch and a poll on `version` and nothing below it changes.
 *
 * These are snapshots, not a simulation: the answers are never in this file, the marks
 * are written out by hand exactly as the server would have scored them, and playing a
 * guess does not move a game on to the next state. Each state is here to be looked at.
 */

/** The "you" every fixture is written from — what `GameGuess.userId` is matched against. */
export const MOCK_USER_ID = 'user-you';

/** Mirrors `MaxGuesses` in the Go backend's `internal/league_of_letters/models.go`. */
const MAX_GUESSES = 6;

/** Fixed so the guess timestamps don't drift between snapshots on every reload. */
const CREATED_AT = '2026-08-09T12:00:00.000Z';

/** A round deadline far enough out that the multiplayer countdown has something to count. */
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

function guess(number: number, word: string, marks: Mark[], userId: string = MOCK_USER_ID): GameGuess {
    return { userId, number, word, marks, createdAt: CREATED_AT };
}

const you: GamePlayer = {
    userId: MOCK_USER_ID, name: 'Magpie54', avatarColorId: 'lemon', score: 3, joinedAt: CREATED_AT
};

const others: GamePlayer[] = [
    { userId: 'user-sam', name: 'SnelleVos12', avatarColorId: 'cobalt', score: 5, joinedAt: CREATED_AT },
    { userId: 'user-kim', name: 'StilleUil88', avatarColorId: 'mint', score: 3, joinedAt: CREATED_AT },
    { userId: 'user-bo', name: 'RodeDas21', avatarColorId: 'blush', score: 0, joinedAt: CREATED_AT }
];

/**
 * Every guess below is against the same five-letter answer, KAARS, so the marks stay
 * consistent from one snapshot to the next and a state can be compared with its neighbour.
 */
const SCHIP = guess(1, 'SCHIP', ['present', 'absent', 'absent', 'absent', 'absent']);
const TAKEN = guess(2, 'TAKEN', ['absent', 'correct', 'present', 'absent', 'absent']);
const KAMER = guess(3, 'KAMER', ['correct', 'correct', 'absent', 'absent', 'present']);
const KLAAR = guess(4, 'KLAAR', ['correct', 'absent', 'correct', 'present', 'present']);
const KARIG = guess(5, 'KARIG', ['correct', 'correct', 'present', 'absent', 'absent']);
const KAPER = guess(6, 'KAPER', ['correct', 'correct', 'absent', 'absent', 'present']);
const KAARS = guess(4, 'KAARS', ['correct', 'correct', 'correct', 'correct', 'correct']);

const multiplayerBase = {
    id: 'game-room-mock',
    code: 'KP7XQ2',
    mode: 'multiplayer',
    hostUserId: 'user-sam',
    language: 'nl',
    wordLength: 5,
    maxGuesses: MAX_GUESSES,
    startedAt: CREATED_AT,
    version: 1,
    players: [you, ...others],
    createdAt: CREATED_AT
} as const satisfies Partial<Game>;

/** One state of one game, with a label for the temporary state switcher. */
export interface MockSnapshot {
    id: string,
    label: string,
    game: Game
}

/**
 * `round.word` is the tell that a round is over: the backend withholds the answer while
 * the round is still winnable, so the snapshots that reveal it are exactly the finished
 * ones. Nothing in the UI needs a separate "is it over" flag.
 */
export const MOCK_MULTIPLAYER_GAMES: MockSnapshot[] = [
    {
        id: 'room-midgame',
        label: 'Bezig',
        game: {
            ...multiplayerBase,
            status: 'active',
            endsAt: inMinutes(4),
            round: {
                number: 1, startedAt: CREATED_AT, endsAt: inMinutes(4),
                // Other players' guesses ride along on the same round. The board only ever
                // draws your own; they are here so the scoreboard has something behind it.
                guesses: [SCHIP, TAKEN, guess(1, 'KRANT', ['correct', 'present', 'correct', 'absent', 'absent'], 'user-sam')]
            }
        }
    },
    {
        id: 'room-hurry',
        label: 'Laatste seconden',
        game: {
            ...multiplayerBase,
            status: 'active',
            endsAt: inMinutes(0.4),
            round: {
                number: 2, startedAt: CREATED_AT, endsAt: inMinutes(0.4),
                guesses: [SCHIP, TAKEN, KAMER, KLAAR]
            }
        }
    },
    {
        id: 'room-won',
        label: 'Gewonnen',
        game: {
            ...multiplayerBase,
            status: 'finished',
            endsAt: CREATED_AT,
            players: [{ ...you, score: 8 }, ...others],
            round: {
                number: 2, startedAt: CREATED_AT, endsAt: CREATED_AT, word: 'KAARS',
                guesses: [SCHIP, TAKEN, KAMER, KAARS]
            }
        }
    },
    {
        id: 'room-finished',
        label: 'Verloren',
        game: {
            ...multiplayerBase,
            status: 'finished',
            endsAt: CREATED_AT,
            round: {
                number: 2, startedAt: CREATED_AT, endsAt: CREATED_AT, word: 'KAARS',
                guesses: [SCHIP, TAKEN, KAMER, KLAAR, KARIG, KAPER]
            }
        }
    }
];

/** What the room opens on: a game already under way, which shows the most at once. */
export const DEFAULT_MULTIPLAYER_SNAPSHOT = 'room-midgame';

export function snapshotById(snapshots: MockSnapshot[], id: string): MockSnapshot {
    return snapshots.find(snapshot => snapshot.id === id) ?? snapshots[0];
}

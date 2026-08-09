import type { Game, GameGuess, GamePlayer, Mark } from "@/api/calls/league-of-letters";
import { WORD_LENGTHS, type LanguageCode, type WordLength } from "@/features/league-of-letters/solo-settings";

/**
 * Hand-written games, for building the playing screen against.
 *
 * TODO: replace with the real thing. The backend only registers `POST .../games` today —
 * there is no `GET /api/v1/league-of-letters/games/{id}` to read a game back from and no
 * endpoint to submit a guess to, so nothing here can be fetched yet. Everything is typed
 * as the real `Game`, so when those land the screens swap this module for a fetch and a
 * poll on `version` and the components below it do not change.
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

const soloBase = {
    id: 'game-solo-mock',
    mode: 'solo',
    hostUserId: MOCK_USER_ID,
    language: 'nl',
    wordLength: 5,
    maxGuesses: MAX_GUESSES,
    startedAt: CREATED_AT,
    version: 1,
    players: [you],
    createdAt: CREATED_AT
} as const satisfies Partial<Game>;

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
export const MOCK_SOLO_GAMES: MockSnapshot[] = [
    {
        id: 'solo-fresh',
        label: 'Vers',
        game: {
            ...soloBase,
            status: 'active',
            round: { number: 1, startedAt: CREATED_AT, endsAt: inMinutes(5), guesses: [] }
        }
    },
    {
        id: 'solo-midgame',
        label: 'Bezig',
        game: {
            ...soloBase,
            status: 'active',
            round: { number: 1, startedAt: CREATED_AT, endsAt: inMinutes(5), guesses: [SCHIP, TAKEN, KAMER] }
        }
    },
    {
        id: 'solo-won',
        label: 'Gewonnen',
        game: {
            ...soloBase,
            status: 'finished',
            endsAt: CREATED_AT,
            round: {
                number: 1, startedAt: CREATED_AT, endsAt: CREATED_AT, word: 'KAARS',
                guesses: [SCHIP, TAKEN, KAMER, KAARS]
            }
        }
    },
    {
        id: 'solo-lost',
        label: 'Verloren',
        game: {
            ...soloBase,
            status: 'finished',
            endsAt: CREATED_AT,
            round: {
                number: 1, startedAt: CREATED_AT, endsAt: CREATED_AT, word: 'KAARS',
                guesses: [SCHIP, TAKEN, KAMER, KLAAR, KARIG, KAPER]
            }
        }
    }
];

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
        id: 'room-finished',
        label: 'Afgelopen',
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

/** What each route opens on: a game already under way, which shows the most at once. */
export const DEFAULT_SOLO_SNAPSHOT = 'solo-midgame';
export const DEFAULT_MULTIPLAYER_SNAPSHOT = 'room-midgame';

export function snapshotById(snapshots: MockSnapshot[], id: string): MockSnapshot {
    return snapshots.find(snapshot => snapshot.id === id) ?? snapshots[0];
}

/** Narrow a route param back to a `WordLength`; they arrive as strings. */
export function parseWordLength(value: string | undefined): WordLength | undefined {
    const length = Number(value);

    return WORD_LENGTHS.find(candidate => candidate === length);
}

/**
 * Bend a snapshot to the settings the player actually chose, so the board they get is
 * the width they asked for rather than the fixture's five.
 *
 * Changing the length empties the round: every guess here was hand-scored against a
 * five-letter answer and there is nothing that could honestly re-mark them against a
 * word of another length — that is the server's job, and this is a fixture.
 */
export function withSettings(game: Game, wordLength?: WordLength, language?: LanguageCode): Game {
    const resized = wordLength !== undefined && wordLength !== game.wordLength;

    return {
        ...game,
        language: language ?? game.language,
        wordLength: wordLength ?? game.wordLength,
        status: resized ? 'active' : game.status,
        round: game.round && (resized
            ? { ...game.round, guesses: [], word: undefined }
            : game.round)
    };
}

import { request } from '@/api/client';
import type { LanguageCode, WordLength } from '@/features/league-of-letters/solo-settings';

/**
 * A League of Letters game as the API describes it. Mirrors the response types in
 * the Go backend's `internal/api/league-of-letters.go` — keep the two in step.
 */

export type GameMode = 'solo' | 'multiplayer';

/** Straight off the Go `GameStatus`. A solo game is created `in_progress`. */
export type GameStatus = 'in_progress' | 'completed' | 'abandoned';

/** What one letter of a guess turned out to be worth. Green, orange, grey. */
export type Mark = 'correct' | 'present' | 'absent';

export interface GamePlayer {
    userId: string
    name: string
    /** Which swatch in `AVATAR_COLORS`, not a colour — same as on `User`. */
    avatarColorId: string
    score: number
    joinedAt: string
}

export interface GameGuess {
    id: string
    userId: string
    /** This player's nth guess in the round, counting from 1. */
    guessNumber: number
    word: string
    /** One mark per letter, in the word's own order. Scored server-side, never here. */
    marks: Mark[]
    createdAt: string
}

export interface GameRound {
    id: string
    roundNumber: number
    /**
     * The letter the answer starts with. Sent from the moment the round is drawn —
     * it is a hint, not the solution, and the board opens every row with it already
     * filled in.
     */
    firstLetter: string
    guesses: GameGuess[]
    /**
     * The answer. Absent while the round is still winnable — the server only sends
     * it once the round has been solved or run out of guesses, so there is no point
     * in the app where it could be read off the response early. Its presence is
     * therefore what tells the board the round is over.
     */
    word?: string
    /**
     * The deadline. Never sent for solo, which runs without one; the mocked
     * multiplayer room sets it so the timer has something to count down.
     */
    endsAt?: string
}

export interface Game {
    id: string
    ownerId: string
    locale: LanguageCode
    wordLength: WordLength
    /** Guesses the player gets per round. */
    maxGuesses: number
    /** Which round is being played, counting from 1. */
    currentRound: number
    totalRounds: number
    score: number
    status: GameStatus
    createdAt: string
    /** Every round of the game, drawn up front and ordered by `roundNumber`. */
    rounds: GameRound[]
    /**
     * Absent on anything the API served, which is only ever solo today. The mocked
     * multiplayer room sets it, and the board reads it to decide whether to show a
     * clock and the other players.
     */
    mode?: GameMode
    /** Multiplayer only, and so mock-only for now. */
    players?: GamePlayer[]
}

export interface NewGame {
    locale: LanguageCode
    wordLength: WordLength
}

/**
 * What one guess did.
 *
 * Deliberately not the whole game: the caller already holds every earlier round
 * and guess, and resending them on every word would make the response grow with
 * the game. What the caller cannot know is what this guess revealed, which is
 * all of what is here.
 */
export interface GuessResult {
    guess: GameGuess
    /** This guess was the answer. */
    solved: boolean
    /** The round takes no further guesses — solved, or out of tries. */
    roundOver: boolean
    gameOver: boolean
    /** The answer, present only once `roundOver`. */
    word?: string
    currentRound: number
    score: number
}

/**
 * The server answered, but not with a game this app can draw.
 *
 * In practice this is one thing: a server older than the app calling it. The
 * types above say `firstLetter` and `marks` are always there, so the board reads
 * them without guarding — and against a server that predates them the first
 * `undefined.toUpperCase()` takes the whole screen down, several components deep,
 * with a message naming none of the above.
 *
 * Caught once here instead, at the only place that knows what the wire is
 * supposed to look like, so the page can say what is actually wrong.
 */
export class GameContractError extends Error {
    constructor(public readonly missing: string) {
        super(`game response is missing ${missing}`);
        this.name = 'GameContractError';
    }
}

/**
 * Checks the fields the board dereferences unguarded, and nothing else. This is
 * not schema validation — it is a version check written as one.
 */
function checked(game: Game): Game {
    const missing = (field: string) => { throw new GameContractError(field); };

    if (!Array.isArray(game.rounds)) missing('rounds');
    if (typeof game.maxGuesses !== 'number') missing('maxGuesses');
    if (typeof game.totalRounds !== 'number') missing('totalRounds');

    for (const round of game.rounds) {
        if (typeof round.firstLetter !== 'string') missing(`rounds[${round.roundNumber}].firstLetter`);

        for (const guess of round.guesses ?? []) {
            if (typeof guess.word !== 'string') missing(`guess ${guess.guessNumber}.word`);
            if (!Array.isArray(guess.marks)) missing(`guess ${guess.guessNumber}.marks`);
        }
    }

    return game;
}

/**
 * Starts a solo game and returns it as the server created it, with every round
 * already drawn. Who owns it comes from the session, so there is no id to pass.
 *
 * The response is the whole game rather than an id, which is what lets the caller
 * navigate on what the server actually made rather than on what it asked for —
 * and what lets the settings screen find out the server is too old to play
 * against before it pushes anyone at a board.
 */
export async function createGame(game: NewGame): Promise<Game> {
    return checked(await request<Game>('/api/v1/league-of-letters/solo', {
        method: 'POST',
        body: JSON.stringify(game)
    }));
}

/**
 * Reads a game back. Answers 404 for a game that is not yours as well as one that
 * does not exist — owning it is the whole of the permission model.
 */
export async function getGame(gameId: string): Promise<Game> {
    return checked(await request<Game>(`/api/v1/league-of-letters/solo/${gameId}`));
}

export async function getCurrentGame(): Promise<Game | null> {
    const game = await request<Game | null>('/api/v1/league-of-letters/solo/current');
    return game === null ? null : checked(game);
}

/**
 * Gives up on a game, for good: the server deletes the row rather than moving it
 * to `abandoned`, so there is nothing to read back afterwards and no undo to
 * offer. Ask before calling it.
 *
 * Owning it is the whole of the permission model, as with `getGame` — the delete
 * is scoped to the caller, so someone else's game is a no-op rather than a
 * refusal. Answers 204 with no body.
 */
export async function abandonGame(gameId: string): Promise<void> {
    await request<void>(`/api/v1/league-of-letters/solo/${gameId}`, { method: 'DELETE' });
}

/**
 * Submits a guess against the game's current round.
 *
 * The word is scored server-side. Marks never come from here.
 */
export function submitGuess(gameId: string, word: string): Promise<GuessResult> {
    return request<GuessResult>(`/api/v1/league-of-letters/solo/${gameId}/guesses`, {
        method: 'POST',
        body: JSON.stringify({ word })
    });
}

/** The round being played, or undefined on a game whose rounds are all done. */
export function roundOf(game: Game, roundNumber: number): GameRound | undefined {
    return game.rounds.find(round => round.roundNumber === roundNumber);
}

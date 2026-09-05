import { request } from '@/api/client';
import type { FFGameMode } from '@/api/calls/fake-filler-lobby';
import type { LanguageCode } from '@/constants/languages';

/**
 * The Fake Filler board.
 *
 * Mirrors the Go DTOs in `internal/api/fakefiller.go` — keep the two in step, the same
 * way every other call module is kept in step with its handlers.
 *
 * The one thing to hold on to while reading this file is **redaction**. Fake Filler is a
 * game about not knowing who wrote what, so `GET /game/{id}` is built per reader: two
 * players fetching the same round get different bodies, and that is the game working
 * rather than a bug. Three consequences show up in the types below:
 *
 * - an option is identified by the `slot` it was shuffled into, never by its author,
 *   because one of the authors is the string `"__truth__"` and naming it would end the
 *   round before it started. A vote therefore names a slot.
 * - `authorId`, `isTruth`, `voters` and `authors` appear together and only once a round
 *   has been revealed.
 * - `options` is absent entirely during the writing phase and for any round the table
 *   has not reached yet.
 */

export type FFPhase = 'writing' | 'voting';
export type FFGameStatus = 'in_progress' | 'completed' | 'abandoned';

/** The author id the real answer is filed under. Never a player. */
export const TRUTH_AUTHOR_ID = '__truth__';

/** The blank, and the single source of truth for its spelling. See `prompt.ts`. */
export const FILL_PLACEHOLDER = '[FILL]';

export interface FFGamePlayer {
    userId: string
    name: string
    avatarColorId: string
    score: number
    joinedAt: string
}

/**
 * One of the things a voter can pick: a fake somebody wrote, or — in `facts` mode — the
 * real answer that came with the prompt.
 */
export interface FFOption {
    /**
     * The shuffled position this option is shown in, assigned once when voting opens and
     * never again. It is the option's whole identity while voting is open, and it is
     * what a vote names.
     */
    slot: number
    /** A value per blank, in the order the blanks appear. */
    fills: string[]

    /** Revealed rounds only. May be `TRUTH_AUTHOR_ID`. */
    authorId?: string
    /** Revealed rounds only. */
    isTruth?: boolean
    /** Revealed rounds only: who picked this one. */
    voters?: string[]
}

export interface FFRound {
    id: string
    number: number
    /** Still carries its `[FILL]` blanks; the fills are kept apart from it. */
    line: string
    blanks: number

    /** Whether this prompt was dealt to the reader to write for. */
    mine: boolean
    /** Whether the reader has written their fake for it. Only meaningful when `mine`. */
    answered: boolean
    /** The reader's own answer, echoed back so a reconnect can redraw a filled prompt. */
    myFills?: string[]
    /** How many of the two authors have written. Progress, never content. */
    answerCount: number

    /**
     * Whether the reader may vote on this round at all — settled when the prompts were
     * dealt, and nothing to do with whether the table has reached it yet.
     */
    canVote: boolean
    /**
     * The slot the reader picked, once they have.
     *
     * Optional rather than defaulted, because **slot 0 is a real answer**: "did not
     * vote" has to be tellable from "voted for the first one", so check for `undefined`
     * and never for falsiness.
     */
    myVoteSlot?: number
    voteCount: number

    /** Present only for the round being voted on and for rounds already revealed. */
    options?: FFOption[]

    revealed: boolean
    /** The two players who wrote for this prompt. Revealed rounds only. */
    authors?: string[]
}

export interface FFGame {
    id: string
    /** The join code, which is also the room's id. */
    lobbyId: string
    ownerId: string
    locale: LanguageCode
    gameMode: FFGameMode

    phase: FFPhase
    /** Only means anything once `phase` is `voting`. 1-based. */
    currentRound: number
    totalRounds: number
    status: FFGameStatus
    createdAt: string

    /** The reader's own score, so the board need not pick itself out of `players`. */
    score: number

    /** How many answers are in, and how many the whole game is waiting for. */
    answersIn: number
    answersNeeded: number
    /** How many votes any one round waits for: everybody except its two authors. */
    votesNeeded: number

    players: FFGamePlayer[]
    rounds: FFRound[]
}

/**
 * What one answer did: counts, and nothing else.
 *
 * Deliberately carries no fills, not even the writer's own — the same body is broadcast
 * to the whole table, and what a player is writing is the one thing this half of the
 * game is about not knowing.
 */
export interface FFAnswerResult {
    roundNumber: number
    phase: FFPhase
    answersIn: number
    /** How many the whole game is waiting for, not how many this round is. */
    answersNeeded: number
    /**
     * Set on the answer that finished the writing phase. Everybody who sees it should
     * re-read the game — their own options are waiting behind it.
     */
    votingOpened: boolean
    gameId: string
}

/** A round with nothing reader-specific on it, which is what makes it safe to broadcast. */
export interface FFPublicRound {
    id: string
    number: number
    line: string
    blanks: number
    options: FFOption[]
}

/** A finished round with everything told. Public by construction. */
export interface FFReveal {
    roundNumber: number
    line: string
    authors: string[]
    options: FFOption[]
}

/**
 * What one vote did.
 *
 * Not the whole game: every client already holds that, and what it cannot work out for
 * itself is how many votes are in, whether that closed the round, and what the round
 * turned out to be. `reveal` and `nextRound` are set together on the vote that ends one.
 */
export interface FFVoteResult {
    gameId: string
    roundNumber: number
    votes: number
    votesNeeded: number
    roundOver: boolean
    gameOver: boolean
    /** The round the game is on afterwards — not `roundNumber` if this vote closed it. */
    currentRound: number
    status: FFGameStatus

    players: FFGamePlayer[]

    reveal?: FFReveal
    nextRound?: FFPublicRound
}

const gamePath = (gameId: string) => `/api/v1/fake-filler/game/${encodeURIComponent(gameId)}`;

/** The board, as this player may see it. */
export async function getFFGame(gameId: string): Promise<FFGame> {
    return request<FFGame>(gamePath(gameId));
}

/**
 * Fills in one of the two prompts dealt to this player.
 *
 * One value per blank, in the order the blanks appear. The server rejects a wrong count
 * or a blank value with `invalid_answer`, so the screen checks both before sending.
 */
export async function submitFFAnswer(
    gameId: string,
    roundNumber: number,
    fills: string[]
): Promise<FFAnswerResult> {
    return request<FFAnswerResult>(`${gamePath(gameId)}/answers`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber, fills })
    });
}

/**
 * Picks an option on the round the table is voting on.
 *
 * `slot`, never an author — that is the redaction showing through into the request
 * shape. The voting screen was never sent the authors, so it has nothing else it could
 * name, and the server maps the slot back to whoever is sitting in it.
 */
export async function castFFVote(
    gameId: string,
    roundNumber: number,
    slot: number
): Promise<FFVoteResult> {
    return request<FFVoteResult>(`${gamePath(gameId)}/votes`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber, slot })
    });
}

/** A round by its 1-based number, or undefined. */
export function ffRoundOf(game: FFGame, roundNumber: number): FFRound | undefined {
    return game.rounds.find(round => round.number === roundNumber);
}

/** The two prompts this player was dealt to write for. */
export function ffMyRounds(game: FFGame): FFRound[] {
    return game.rounds.filter(round => round.mine);
}

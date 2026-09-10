import { request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';
import type { OneOfUsRole } from '@/features/one-of-us/models';

// The multi-device One of Us board: one prompt for the whole game, a new answer every round.

export type OOUPhase = 'answer' | 'vote' | 'reveal';
export type OOUGameStatus = 'in_progress' | 'completed' | 'abandoned';

export interface OOUGamePlayer {
    userId: string
    name: string
    avatarColorId: string
    /** The shuffled deal order, which is also the order the board draws them in. */
    seat: number
    isVotedOut: boolean
    // The one seat that settles a tied vote.
    isMayor: boolean
    votedOutRound?: number

    /** Absent while this player is still in and the game is still on. Never read it as `?? Civilian`. */
    role?: OneOfUsRole
}

// One of the things a voter can pick.
export interface OOUAnswer {
    /** The shuffled position this answer is shown in, assigned once when voting opens and never again. */
    slot: number
    text: string

    /** Revealed rounds only: who wrote it. */
    authorId?: string
    /** Revealed rounds only: who picked it. */
    voters?: string[]
}

/** Who went, and why they went. */
export interface OOUElimination {
    userId: string
    role: OneOfUsRole
    votes: number
    // Whether the mayor's vote is what settled it.
    tieBrokenByMayor: boolean
}

export interface OOURound {
    id: string
    number: number

    /** Progress, never content. */
    answersIn: number
    answersNeeded: number
    votesIn: number
    votesNeeded: number

    /** Present only once the vote is open, and anonymous until the round is revealed. */
    answers?: OOUAnswer[]

    revealed: boolean
    votedOut?: OOUElimination
}

export interface OOUGame {
    id: string
    /** The join code, which is also the room's id. */
    lobbyId: string
    ownerId: string
    locale: LanguageCode
    wordOnly: boolean

    phase: OOUPhase
    // 1-based, and it counts eliminations rather than a fixed total: there is no total.
    currentRound: number
    status: OOUGameStatus
    createdAt: string
    civiliansWon?: boolean

    // The pair the whole game was played on. Only a finished game carries them; while it runs they are the secret.
    word?: string
    imposterWord?: string

    /** The reader's own line, and empty for the nitwit. It does not say which side they are on. */
    myPrompt: string
    /** The only thing a living player is told about themselves. */
    amNitwit: boolean
    amOut: boolean

    /** The reader's own answer, echoed back so a reconnect can redraw a filled box. */
    myAnswer?: string
    myVoteSlot?: number

    mayorId?: string
    minPlayers: number
    maxPlayers: number

    players: OOUGamePlayer[]
    /** The one round being played. There is no history and nothing reads it. */
    round?: OOURound
}

// What one answer did: counts, and nothing else.
export interface OOUAnswerResult {
    gameId: string
    roundNumber: number
    phase: OOUPhase
    answersIn: number
    answersNeeded: number
    // Set on the answer that finished the writing phase.
    votingOpened: boolean
}

/** A finished round with everything told. Public by construction. */
export interface OOUReveal {
    roundNumber: number
    answers: OOUAnswer[]
    votedOut: OOUElimination
}

// What one vote did.
export interface OOUVoteResult {
    gameId: string
    roundNumber: number
    votesIn: number
    votesNeeded: number
    roundClosed: boolean
    gameOver: boolean

    phase: OOUPhase
    status: OOUGameStatus
    civiliansWon?: boolean
    mayorId?: string

    players: OOUGamePlayer[]
    reveal?: OOUReveal
}

// What the tap that moves the table on did. Only the first one opens anything.
export interface OOURoundOpened {
    gameId: string
    roundNumber: number
    phase: OOUPhase
    answersNeeded: number
    opened: boolean
}

const gamePath = (gameId: string) => `/api/v1/one-of-us/multi-device/${encodeURIComponent(gameId)}`;

/** The board, as this player may see it. */
export async function getOOUGame(gameId: string): Promise<OOUGame> {
    return request<OOUGame>(gamePath(gameId));
}

// Writes this player's answer for the round.
export async function submitOOUAnswer(
    gameId: string,
    roundNumber: number,
    text: string
): Promise<OOUAnswerResult> {
    return request<OOUAnswerResult>(`${gamePath(gameId)}/answers`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber, text })
    });
}

// Picks an answer on the round the table is voting on. The server resolves the slot to a player.
export async function castOOUVote(
    gameId: string,
    roundNumber: number,
    slot: number
): Promise<OOUVoteResult> {
    return request<OOUVoteResult>(`${gamePath(gameId)}/votes`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber, slot })
    });
}

// Moves the table on from the reveal. Everybody taps; only the first tap opens the round.
export async function continueOOURound(
    gameId: string,
    roundNumber: number
): Promise<OOURoundOpened> {
    return request<OOURoundOpened>(`${gamePath(gameId)}/continue`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber })
    });
}

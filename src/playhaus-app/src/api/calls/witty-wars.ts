import { request } from '@/api/client';
import type { WWGameMode } from '@/api/calls/witty-wars-lobby';
import type { LanguageCode } from '@/constants/languages';

// The Witty Wars board.

export type WWPhase = 'writing' | 'voting' | 'reveal';
export type WWGameStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WWGamePlayer {
    userId: string
    name: string
    avatarColorId: string
    score: number
    joinedAt: string
}

// One of the two answers a voter can pick.
export interface WWOption {
    // The shuffled position this answer is shown in.
    slot: number
    answer: string

    // Revealed rounds only.
    authorId?: string
    // Revealed rounds only: both writers when they wrote the same thing.
    authorIds?: string[]
    voters?: string[]
    // Revealed rounds only: what this answer earned, sweep bonus included.
    points?: number
    // Revealed rounds only: this answer took every vote.
    sweep?: boolean
}

export interface WWRound {
    id: string
    number: number
    // The prompt with any player's name already put in.
    line: string
    subjectId?: string

    mine: boolean
    answered: boolean
    myAnswer?: string
    answerCount: number

    canVote: boolean
    myVoteSlot?: number
    voteCount: number

    // Present only for the round being voted on and for rounds already revealed.
    options?: WWOption[]

    revealed: boolean
    authors?: string[]
}

export interface WWGame {
    id: string
    lobbyId: string
    ownerId: string
    locale: LanguageCode
    gameMode: WWGameMode

    phase: WWPhase
    currentRound: number
    totalRounds: number
    status: WWGameStatus
    createdAt: string

    score: number

    answersIn: number
    answersNeeded: number
    votesNeeded: number
    maxAnswerLength: number

    players: WWGamePlayer[]
    rounds: WWRound[]
}

// What one batch did: counts, and nothing else.
export interface WWAnswerResult {
    gameId: string
    phase: WWPhase
    answersIn: number
    answersNeeded: number
    votingOpened: boolean
}

export interface WWPublicRound {
    id: string
    number: number
    line: string
    subjectId?: string
    options: WWOption[]
}

export interface WWReveal {
    roundNumber: number
    line: string
    authors: string[]
    options: WWOption[]
}

export interface WWVoteResult {
    gameId: string
    roundNumber: number
    votes: number
    votesNeeded: number
    roundOver: boolean
    lastRound: boolean
    currentRound: number
    phase: WWPhase
    status: WWGameStatus
    players: WWGamePlayer[]
    reveal?: WWReveal
}

export interface WWAdvanceResult {
    gameId: string
    phase: WWPhase
    currentRound: number
    status: WWGameStatus
    players: WWGamePlayer[]
    nextRound?: WWPublicRound
}

export interface WWRoundAnswer {
    roundNumber: number
    answer: string
}

const gamePath = (gameId: string) => `/api/v1/witty-wars/game/${encodeURIComponent(gameId)}`;

export async function getWWGame(gameId: string): Promise<WWGame> {
    return request<WWGame>(gamePath(gameId));
}

// Every answer this player owes, in the one request the server takes them in.
export async function submitWWAnswers(gameId: string, answers: WWRoundAnswer[]): Promise<WWAnswerResult> {
    return request<WWAnswerResult>(`${gamePath(gameId)}/answers`, {
        method: 'POST',
        body: JSON.stringify({ answers })
    });
}

export async function castWWVote(gameId: string, roundNumber: number, slot: number): Promise<WWVoteResult> {
    return request<WWVoteResult>(`${gamePath(gameId)}/votes`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber, slot })
    });
}

// Leaves the reveal for the next round, or for the final scores. The host's alone.
export async function advanceWWRound(gameId: string, roundNumber: number): Promise<WWAdvanceResult> {
    return request<WWAdvanceResult>(`${gamePath(gameId)}/advance`, {
        method: 'POST',
        body: JSON.stringify({ roundNumber })
    });
}

export function wwRoundOf(game: WWGame, roundNumber: number): WWRound | undefined {
    return game.rounds.find(round => round.number === roundNumber);
}

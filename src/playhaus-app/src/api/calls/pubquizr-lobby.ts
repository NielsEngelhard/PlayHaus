import { apiErrorCode, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';

// The waiting room a multi device quiz is set up in: one phone per player, and a screen that holds no seat.

export type PQLobbyStatus = 'waiting' | 'started';

export interface PQLobbyPlayer {
    userId: string
    /** Where they sit. Handed out in join order and never moved, so a seat that is given back leaves a hole. */
    seat: number
    name: string
    avatarColorId: string
    joinedAt: string
}

export interface PQLobbySetup {
    /** The quiz the host has picked, absent until they have picked one. */
    quizId?: string
    locale: LanguageCode
    zenMode: boolean
    triviaMode: boolean
}

export interface PQLobby {
    id: string
    // What players type in to get here.
    code: string
    /** Whose room it is. Only this player may change the setup, start the evening or close the room. */
    hostId: string
    status: PQLobbyStatus
    setup: PQLobbySetup
    /** Every phone in the room, in seating order. The host is always the first. */
    players: PQLobbyPlayer[]
    // What the room will and will not start on, as the server understands them.
    minPlayers: number
    maxPlayers: number
    createdAt: string
    /** The evening to open, present only once `status` is `started`. */
    sessionId?: string
}

/** The room is full. Its own error so the join screen can say so rather than apologise. */
export class PQLobbyFullError extends Error {
    constructor() {
        super('lobby is full');
        this.name = 'PQLobbyFullError';
    }
}

const lobbyPath = (code: string) => `/api/v1/pubquizr/multi-device/lobby/${encodeURIComponent(code)}`;

export async function createPQLobby(locale?: LanguageCode): Promise<PQLobby> {
    return request<PQLobby>('/api/v1/pubquizr/multi-device/lobby', {
        method: 'POST',
        body: JSON.stringify({ locale })
    });
}

// The room this player is still on the hook for, or null when there is none.
export async function getCurrentPQLobby(): Promise<PQLobby | null> {
    return request<PQLobby | null>('/api/v1/pubquizr/multi-device/lobby/current');
}

// Reads a room back. Anybody with the code may look, which is how the shared screen gets in.
export async function getPQLobby(code: string): Promise<PQLobby> {
    return request<PQLobby>(lobbyPath(code));
}

export async function joinPQLobby(code: string, name?: string): Promise<PQLobby> {
    try {
        return await request<PQLobby>(`${lobbyPath(code)}/players`, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    } catch (failure) {
        if (apiErrorCode(failure) === 'lobby_full') throw new PQLobbyFullError();
        throw failure;
    }
}

// Saves what the host has picked. A field left out keeps whatever the room is already set to.
export async function updatePQLobbySetup(code: string, setup: Partial<PQLobbySetup>): Promise<PQLobby> {
    return request<PQLobby>(lobbyPath(code), {
        method: 'PATCH',
        body: JSON.stringify(setup)
    });
}

// Deals the evening. The lobby comes back with `sessionId` set, so there is one way into play rather than two.
export async function startPQLobby(code: string): Promise<PQLobby> {
    return request<PQLobby>(`${lobbyPath(code)}/start`, { method: 'POST' });
}

export async function deletePQLobby(code: string): Promise<void> {
    await request<void>(lobbyPath(code), { method: 'DELETE' });
}

export async function leavePQLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/players/me`, { method: 'DELETE' });
}

/** Whether this player owns the room, which is the whole of the permission model. */
export function isHostOfPQ(lobby: PQLobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

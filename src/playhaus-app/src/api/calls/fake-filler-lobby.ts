import { apiErrorCode, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';

// The waiting room a Fake Filler game is set up in.

// Which pile of prompts the room is playing out of, which decides whether there is a truth to find at all.
export type FFGameMode = 'facts' | 'creative';

export type FFLobbyStatus = 'waiting' | 'started';

export interface FFLobbyPlayer {
    userId: string
    name: string
    avatarColorId: string
    joinedAt: string
}

export interface FFLobbySettings {
    gameMode: FFGameMode
    locale: LanguageCode
}

export interface FFLobby {
    id: string
    // What players type in to get here.
    code: string
    /** Whose room it is. Only this player may change the settings or start the game. */
    hostId: string
    status: FFLobbyStatus
    settings: FFLobbySettings
    /** Everyone in the room, in the order they sat down. The host is always the first. */
    players: FFLobbyPlayer[]
    // What the room will and will not start on, as the server understands them. `minPlayers` moves with the mode.
    minPlayers: number
    maxPlayers: number
    createdAt: string
    /** The game to open, present only once `status` is `started`. */
    gameId?: string
    // The room this one's table has moved on to, present only once the game is over and the host has opened another.
    rematchCode?: string
}

/** The room is full. Its own error so the join screen can say so rather than apologise. */
export class FFLobbyFullError extends Error {
    constructor() {
        super('lobby is full');
        this.name = 'FFLobbyFullError';
    }
}

const lobbyPath = (code: string) => `/api/v1/fake-filler/lobby/${encodeURIComponent(code)}`;

export async function createFFLobby(locale?: LanguageCode): Promise<FFLobby> {
    return request<FFLobby>('/api/v1/fake-filler/lobby', {
        method: 'POST',
        body: JSON.stringify({ locale })
    });
}

// The room this player is still on the hook for, or null when there is none.
export async function getCurrentFFLobby(): Promise<FFLobby | null> {
    return request<FFLobby | null>('/api/v1/fake-filler/lobby/current');
}

export async function joinFFLobby(code: string): Promise<FFLobby> {
    try {
        return await request<FFLobby>(`${lobbyPath(code)}/players`, { method: 'POST' });
    } catch (failure) {
        if (apiErrorCode(failure) === 'lobby_full') throw new FFLobbyFullError();
        throw failure;
    }
}

// Reads a room back.
export async function getFFLobby(code: string): Promise<FFLobby> {
    return request<FFLobby>(lobbyPath(code));
}

// Saves the room's settings.
export async function updateFFLobbySettings(code: string, settings: FFLobbySettings): Promise<FFLobby> {
    return request<FFLobby>(lobbyPath(code), {
        method: 'PATCH',
        body: JSON.stringify({
            gameMode: settings.gameMode,
            locale: settings.locale
        })
    });
}

// Starts the game on whatever the room is set to.
export async function startFFLobby(code: string): Promise<FFLobby> {
    return request<FFLobby>(`${lobbyPath(code)}/start`, { method: 'POST' });
}

export async function deleteFFLobby(code: string): Promise<void> {
    await request<void>(lobbyPath(code), { method: 'DELETE' });
}

export async function leaveFFLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/players/me`, { method: 'DELETE' });
}

export async function abandonFFLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/abandon`, { method: 'POST' });
}

export async function rematchFFLobby(code: string): Promise<FFLobby> {
    return request<FFLobby>(`${lobbyPath(code)}/rematch`, { method: 'POST' });
}

/** Whether this player owns the room, which is the whole of the permission model. */
export function isHostOfFF(lobby: FFLobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

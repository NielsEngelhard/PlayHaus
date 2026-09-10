import { apiErrorCode, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';
import type { OneOfUsRole } from '@/features/one-of-us/models';

// The waiting room a multi-device One of Us game is set up in.

export type OOULobbyStatus = 'waiting' | 'started';

export interface OOULobbyPlayer {
    userId: string
    name: string
    avatarColorId: string
    joinedAt: string
}

export interface OOULobbySettings {
    /** Words rather than the sentences the game deals by default. */
    wordOnly: boolean
    // Which imposter roles this table is willing to be dealt, as the role numbers themselves.
    enabledRoles: OneOfUsRole[]
    locale: LanguageCode
}

export interface OOULobby {
    id: string
    // What players type in to get here.
    code: string
    /** Whose room it is. Only this player may change the settings or start the game. */
    hostId: string
    status: OOULobbyStatus
    settings: OOULobbySettings
    /** Everyone in the room, in the order they sat down. The host is always the first. */
    players: OOULobbyPlayer[]
    // What the room will and will not start on, as the server understands them.
    minPlayers: number
    maxPlayers: number
    createdAt: string
    /** The game to open, present only once `status` is `started`. */
    gameId?: string
    // The room this one's table has moved on to, present only once the game is over and the host has opened another.
    rematchCode?: string
}

/** The room is full. Its own error so the join screen can say so rather than apologise. */
export class OOULobbyFullError extends Error {
    constructor() {
        super('lobby is full');
        this.name = 'OOULobbyFullError';
    }
}

const lobbyPath = (code: string) => `/api/v1/one-of-us/lobby/${encodeURIComponent(code)}`;

export async function createOOULobby(locale?: LanguageCode): Promise<OOULobby> {
    return request<OOULobby>('/api/v1/one-of-us/lobby', {
        method: 'POST',
        body: JSON.stringify({ locale })
    });
}

// The room this player is still on the hook for, or null when there is none.
export async function getCurrentOOULobby(): Promise<OOULobby | null> {
    return request<OOULobby | null>('/api/v1/one-of-us/lobby/current');
}

export async function joinOOULobby(code: string): Promise<OOULobby> {
    try {
        return await request<OOULobby>(`${lobbyPath(code)}/players`, { method: 'POST' });
    } catch (failure) {
        if (apiErrorCode(failure) === 'lobby_full') throw new OOULobbyFullError();
        throw failure;
    }
}

// Reads a room back.
export async function getOOULobby(code: string): Promise<OOULobby> {
    return request<OOULobby>(lobbyPath(code));
}

// Saves the room's settings.
export async function updateOOULobbySettings(code: string, settings: OOULobbySettings): Promise<OOULobby> {
    return request<OOULobby>(lobbyPath(code), {
        method: 'PATCH',
        body: JSON.stringify({
            wordOnly: settings.wordOnly,
            enabledRoles: settings.enabledRoles,
            locale: settings.locale
        })
    });
}

// Starts the game on whatever the room is set to.
export async function startOOULobby(code: string): Promise<OOULobby> {
    return request<OOULobby>(`${lobbyPath(code)}/start`, { method: 'POST' });
}

export async function deleteOOULobby(code: string): Promise<void> {
    await request<void>(lobbyPath(code), { method: 'DELETE' });
}

export async function leaveOOULobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/players/me`, { method: 'DELETE' });
}

export async function abandonOOULobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/abandon`, { method: 'POST' });
}

export async function rematchOOULobby(code: string): Promise<OOULobby> {
    return request<OOULobby>(`${lobbyPath(code)}/rematch`, { method: 'POST' });
}

/** Whether this player owns the room, which is the whole of the permission model. */
export function isHostOfOOU(lobby: OOULobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

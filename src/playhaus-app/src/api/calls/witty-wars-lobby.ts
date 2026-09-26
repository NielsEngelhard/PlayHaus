import { apiErrorCode, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';

// The waiting room a Witty Wars game is set up in.

// Which pile of prompts the room is playing out of.
export type WWGameMode = 'family' | 'rude' | 'caliente';

// In the order they are offered. `family` is the server's default, so it leads.
export const WW_GAME_MODES: readonly WWGameMode[] = ['family', 'rude', 'caliente'];

export function isWWGameMode(value: unknown): value is WWGameMode {
    return WW_GAME_MODES.some(mode => mode === value);
}

export type WWLobbyStatus = 'waiting' | 'started';

export interface WWLobbyPlayer {
    userId: string
    name: string
    avatarColorId: string
    joinedAt: string
}

export interface WWLobbySettings {
    gameMode: WWGameMode
    // How many prompts each player is dealt to write for.
    answersPerPlayer: number
    locale: LanguageCode
}

export interface WWLobby {
    id: string
    code: string
    hostId: string
    status: WWLobbyStatus
    settings: WWLobbySettings
    // Everyone in the room, in the order they sat down; the host first.
    players: WWLobbyPlayer[]
    minPlayers: number
    maxPlayers: number
    minAnswersPerPlayer: number
    maxAnswersPerPlayer: number
    maxAnswerLength: number
    createdAt: string
    // Present only once `status` is `started`.
    gameId?: string
    rematchCode?: string
}

// The room is full; its own error so the join screen can say so.
export class WWLobbyFullError extends Error {
    constructor() {
        super('lobby is full');
        this.name = 'WWLobbyFullError';
    }
}

const lobbyPath = (code: string) => `/api/v1/witty-wars/lobby/${encodeURIComponent(code)}`;

export async function createWWLobby(locale?: LanguageCode, gameMode?: WWGameMode): Promise<WWLobby> {
    return request<WWLobby>('/api/v1/witty-wars/lobby', {
        method: 'POST',
        body: JSON.stringify({ gameMode, locale })
    });
}

// The room this player is still on the hook for, or null when there is none.
export async function getCurrentWWLobby(): Promise<WWLobby | null> {
    return request<WWLobby | null>('/api/v1/witty-wars/lobby/current');
}

export async function joinWWLobby(code: string): Promise<WWLobby> {
    try {
        return await request<WWLobby>(`${lobbyPath(code)}/players`, { method: 'POST' });
    } catch (failure) {
        if (apiErrorCode(failure) === 'lobby_full') throw new WWLobbyFullError();
        throw failure;
    }
}

export async function updateWWLobbySettings(code: string, settings: WWLobbySettings): Promise<WWLobby> {
    return request<WWLobby>(lobbyPath(code), {
        method: 'PATCH',
        body: JSON.stringify({
            answersPerPlayer: settings.answersPerPlayer,
            gameMode: settings.gameMode,
            locale: settings.locale
        })
    });
}

export async function startWWLobby(code: string): Promise<WWLobby> {
    return request<WWLobby>(`${lobbyPath(code)}/start`, { method: 'POST' });
}

export async function deleteWWLobby(code: string): Promise<void> {
    await request<void>(lobbyPath(code), { method: 'DELETE' });
}

export async function leaveWWLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/players/me`, { method: 'DELETE' });
}

export async function abandonWWLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/abandon`, { method: 'POST' });
}

export async function rematchWWLobby(code: string): Promise<WWLobby> {
    return request<WWLobby>(`${lobbyPath(code)}/rematch`, { method: 'POST' });
}

export function isHostOfWW(lobby: WWLobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

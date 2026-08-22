import { ApiError, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';
import type { WordLength } from '@/features/league-of-letters/solo-settings';

/**
 * The waiting room a multiplayer League of Letters game is set up in.
 */

export const MAX_LOBBY_PLAYERS = 6;
export const MIN_LOBBY_PLAYERS = 2;
export const LOBBY_CODE_LENGTH = 4;
export type LobbyStatus = 'waiting' | 'started';

export interface LobbyPlayer {
    userId: string
    name: string
    avatarColorId: string
    joinedAt: string
}

export interface LobbySettings {
    locale: LanguageCode
    wordLength: WordLength
    hardMode: boolean
    secondsPerGuess: number
}

export interface StartLobbyRequestData {
    lobbyId: string,
    locale: LanguageCode
    wordLength: WordLength
    hardMode: boolean
    secondsPerGuess?: number
}

export interface Lobby {
    id: string
    /** What players type in to get here. Uppercase, `LOBBY_CODE_LENGTH` characters. */
    code: string
    /** Whose room it is. Only this player may change the settings or start the game. */
    hostId: string
    status: LobbyStatus
    settings: LobbySettings
    /** Everyone in the room, oldest membership first. The host is always the first. */
    players: LobbyPlayer[]
    createdAt: string
    /** The game to open, present only once `status` is `started`. */
    gameId?: string
    /**
     * The room this one's table has moved on to, present only once the game is over and
     * the host has opened another.
     *
     * On every lobby rather than only announced over the socket, so a player whose
     * connection blipped over the announcement is still carried across by the next
     * snapshot instead of being left on a result nobody is coming back to.
     */
    rematchCode?: string
}

/** The room is full. Its own error so the join screen can say so rather than apologise. */
export class LobbyFullError extends Error {
    constructor() {
        super('lobby is full');
        this.name = 'LobbyFullError';
    }
}

/**
 * The machine-readable tag on a refusal.
 *
 * A full room and a room that has already started are both 409, and the app says
 * something quite different about each. Branching on the tag rather than the prose
 * means the server can reword its messages without breaking this.
 */
function errorCode(failure: unknown): string | undefined {
    if (!(failure instanceof ApiError)) return undefined;
    if (failure.body === null || typeof failure.body !== 'object') return undefined;

    const { code } = failure.body as { code?: unknown };
    return typeof code === 'string' ? code : undefined;
}

const lobbyPath = (code: string) => `/api/v1/league-of-letters/lobby/${encodeURIComponent(code)}`;

export async function createLobby(locale?: LanguageCode): Promise<Lobby> {
    return request<Lobby>('/api/v1/league-of-letters/lobby', {
        method: 'POST',
        body: JSON.stringify({ locale })
    });
}

/**
 * The room this player is still on the hook for, or null when there is none.
 *
 * The multiplayer twin of `getCurrentGame`, and it exists for the same reason: the
 * room screen opens a lobby the moment its host arrives, so without asking this first
 * a host with something already running is handed a second room rather than asked
 * about the first. `status` says which sort it is — a room nobody has started, or one
 * whose game is being played.
 */
export async function getCurrentLobby(): Promise<Lobby | null> {
    return request<Lobby | null>('/api/v1/league-of-letters/lobby/current');
}

export async function joinLobby(code: string): Promise<Lobby> {
    try {
        return await request<Lobby>(`${lobbyPath(code)}/players`, { method: 'POST' });
    } catch (failure) {
        if (errorCode(failure) === 'lobby_full') throw new LobbyFullError();
        throw failure;
    }
}

/**
 * Reads a room back. This is the snapshot the screen opens on; everything after it
 * arrives over the socket.
 */
export async function getLobby(code: string): Promise<Lobby> {
    return request<Lobby>(lobbyPath(code));
}

export async function startLobby(data: StartLobbyRequestData): Promise<Lobby> {
    return request<Lobby>(`${lobbyPath(data.lobbyId)}/start`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteLobby(code: string): Promise<void> {
    await request<void>(lobbyPath(code), { method: 'DELETE' });
}

export async function leaveLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/players/me`, { method: 'DELETE' });
}

/**
 * Throws a room away for good, game and all. Host only.
 *
 * Not `deleteLobby`: that one deliberately leaves a started room's game alone, because
 * it is only ever a host stepping out of a room they are done with. This is the host
 * saying they are done with the *game*, so the table is told and the board stops being
 * something anybody can play. Ask before calling it.
 */
export async function abandonLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/abandon`, { method: 'POST' });
}

/**
 * Opens a fresh room for the table that just finished a game, and answers it. Host only. Bring players who are still connected to the new lobby.
 */
export async function rematchLobby(code: string): Promise<Lobby> {
    return request<Lobby>(`${lobbyPath(code)}/rematch`, { method: 'POST' });
}

/** Whether this player owns the room, which is the whole of the permission model. */
export function isHostOf(lobby: Lobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

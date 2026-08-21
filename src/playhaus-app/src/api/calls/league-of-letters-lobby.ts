import { ApiError, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';
import type { WordLength } from '@/features/league-of-letters/solo-settings';

/**
 * The waiting room a multiplayer League of Letters game is set up in.
 *
 * Mirrors the response types in the Go backend's
 * `internal/api/multiplayer-league-of-letters.go` — keep the two in step.
 *
 * Nothing here polls. The room is kept up to date over the socket instead: joins,
 * settings and the game starting all arrive as events, and these calls are only how
 * a player *changes* something plus the one read that opens the screen.
 */

/** A room holds six. Fixed here rather than per-lobby — there is nothing to configure. */
export const MAX_LOBBY_PLAYERS = 6;

/**
 * And it needs two. A game with one player in it is a solo game with extra steps, which is
 * what `StartLobby` in the Go `multiplayer.go` refuses on — mirrored here so the host's
 * start button can say no first.
 */
export const MIN_LOBBY_PLAYERS = 2;

/**
 * Join codes are four characters, which is what `RoomCodeCard` draws slots for. Mirrors
 * `JoinCodeLength` in the Go `league-of-letters.go`; the API does not report it, so the
 * two have to be changed together.
 */
export const LOBBY_CODE_LENGTH = 4;

/**
 * `waiting` is the lobby proper. `started` means the host has committed: `gameId` is
 * filled in and everybody still on the screen moves to the board.
 */
export type LobbyStatus = 'waiting' | 'started';

/**
 * Someone in the room. Deliberately the front half of `GamePlayer` from
 * `./league-of-letters` — same ids, same swatch field — so a lobby player and the
 * scoreboard player they turn into are the same person to every component that draws one.
 */
export interface LobbyPlayer {
    userId: string
    name: string
    /** Which swatch in `AVATAR_COLORS`, not a colour — same as on `User`. */
    avatarColorId: string
    joinedAt: string
}

/**
 * What the host gets to decide once the room exists. The same two knobs a solo game is
 * set up with, so the lobby can reuse `WordLengthCard` and the language list rather
 * than growing its own.
 *
 * Not what a room is opened with — see `createLobby`. Opening a room and deciding what
 * it plays are two different moments, and only the second one has a host sitting in
 * front of the settings card.
 */
export interface LobbySettings {
    locale: LanguageCode
    wordLength: WordLength
    hardMode: boolean
}

export interface StartLobbyRequestData {
    lobbyId: string,
    locale: LanguageCode
    wordLength: WordLength
    hardMode: boolean    
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
 * Opens a fresh room for the table that just finished a game, and answers it. Host only. Bring players who are still connected to the new lobby.
 */
export async function rematchLobby(code: string): Promise<Lobby> {
    return request<Lobby>(`${lobbyPath(code)}/rematch`, { method: 'POST' });
}

/** Whether this player owns the room, which is the whole of the permission model. */
export function isHostOf(lobby: Lobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

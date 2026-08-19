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
 * What the host gets to decide. The same two knobs a solo game is set up with, so the
 * lobby can reuse `WordLengthCard` and the language list rather than growing its own.
 */
export interface LobbySettings {
    locale: LanguageCode
    wordLength: WordLength
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

/**
 * Opens a room and puts you in it as the host.
 *
 * Answers the whole lobby rather than just a code: the caller needs the code to show,
 * the player list to draw, and its own id back to know it is the host — and one of the
 * three arriving later than the others would be a room that pops into existence in
 * pieces.
 */
export async function createLobby(settings: LobbySettings): Promise<Lobby> {
    return request<Lobby>('/api/v1/league-of-letters/lobby', {
        method: 'POST',
        body: JSON.stringify(settings)
    });
}

/**
 * Steps into somebody else's room by its code, and is safe to call again on a room you
 * are already in — reopening the screen must not be a second membership.
 *
 * Throws `LobbyFullError` rather than an `ApiError`, because being turned away from a
 * full room is not a failure the player did anything wrong to cause.
 */
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

/**
 * Changes what the room is going to play. Host only — the server is what enforces that,
 * and the screen only hides the controls.
 */
export async function updateLobbySettings(code: string, settings: LobbySettings): Promise<Lobby> {
    return request<Lobby>(lobbyPath(code), {
        method: 'PATCH',
        body: JSON.stringify(settings)
    });
}

/**
 * Starts the game the room was set up for. Host only.
 *
 * The answer is the lobby rather than the game: what everyone else is watching is the
 * lobby, and `gameId` appearing on it is how they find out. The board is fetched from
 * the game endpoints afterwards, by id, the same way solo does it.
 */
export async function startLobby(code: string): Promise<Lobby> {
    return request<Lobby>(`${lobbyPath(code)}/start`, { method: 'POST' });
}

/**
 * Closes the room for good. The host's way out, and what the room screen calls when it
 * is navigated away from — a lobby nobody is looking at is a code that still works and
 * a game that will never start.
 *
 * Answers 204, and a code that is already gone is a no-op rather than a 404: the screen
 * fires this on its way out, where there is nobody left to tell.
 */
export async function deleteLobby(code: string): Promise<void> {
    await request<void>(lobbyPath(code), { method: 'DELETE' });
}

/**
 * Steps out of somebody else's room without closing it. The guest half of
 * `deleteLobby`, and a no-op on a room that is already gone for the same reason.
 */
export async function leaveLobby(code: string): Promise<void> {
    await request<void>(`${lobbyPath(code)}/players/me`, { method: 'DELETE' });
}

/** Whether this player owns the room, which is the whole of the permission model. */
export function isHostOf(lobby: Lobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

import { apiErrorCode, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';

/**
 * The waiting room a Fake Filler game is set up in.
 *
 * Deliberately the same shape as `league-of-letters-lobby.ts`, because the backend's
 * lobby half is League of Letters' lobby with the words taken out: same routes, same
 * verbs, same error codes, same `{id, code, hostId, status, settings, players}` body.
 * The two differences worth knowing are below — the settings, and where the player
 * bounds come from.
 */

/**
 * Which pile of prompts the room is playing out of, which decides whether there is a
 * truth to find at all.
 *
 * `facts` prompts carry the real answer, so a round is two fakes and the truth and you
 * score for spotting it. `creative` prompts have no truth — nobody was going to guess
 * "the funniest thing to say here" — so a round is the two fakes alone and the only
 * points are for being picked.
 */
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
    /**
     * What players type in to get here. Uppercase, five characters, the first of which
     * is `F` — every game's codes are drawn from one generator and say which game they
     * belong to. See `features/join/join-code.ts`.
     */
    code: string
    /** Whose room it is. Only this player may change the settings or start the game. */
    hostId: string
    status: FFLobbyStatus
    settings: FFLobbySettings
    /** Everyone in the room, in the order they sat down. The host is always the first. */
    players: FFLobbyPlayer[]
    /**
     * What the room will and will not start on, as the server understands them.
     *
     * Sent on every lobby, which League of Letters' does not do — so unlike that game
     * there is no `MIN_/MAX_LOBBY_PLAYERS` constant here to drift out of step with
     * `internal/fakefiller/rules.go`. Read these instead of hardcoding 3 and 9.
     */
    minPlayers: number
    maxPlayers: number
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

/**
 * The room this player is still on the hook for, or null when there is none.
 *
 * The room screen opens a lobby the moment its host arrives, so without asking this
 * first a host with something already running is handed a second room rather than
 * asked about the first. `status` says which sort it is — a room nobody has started,
 * or one whose game is being played.
 */
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

/**
 * Reads a room back. This is the snapshot the screen opens on; everything after it
 * arrives over the socket.
 */
export async function getFFLobby(code: string): Promise<FFLobby> {
    return request<FFLobby>(lobbyPath(code));
}

/**
 * Saves the room's settings. Host only, and only while the room is still waiting.
 *
 * A PATCH that sends both knobs every time. The server treats an absent field as "leave
 * it alone" and re-reads the lobby before merging, so sending one would be safe too —
 * but the settings card holds both and sending what it holds is the simpler contract.
 *
 * Answers the whole room, and the server sends the same body out over the socket, so
 * everybody sitting in the lobby sees the change rather than only the host who made it.
 */
export async function updateFFLobbySettings(code: string, settings: FFLobbySettings): Promise<FFLobby> {
    return request<FFLobby>(lobbyPath(code), {
        method: 'PATCH',
        body: JSON.stringify({
            gameMode: settings.gameMode,
            locale: settings.locale
        })
    });
}

/**
 * Starts the game on whatever the room is set to.
 *
 * Takes nothing but the code: the settings are the room's, saved by
 * `updateFFLobbySettings` as the host moves them, and the server reads them off the
 * lobby. Answers the lobby rather than the game — every player's board is different, so
 * each of them fetches their own once `gameId` appears.
 */
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

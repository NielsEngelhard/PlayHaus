import { ApiError } from '@/api/client';
import type { LanguageCode, WordLength } from '@/features/league-of-letters/solo-settings';

/**
 * The waiting room a multiplayer League of Letters game is set up in.
 *
 * The types below are the contract the room screen is written against. The backend has
 * the two routes registered — `POST /api/v1/league-of-letters/create-multiplayer-lobby`
 * and `.../join-multiplayer-lobby` — but both answer 501 today, so everything under
 * `MOCK` at the foot of this file stands in for them.
 *
 * Kept in one file on purpose: when the endpoints land, the mock section is deleted and
 * each function above it becomes the one-line `request<T>(…)` its doc comment already
 * names. Nothing above this file changes.
 */

/** A room holds six. Fixed here rather than per-lobby — there is nothing to configure. */
export const MAX_LOBBY_PLAYERS = 6;

/** Join codes are six characters, which is what `JoinLeagueOfLettersGameCard` accepts. */
export const LOBBY_CODE_LENGTH = 6;

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
 * Opens a room and puts you in it as the host.
 *
 * Answers the whole lobby rather than just a code: the caller needs the code to show,
 * the player list to draw, and its own id back to know it is the host — and one of the
 * three arriving later than the others would be a room that pops into existence in
 * pieces.
 *
 * TODO: `POST /api/v1/league-of-letters/create-multiplayer-lobby`.
 */
export async function createLobby(settings: LobbySettings): Promise<Lobby> {
    await latency(260);

    const code = newCode();
    const now = Date.now();

    const host: LobbyPlayer = { ...identity, joinedAt: new Date(now).toISOString() };

    const lobby: Lobby = {
        id: `lobby-${code}`,
        code,
        hostId: host.userId,
        status: 'waiting',
        settings,
        players: [host],
        createdAt: new Date(now).toISOString()
    };

    rooms.set(code, { lobby, openedAt: now, script: arrivals(now, 1) });

    return read(code);
}

/**
 * Steps into somebody else's room by its code, and is safe to call again on a room you
 * are already in — reopening the screen must not be a second membership.
 *
 * Throws `LobbyFullError` rather than an `ApiError`, because being turned away from a
 * full room is not a failure the player did anything wrong to cause.
 *
 * TODO: `POST /api/v1/league-of-letters/join-multiplayer-lobby`.
 */
export async function joinLobby(code: string): Promise<Lobby> {
    await latency(260);

    const room = rooms.get(code) ?? openMockRoom(code);
    const present = roster(room);

    // Already in, which is the common case: the host lands here again the moment the
    // game starts, and so does anyone who backgrounded the app and came back.
    if (present.some(player => player.userId === identity.userId)) return read(code);

    if (present.length >= MAX_LOBBY_PLAYERS) throw new LobbyFullError();

    room.lobby.players = [...room.lobby.players, { ...identity, joinedAt: new Date().toISOString() }];

    return read(code);
}

/**
 * Reads a room back. This is what the lobby polls: players arriving, settings the host
 * changed, and the moment the game starts all reach everyone else through here.
 *
 * TODO: `GET /api/v1/league-of-letters/lobby/{code}`.
 */
export async function getLobby(code: string): Promise<Lobby> {
    await latency(80);

    return read(code);
}

/**
 * Changes what the room is going to play. Host only — the server is what enforces that,
 * and the screen only hides the controls.
 *
 * TODO: `PATCH /api/v1/league-of-letters/lobby/{code}`.
 */
export async function updateLobbySettings(code: string, settings: LobbySettings): Promise<Lobby> {
    await latency(200);

    const room = required(code);
    room.lobby.settings = settings;

    return read(code);
}

/**
 * Starts the game the room was set up for. Host only.
 *
 * The answer is the lobby rather than the game: what everyone else is polling is the
 * lobby, and `gameId` appearing on it is how they find out. The board is fetched from
 * the game endpoints afterwards, by id, the same way solo does it.
 *
 * TODO: `POST /api/v1/league-of-letters/lobby/{code}/start`.
 */
export async function startLobby(code: string): Promise<Lobby> {
    await latency(320);

    const room = required(code);

    // Membership is settled at kickoff: whoever was still on their way in is too late,
    // and the game's player list has to be the one the scoreboard is drawn from.
    room.lobby.players = roster(room);
    room.lobby.status = 'started';
    room.lobby.gameId ??= `game-${room.lobby.code}`;

    return read(code);
}

/**
 * Closes the room for good. The host's way out, and what the room screen calls when it
 * is navigated away from — a lobby nobody is looking at is a code that still works and
 * a game that will never start.
 *
 * Answers 204, and a code that is already gone is a no-op rather than a 404: the screen
 * fires this on its way out, where there is nobody left to tell.
 *
 * TODO: `DELETE /api/v1/league-of-letters/lobby/{code}`.
 */
export async function deleteLobby(code: string): Promise<void> {
    await latency(120);

    rooms.delete(code);
}

/**
 * Steps out of somebody else's room without closing it. The guest half of
 * `deleteLobby`, and a no-op on a room that is already gone for the same reason.
 *
 * TODO: `DELETE /api/v1/league-of-letters/lobby/{code}/players/me`.
 */
export async function leaveLobby(code: string): Promise<void> {
    await latency(120);

    const room = rooms.get(code);
    if (room === undefined) return;

    room.lobby.players = room.lobby.players.filter(player => player.userId !== identity.userId);
    room.script = room.script.filter(arrival => arrival.player.userId !== identity.userId);
}

/** Whether this player owns the room, which is the whole of the permission model. */
export function isHostOf(lobby: Lobby, userId: string | undefined): boolean {
    return userId !== undefined && lobby.hostId === userId;
}

// ---------------------------------------------------------------------------------
// MOCK
//
// TODO: delete everything below this line once the two 501s above are real endpoints.
// Nothing outside this file imports any of it except `setLobbyIdentity`, which exists
// only because a real server would read the player off the session instead.
// ---------------------------------------------------------------------------------

/** One room, plus what it needs to fake other people turning up. */
interface MockRoom {
    lobby: Lobby
    /** When the room opened, in ms. The scripted arrivals are measured from it. */
    openedAt: number
    /** Who is going to walk in, and how long after the room opened they do. */
    script: { player: LobbyPlayer, afterMs: number }[]
}

const rooms = new Map<string, MockRoom>();

/**
 * Who "you" are. The real endpoints read this off the bearer token; here it has to be
 * handed in, which `useLobby` does before it creates or joins anything.
 */
let identity: Omit<LobbyPlayer, 'joinedAt'> = {
    userId: 'user-you',
    name: 'Jij',
    avatarColorId: 'lemon'
};

export function setLobbyIdentity(player: Omit<LobbyPlayer, 'joinedAt'>) {
    identity = player;
}

/**
 * The people who drift in while you wait, and when.
 *
 * A room that is full the instant it opens never shows the state the screen is mostly
 * about — one player, a code, and nothing happening yet. So they arrive over about a
 * quarter of a minute, and there are exactly enough of them to fill the room, which is
 * the other state worth being able to see.
 */
const MOCK_GUESTS: Omit<LobbyPlayer, 'joinedAt'>[] = [
    { userId: 'user-sam', name: 'SnelleVos12', avatarColorId: 'cobalt' },
    { userId: 'user-kim', name: 'StilleUil88', avatarColorId: 'mint' },
    { userId: 'user-bo', name: 'RodeDas21', avatarColorId: 'blush' },
    { userId: 'user-max', name: 'GoudenMus07', avatarColorId: 'fire' },
    { userId: 'user-eve', name: 'WildeHaas33', avatarColorId: 'ink' }
];

const ARRIVAL_MS = [2200, 5000, 8600, 13000, 18500];

/** The scripted arrivals for a room that opened at `openedAt` with `taken` seats gone. */
function arrivals(openedAt: number, taken: number): MockRoom['script'] {
    return MOCK_GUESTS.slice(0, MAX_LOBBY_PLAYERS - taken).map((guest, index) => ({
        player: { ...guest, joinedAt: new Date(openedAt + ARRIVAL_MS[index]).toISOString() },
        afterMs: ARRIVAL_MS[index]
    }));
}

/** Everyone in the room right now: the real members, plus whoever has turned up yet. */
function roster(room: MockRoom): LobbyPlayer[] {
    const elapsed = Date.now() - room.openedAt;

    return [
        ...room.lobby.players,
        ...room.script.filter(arrival => elapsed >= arrival.afterMs).map(arrival => arrival.player)
    ].slice(0, MAX_LOBBY_PLAYERS);
}

/**
 * A room for a code nobody opened — which is every code typed into the join card, since
 * the only rooms that exist are the ones this tab made. Hosted by one of the mock
 * players, so joining it is the guest's side of the screen rather than the host's.
 */
function openMockRoom(code: string): MockRoom {
    const now = Date.now();
    const host: LobbyPlayer = { ...MOCK_GUESTS[0], joinedAt: new Date(now).toISOString() };

    const room: MockRoom = {
        lobby: {
            id: `lobby-${code}`,
            code,
            hostId: host.userId,
            status: 'waiting',
            settings: { locale: 'nl', wordLength: 5 },
            players: [host],
            createdAt: new Date(now).toISOString()
        },
        openedAt: now,
        // The host has a seat, and so will you the moment `joinLobby` adds you — so the
        // script is one shorter than it would be for a room of your own.
        script: arrivals(now, 2).filter(arrival => arrival.player.userId !== host.userId)
    };

    rooms.set(code, room);

    return room;
}

function required(code: string): MockRoom {
    const room = rooms.get(code);
    if (room === undefined) throw new ApiError(404, 'lobby not found');

    return room;
}

/** A copy, so nothing outside this file is holding the store's own objects. */
function read(code: string): Lobby {
    const room = required(code);

    return { ...room.lobby, players: roster(room) };
}

/** Enough of a wait that the screen's loading and saving states are real. */
const latency = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Unambiguous alphabet: no O or 0, no I or 1 — codes get read out loud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode(): string {
    return Array.from(
        { length: LOBBY_CODE_LENGTH },
        () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join('');
}

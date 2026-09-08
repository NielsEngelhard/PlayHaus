import type { Game, GamePlayer, MultiplayerGuessResult, Turn } from '@/api/calls/league-of-letters';
import type { Lobby } from '@/api/calls/league-of-letters-lobby';

// The socket half of the API.

/** A room is `namespace:id`. League of Letters rooms are keyed by their join code. */
export function lolRoom(code: string): string {
    return `lol:${code.toUpperCase()}`;
}

export type ServerEvent =
    /** The whole picture, sent as the connection opens. A reconnect is told where things stand rather than replayed at. */
    | { type: 'state', data: { lobby: Lobby, game?: Game, online: string[] } }
    /** Who is connected. This is the live dot. */
    | { type: 'presence', data: { online: string[] } }
    /** The room changed: somebody in or out, or a setting the host moved. */
    | { type: 'lobby', data: { lobby: Lobby } }
    /** The host shut the room. The code is dead and there is nothing to go back to. */
    | { type: 'lobby_closed', data?: undefined }
    | { type: 'game_started', data: { gameId: string, lobby: Lobby } }
    | { type: 'turn', data: Turn }
    /** The letters the active player has down so far. Never your own. */
    | { type: 'typing', data: { userId: string, letters: string } }
    | { type: 'guess', data: MultiplayerGuessResult }
    | { type: 'game_over', data: { players: GamePlayer[] } }
    /** The host opened a fresh room for the same table. Everybody still here follows the code. */
    | { type: 'rematch', data: { code: string } }
    | { type: 'error', data: { message: string } };

/** The one thing a client says. Everything else is a request. */
export type ClientEvent = { type: 'typing', data: { letters: string } };

// The least a frame can be, and all the transport below needs to know about one.
export type AnyServerEvent = { type: string, data?: unknown };

// `connecting` covers the first attempt and every retry after it, because to the screen they are the same thing.
export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface Socket<C = ClientEvent> {
    send: (event: C) => void
    /** Hangs up for good. A socket closed this way does not reconnect. */
    close: () => void
}

interface Options<E extends AnyServerEvent> {
    room: string
    token: string
    onEvent: (event: E) => void
    onStatus: (status: SocketStatus) => void
}

/** Reconnect backoff: quick enough to be invisible on a blip, slow enough not to hammer a server that is down. */
const FIRST_RETRY_MS = 500;
const MAX_RETRY_MS = 8_000;

// The websocket URL for this build.
function socketUrl(room: string, token: string): string {
    const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/^http/, 'ws');

    // The token goes in the query string because a browser's WebSocket takes a URL and nothing else.
    return `${base}/api/v1/ws?room=${encodeURIComponent(room)}&token=${encodeURIComponent(token)}`;
}

// Opens a room and keeps it open.
export function openSocket<E extends AnyServerEvent = ServerEvent, C = ClientEvent>(
    { room, token, onEvent, onStatus }: Options<E>
): Socket<C> {
    let socket: WebSocket | null = null;
    let retryMs = FIRST_RETRY_MS;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    function connect() {
        if (closed) return;

        onStatus('connecting');

        const ws = new WebSocket(socketUrl(room, token));
        socket = ws;

        // The last frame was a refusal — the room does not exist, or this player is not in it.
        let refused = false;

        ws.onopen = () => {
            if (closed) return;

            // Reset only once a connection actually stands up.
            retryMs = FIRST_RETRY_MS;
            onStatus('open');
        };

        ws.onmessage = event => {
            if (closed) return;

            let parsed: E;
            try {
                parsed = JSON.parse(String(event.data)) as E;
            } catch {
                // A frame this build cannot read.
                return;
            }

            refused = parsed.type === 'error';

            onEvent(parsed);
        };

        // `onerror` is followed by `onclose` on every platform, so the retry is scheduled from one place rather than two.
        ws.onerror = () => { };

        ws.onclose = () => {
            if (closed || socket !== ws) return;

            socket = null;
            onStatus('closed');

            if (refused) return;

            schedule();
        };
    }

    function schedule() {
        if (closed || retryTimer !== null) return;

        // Jittered, so a server coming back up is not met by every client in every room at the same instant.
        const wait = retryMs * (0.75 + Math.random() * 0.5);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);

        retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
        }, wait);
    }

    connect();

    return {
        send(event) {
            // Dropped rather than queued.
            if (socket === null || socket.readyState !== WebSocket.OPEN) return;

            socket.send(JSON.stringify(event));
        },
        close() {
            closed = true;

            if (retryTimer !== null) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }

            socket?.close();
            socket = null;
            onStatus('closed');
        }
    };
}

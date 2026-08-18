import type { Game, GamePlayer, MultiplayerGuessResult, Turn } from '@/api/calls/league-of-letters';
import type { Lobby } from '@/api/calls/league-of-letters-lobby';

/**
 * The socket half of the API.
 *
 * Mirrors the Go backend's `internal/api/league-of-letters-realtime.go` for the
 * message types and `internal/realtime` for the envelope around them — keep the two
 * in step, the same way the REST types are kept in step with their handlers.
 *
 * The protocol is deliberately lopsided. Everything a player *does* goes over HTTP,
 * where the validation, the status codes and the Dutch error copy already live; the
 * socket only carries what happened, plus the one thing HTTP cannot express because
 * it is not a change to anything: the letters somebody is in the middle of typing.
 */

/** A room is `namespace:id`. League of Letters rooms are keyed by their join code. */
export function lolRoom(code: string): string {
    return `lol:${code.toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Server to client
// ---------------------------------------------------------------------------

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
    | { type: 'error', data: { message: string } };

/** The one thing a client says. Everything else is a request. */
export type ClientEvent = { type: 'typing', data: { letters: string } };

// ---------------------------------------------------------------------------
// The connection
// ---------------------------------------------------------------------------

/**
 * `connecting` covers the first attempt and every retry after it, because to the
 * screen they are the same thing: not live yet, and trying.
 */
export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface Socket {
    send: (event: ClientEvent) => void
    /** Hangs up for good. A socket closed this way does not reconnect. */
    close: () => void
}

interface Options {
    room: string
    token: string
    onEvent: (event: ServerEvent) => void
    onStatus: (status: SocketStatus) => void
}

/** Reconnect backoff: quick enough to be invisible on a blip, slow enough not to hammer a server that is down. */
const FIRST_RETRY_MS = 500;
const MAX_RETRY_MS = 8_000;

/**
 * The websocket URL for this build.
 *
 * Derived from the one API base rather than configured separately: a socket that
 * could point somewhere other than the API is a way to have half the app talking to
 * production and the other half to a laptop.
 */
function socketUrl(room: string, token: string): string {
    const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/^http/, 'ws');

    // The token goes in the query string because a browser's WebSocket takes a URL
    // and nothing else. The server reads it exactly as it reads a bearer header,
    // and does not log the query.
    return `${base}/api/v1/ws?room=${encodeURIComponent(room)}&token=${encodeURIComponent(token)}`;
}

/**
 * Opens a room and keeps it open.
 *
 * Reconnects on its own, with backoff, because the alternative is a screen that
 * silently stops updating: a phone that locked, a laptop that slept, a train that
 * went into a tunnel. Every reconnect is answered by the server with a fresh
 * `state`, so nothing has to be replayed and the caller needs no resume logic — it
 * just applies whatever the snapshot says.
 *
 * Uses the global `WebSocket`, which React Native and the web both have. `ws` and
 * friends are Node libraries and would not survive the trip to a device.
 */
export function openSocket({ room, token, onEvent, onStatus }: Options): Socket {
    let socket: WebSocket | null = null;
    let retryMs = FIRST_RETRY_MS;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    function connect() {
        if (closed) return;

        onStatus('connecting');

        const ws = new WebSocket(socketUrl(room, token));
        socket = ws;

        ws.onopen = () => {
            if (closed) return;

            // Reset only once a connection actually stands up. Resetting when one is
            // merely attempted would turn a server that accepts and immediately drops
            // into a tight loop.
            retryMs = FIRST_RETRY_MS;
            onStatus('open');
        };

        ws.onmessage = event => {
            if (closed) return;

            let parsed: ServerEvent;
            try {
                parsed = JSON.parse(String(event.data)) as ServerEvent;
            } catch {
                // A frame this build cannot read. Dropping it is right: the next
                // snapshot carries the truth anyway.
                return;
            }

            onEvent(parsed);
        };

        // `onerror` is followed by `onclose` on every platform, so the retry is
        // scheduled from one place rather than two.
        ws.onerror = () => { };

        ws.onclose = () => {
            if (closed || socket !== ws) return;

            socket = null;
            onStatus('closed');
            schedule();
        };
    }

    function schedule() {
        if (closed || retryTimer !== null) return;

        // Jittered, so a server coming back up is not met by every client in every
        // room at the same instant.
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
            // Dropped rather than queued. The only thing sent is a draft that is
            // about to be superseded by the next keystroke — a letter delivered
            // after a reconnect would be describing a row that has moved on.
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

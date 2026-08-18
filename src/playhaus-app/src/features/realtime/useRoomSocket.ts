import { openSocket, type ClientEvent, type ServerEvent, type Socket, type SocketStatus } from '@/api/socket';
import { sessionToken } from '@/features/auth/useAuth';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RoomSocket {
    /** Whether this device is live. Your own dot. */
    status: SocketStatus
    /** Who else is live, by user id. Everybody else's dot. */
    online: Set<string>
    send: (event: ClientEvent) => void
}

interface Options {
    /**
     * Which room, as `namespace:id`. Pass undefined to stay disconnected — before
     * a lobby exists, or on a screen that has navigated away from one.
     */
    room: string | undefined
    /** Only opens once this is true, which for every caller is "signed in". */
    enabled?: boolean
    onEvent: (event: ServerEvent) => void
}

/**
 * Keeps one room connected for as long as a screen is on it.
 *
 * Game-agnostic on purpose: it knows about connecting, presence and handing frames
 * on, and nothing about what those frames mean. League of Letters reads them in
 * `useLobby` and `useMultiplayerGame`; PubquizR will read its own out of the same
 * hook.
 *
 * Presence is kept here rather than by the caller because it is the one thing every
 * room has and no game has to implement: the server sends the whole list every time
 * it changes, so this is a mirror of it and never a tally kept by hand.
 */
export function useRoomSocket({ room, enabled = true, onEvent }: Options): RoomSocket {
    const [status, setStatus] = useState<SocketStatus>('closed');
    const [online, setOnline] = useState<Set<string>>(() => new Set());

    /**
     * The handler, held in a ref rather than closed over.
     *
     * The callers build theirs from state that changes on every frame, so closing
     * over it would give the effect below a new identity each time — and reopen the
     * socket on every message it received.
     */
    const handler = useRef(onEvent);
    useEffect(() => { handler.current = onEvent; }, [onEvent]);

    /**
     * The live connection, so `send` can keep one identity across renders while the
     * socket underneath it is replaced on every reconnect and every room change.
     */
    const socket = useRef<Socket | null>(null);

    useEffect(() => {
        if (room === undefined || !enabled) return;

        const token = sessionToken();
        if (token === null) return;

        // Subscribing to an external system is what an effect is for, and this one
        // writes no state on the way in: every setState below happens in a callback,
        // once a frame has actually arrived.
        const open = openSocket({
            room,
            token,
            onStatus: setStatus,
            onEvent: event => {
                // Presence is mirrored here so no caller has to; the events still go
                // on, because a screen may want to react to somebody arriving as well
                // as to the list itself.
                if (event.type === 'state' || event.type === 'presence') {
                    setOnline(new Set(event.data.online));
                }

                handler.current(event);
            }
        });

        socket.current = open;

        return () => {
            socket.current = null;
            open.close();
            setOnline(new Set());
        };
    }, [room, enabled]);

    // Stable across renders: the board hands this to the keyboard, and a new
    // function every keystroke would be a new prop on every keystroke.
    const send = useCallback((event: ClientEvent) => {
        socket.current?.send(event);
    }, []);

    return { status, online, send };
}

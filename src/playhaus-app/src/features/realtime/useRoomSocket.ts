import { openSocket, type AnyServerEvent, type ClientEvent, type ServerEvent, type Socket, type SocketStatus } from '@/api/socket';
import { sessionToken } from '@/features/auth/useAuth';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RoomSocket<C = ClientEvent> {
    /** Whether this device is live. Your own dot. */
    status: SocketStatus
    /** Who else is live, by user id. Everybody else's dot. */
    online: Set<string>
    send: (event: C) => void
}

interface Options<E extends AnyServerEvent> {
    // Which room, as `namespace:id`.
    room: string | undefined
    /** Only opens once this is true, which for every caller is "signed in". */
    enabled?: boolean
    onEvent: (event: E) => void
}

// The two frames every room sends whatever game it belongs to.
type PresenceFrame = { type: 'state' | 'presence', data: { online: string[] } };

function isPresence(event: AnyServerEvent): event is PresenceFrame {
    return event.type === 'state' || event.type === 'presence';
}

// Keeps one room connected for as long as a screen is on it.
export function useRoomSocket<E extends AnyServerEvent = ServerEvent>(
    { room, enabled = true, onEvent }: Options<E>
): RoomSocket {
    const [status, setStatus] = useState<SocketStatus>('closed');
    const [online, setOnline] = useState<Set<string>>(() => new Set());

    // The handler, held in a ref rather than closed over.
    const handler = useRef(onEvent);
    useEffect(() => { handler.current = onEvent; }, [onEvent]);

    // The live connection, so `send` can keep one identity across renders while the socket underneath it is replaced on every reconnect and every room change.
    const socket = useRef<Socket | null>(null);

    useEffect(() => {
        if (room === undefined || !enabled) return;

        const token = sessionToken();
        if (token === null) return;

        // Subscribing to an external system is what an effect is for, and this one writes no state on the way in.
        const open = openSocket<E>({
            room,
            token,
            onStatus: setStatus,
            onEvent: event => {
                // Presence is mirrored here so no caller has to.
                if (isPresence(event)) {
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

    // Stable across renders: the board hands this to the keyboard.
    const send = useCallback((event: ClientEvent) => {
        socket.current?.send(event);
    }, []);

    return { status, online, send };
}

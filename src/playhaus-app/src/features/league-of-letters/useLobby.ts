import {
    createLobby,
    deleteLobby,
    isHostOf,
    joinLobby,
    leaveLobby,
    startLobby,
    updateLobbySettings,
    type Lobby,
    type LobbySettings
} from '@/api/calls/league-of-letters-lobby';
import { lolRoom, type ServerEvent, type SocketStatus } from '@/api/socket';
import { useAuth } from '@/features/auth/useAuth';
import { lobbyErrorMessage } from '@/features/league-of-letters/game-errors';
import { DEFAULT_SOLO_SETTINGS } from '@/features/league-of-letters/solo-settings';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface LobbyState {
    lobby: Lobby | null
    /** True until the room has been opened or joined, one way or the other. */
    loading: boolean
    /** The room could not be opened or joined. There is nothing to show. */
    error: string | null
    /** Something went wrong with a room that is still on screen — a save, a start. */
    actionError: string | null
    /** This player owns the room: the settings and the start button are theirs. */
    isHost: boolean
    /** Who is connected right now, by user id. What the live dots are drawn from. */
    online: Set<string>
    /** Whether this device is live. Your own dot. */
    connection: SocketStatus
    /** The host closed the room while you were in it. The code no longer works. */
    closed: boolean
    /** A settings change is in the air. */
    saving: boolean
    /** Host only. Applied on screen at once, then sent. */
    updateSettings: (settings: LobbySettings) => void
    starting: boolean
    /** Host only. Resolves to the started lobby, or null if it could not start. */
    start: () => Promise<Lobby | null>
    closing: boolean
    /**
     * Leave for good: the host's room is deleted, a guest's seat is given back. Safe to
     * call once — afterwards the screen is expected to navigate away.
     */
    close: () => Promise<void>
    reload: () => void
}

/**
 * Opens or joins one multiplayer room and keeps it up to date.
 *
 * Pass a `code` to join somebody else's room; pass nothing to open your own, which
 * makes you its host. Both end in the same place — a `Lobby` kept live by a socket —
 * so the two room screens differ only in what they are allowed to do to it.
 *
 * There used to be a poll here, a second at a time, because everything interesting
 * about a lobby happens on somebody else's phone and there was no socket to be told
 * over. Now there is: a player arriving, the host changing the word length and the
 * game starting all arrive as events, and the only read left is the one that opens
 * the screen.
 *
 * Leaving matters here in a way it does not on other screens: an abandoned room is a
 * code that still works and a game that will never start. So the room is given back
 * on unmount, whatever caused it — the confirm dialog, a tab in the bottom bar, the
 * browser's back button — and the one exit that must *not* give it back, starting the
 * game, says so explicitly.
 */
export function useLobby(code?: string): LobbyState {
    const { user, status } = useAuth();
    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [closed, setClosed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [starting, setStarting] = useState(false);
    const [closing, setClosing] = useState(false);

    // Nothing may touch state after unmount, and the room is exactly the screen people
    // leave while a request is still settling.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /**
     * What leaving this screen has to undo, or null when there is nothing to give back —
     * before the room exists, after the game has started, once it has been handed back
     * already. Read only by the unmount cleanup at the foot of this hook.
     */
    const owed = useRef<{ code: string, host: boolean } | null>(null);

    /** A write is in the air; an event must not land an older room on top of it. */
    const writing = useRef(false);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    /**
     * The language a room opens in: the host's own, so a room starts where its host
     * plays rather than always in Dutch. Only the opening value — the host is free
     * to change it below, and doing so does not touch their account.
     *
     * Held in a ref rather than closed over, so that changing your language on the
     * profile screen cannot change the identity of `load` and open a second room on
     * top of the one already on screen. Declared above the load effect, so it has
     * already run by the time the room is opened on mount.
     */
    const locale = useRef(DEFAULT_SOLO_SETTINGS.locale);
    useEffect(() => {
        locale.current = user?.locale ?? DEFAULT_SOLO_SETTINGS.locale;
    }, [user]);

    const load = useCallback(async () => {
        if (!signedIn || userId === undefined) return;

        try {
            const opened = code === undefined
                ? await createLobby({ ...DEFAULT_SOLO_SETTINGS, locale: locale.current })
                : await joinLobby(code);

            if (!mounted.current) {
                // The screen went while the room was being opened. Nobody is going to
                // see it, and the unmount cleanup has already run with nothing to undo.
                void (isHostOf(opened, userId) ? deleteLobby(opened.code) : leaveLobby(opened.code));
                return;
            }

            // A room that has already started is a game, not a room: there is nothing
            // left to hand back, and handing it back would delete a lobby out from under
            // the players still on the board.
            owed.current = opened.status === 'waiting'
                ? { code: opened.code, host: isHostOf(opened, userId) }
                : null;

            setError(null);
            setLobby(opened);
        } catch (failure) {
            if (!mounted.current) return;

            setError(lobbyErrorMessage(failure));
        }
    }, [signedIn, userId, code]);

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: opening the room on mount and storing the result is the
        // whole job, and there is no query library here to hand it to. State is only
        // written after the request resolves, so nothing cascades in the render this
        // effect belongs to — `useGame` loads the same way.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, load]);

    /** The room the socket is on. Undefined until there is one to be on. */
    const openCode = lobby?.code;

    const onEvent = useCallback((event: ServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state':
            case 'lobby': {
                // Not while a write of our own is settling: the optimistic value on
                // screen is newer than anything that was already in flight.
                if (writing.current) return;

                const fresh = event.data.lobby;
                // Only if it is still the room on screen. `close` and a re-join can both
                // land between a frame being sent and being handled.
                setLobby(current => (current?.code === fresh.code ? fresh : current));
                return;
            }

            case 'game_started': {
                // How a guest finds out. The host already knows — `start` set it.
                setLobby(current => (
                    current === null ? current : { ...current, status: 'started', gameId: event.data.gameId }
                ));
                return;
            }

            case 'lobby_closed': {
                // The host shut the room. There is nothing left to hand back, and the
                // screen is expected to show the way out rather than a dead code.
                owed.current = null;
                setClosed(true);
                return;
            }

            default:
                // Everything else on this socket belongs to the board, which reads the
                // same room through `useMultiplayerGame`.
                return;
        }
    }, []);

    // The lobby only listens. The one thing a client sends -- live typing -- belongs
    // to the board, which is on this same room through `useMultiplayerGame`.
    const { status: connection, online } = useRoomSocket({
        room: openCode === undefined ? undefined : lolRoom(openCode),
        enabled: signedIn,
        onEvent
    });

    // The host clears this inside `start`, before it can be raced. This is the other
    // half: a guest finds out through the socket, and from that moment leaving the
    // board is leaving a game rather than walking out of a room.
    const waiting = lobby?.status === 'waiting';
    useEffect(() => {
        if (!waiting && lobby !== null) owed.current = null;
    }, [waiting, lobby]);

    const isHost = lobby !== null && isHostOf(lobby, userId);

    const updateSettings = useCallback((settings: LobbySettings) => {
        if (lobby === null || !isHost) return;

        const target = lobby.code;

        // On screen first. The host is turning a knob they are looking at, and a tile
        // that waits for a round trip before it moves reads as a tile that did not take.
        setLobby(current => (current?.code === target ? { ...current, settings } : current));
        setActionError(null);
        setSaving(true);
        writing.current = true;

        void (async () => {
            try {
                const saved = await updateLobbySettings(target, settings);
                if (!mounted.current) return;

                setLobby(current => (current?.code === target ? saved : current));
            } catch (failure) {
                if (!mounted.current) return;

                // The optimistic value stays put. Reverting it would move the control
                // back under the host's finger, and the line below already says the
                // room did not take the change.
                setActionError(lobbyErrorMessage(failure));
            } finally {
                writing.current = false;
                if (mounted.current) setSaving(false);
            }
        })();
    }, [lobby, isHost]);

    const start = useCallback(async (): Promise<Lobby | null> => {
        if (lobby === null || !isHost || starting) return null;

        setStarting(true);
        setActionError(null);
        writing.current = true;

        try {
            const started = await startLobby(lobby.code);

            // Before anything else: the caller navigates to the board the moment this
            // resolves, and this screen unmounting on the way there must not take the
            // room with it. The one exit that keeps the room alive.
            owed.current = null;

            if (mounted.current) setLobby(started);

            return started;
        } catch (failure) {
            if (mounted.current) setActionError(lobbyErrorMessage(failure));

            return null;
        } finally {
            writing.current = false;
            if (mounted.current) setStarting(false);
        }
    }, [lobby, isHost, starting]);

    const close = useCallback(async () => {
        const leaving = owed.current;
        if (leaving === null || closing) return;

        // Cleared up front, so the unmount that follows this on its way out of the
        // screen does not send the same request a second time.
        owed.current = null;
        setClosing(true);

        try {
            await (leaving.host ? deleteLobby(leaving.code) : leaveLobby(leaving.code));
        } catch {
            // Best effort, like `logout`. The player asked to leave and is leaving; a
            // room that failed to close is the server's problem to time out, and
            // holding someone on a screen they have finished with to say so is worse
            // than the stale room.
        } finally {
            if (mounted.current) setClosing(false);
        }
    }, [closing]);

    // The room is given back however the screen is left. Mounted once with no
    // dependencies on purpose: this has to run on unmount and at no other time, so
    // everything it needs is read off `owed` rather than closed over.
    useEffect(() => () => {
        const leaving = owed.current;
        if (leaving === null) return;

        owed.current = null;
        void (leaving.host ? deleteLobby(leaving.code) : leaveLobby(leaving.code));
    }, []);

    const reload = useCallback(() => {
        setError(null);
        setClosed(false);
        void load();
    }, [load]);

    return {
        lobby,
        loading: lobby === null && error === null,
        error,
        actionError,
        isHost,
        online,
        connection,
        closed,
        saving,
        updateSettings,
        starting,
        start,
        closing,
        close,
        reload
    };
}

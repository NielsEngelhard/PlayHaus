import {
    createPQLobby,
    deletePQLobby,
    isHostOfPQ,
    joinPQLobby,
    leavePQLobby,
    startPQLobby,
    updatePQLobbySetup,
    type PQLobby,
    type PQLobbySetup
} from '@/api/calls/pubquizr-lobby';
import { pqRoom, type PQServerEvent } from '@/api/pq-socket';
import type { SocketStatus } from '@/api/socket';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
import { pqLobbyErrorMessage } from '@/features/pubquizr/multi-device/pubquizr-lobby-errors';
import { hold, release, track } from '@/features/realtime/room-holds';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

// The multi device room, from opening it to being carried out of it into the evening it dealt.

export interface PQLobbyState {
    lobby: PQLobby | null
    /** True until the room has been opened or joined, one way or the other. */
    loading: boolean
    /** The room could not be opened or joined. There is nothing to show. */
    error: TranslationKey | null
    /** Something went wrong with a room that is still on screen — a save, a start. */
    actionError: TranslationKey | null
    /** This player owns the room: the quiz picker and the start button are theirs. */
    isHost: boolean
    /** Where this phone sits, or null while it is not in the room at all. */
    mySeat: number | null
    /** Who is connected right now, by user id. What the live dots are drawn from. */
    online: Set<string>
    /** Whether this device is live. Your own dot. */
    connection: SocketStatus
    /** The host closed the room while you were in it. The code no longer works. */
    closed: boolean
    /** A setup change is in the air. The start button waits it out. */
    saving: boolean

    starting: boolean
    /** Host only. Resolves to the started lobby, `sessionId` and all, or null if it could not start. */
    start: () => Promise<PQLobby | null>
    closing: boolean
    // Leave for good: the host's room is deleted, a guest's seat is given back.
    close: () => Promise<void>
    reload: () => void
    // Host only.
    updateSetup: (setup: Partial<PQLobbySetup>) => void
}

export function useQuizLobby(code?: string): PQLobbyState {
    const { user, status } = useAuth();
    const [lobby, setLobby] = useState<PQLobby | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [actionError, setActionError] = useState<TranslationKey | null>(null);
    const [closed, setClosed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [starting, setStarting] = useState(false);
    const [closing, setClosing] = useState(false);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // What leaving this screen has to undo, or null when there is nothing to give back.
    const owed = useRef<{ code: string, host: boolean } | null>(null);

    // The room this screen is counted into `holders` under, or null once it has let go.
    const held = useRef<string | null>(null);

    // Stops holding the room, and hands it back if this was the last screen in it.
    const letGo = useCallback((giveBack: { host: boolean } | null) => {
        const heldCode = held.current;
        if (heldCode === null) return;

        held.current = null;
        owed.current = null;

        // Somebody else on this device still has the room open — the screen that replaced this one.
        if (!release(heldCode)) return;
        if (giveBack === null) return;

        track(giveBack.host ? deletePQLobby(heldCode) : leavePQLobby(heldCode));
    }, []);

    /** A write is in the air; an event must not land an older room on top of it. */
    const writing = useRef(false);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    // The language a room opens in: the host's own, so a room starts where its host plays rather than always in Dutch.
    const locale = useRef(DEFAULT_LANGUAGE);
    useEffect(() => {
        locale.current = user?.locale ?? DEFAULT_LANGUAGE;
    }, [user]);

    const load = useCallback(async () => {
        if (!signedIn || userId === undefined) return;

        // A reload starts over, so whatever this screen was holding is dropped first.
        letGo(null);

        // Counted *before* the request, not after it, and this is the whole of the fix for the overlapping-screens race.
        if (code !== undefined) {
            held.current = code;
            hold(code);
        }

        try {
            const opened = code === undefined
                ? await createPQLobby(locale.current)
                : await joinPQLobby(code);

            if (held.current === null) {
                held.current = opened.code;
                hold(opened.code);
            }

            if (!mounted.current) {
                // The screen went while the room was being opened.
                letGo(opened.status === 'waiting' ? { host: isHostOfPQ(opened, userId) } : null);
                return;
            }

            // A room that has already started is an evening, not a room.
            owed.current = opened.status === 'waiting'
                ? { code: opened.code, host: isHostOfPQ(opened, userId) }
                : null;

            setError(null);
            setLobby(opened);
        } catch (failure) {
            // Never got in, so there is nothing to hand back — but the hold taken before the request still has to come off.
            letGo(null);

            if (!mounted.current) return;

            setError(pqLobbyErrorMessage(failure));
        }
    }, [signedIn, userId, code, letGo]);

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: opening the room on mount and storing the result is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, load]);

    /** The room the socket is on. Undefined until there is one to be on. */
    const openCode = lobby?.code;

    const onEvent = useCallback((event: PQServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state':
            case 'lobby': {
                // Not while a write of our own is settling.
                if (writing.current) return;

                const fresh = event.data.lobby;
                // Only if it is still the room on screen.
                setLobby(current => (current?.code === fresh.code ? fresh : current));
                return;
            }

            case 'game_started': {
                // How a guest finds out. The host already knows — `start` set it.
                setLobby(current => (
                    current === null ? current : { ...current, status: 'started', sessionId: event.data.sessionId }
                ));
                return;
            }

            case 'lobby_closed': {
                // The host shut the room.
                owed.current = null;
                setClosed(true);
                return;
            }

            default:
                // Everything else on this socket belongs to the evening, which reads the same room through `useQuizTable`.
                return;
        }
    }, []);

    // The room only listens.
    const { status: connection, online } = useRoomSocket<PQServerEvent>({
        room: openCode === undefined ? undefined : pqRoom(openCode),
        enabled: signedIn,
        onEvent
    });

    // The host clears this inside `start`, before it can be raced.
    const waiting = lobby?.status === 'waiting';
    useEffect(() => {
        if (!waiting && lobby !== null) owed.current = null;
    }, [waiting, lobby]);

    const isHost = lobby !== null && isHostOfPQ(lobby, userId);
    const mySeat = lobby?.players.find(player => player.userId === userId)?.seat ?? null;

    const start = useCallback(async (): Promise<PQLobby | null> => {
        if (lobby === null || !isHost || starting) return null;

        setStarting(true);
        setActionError(null);
        writing.current = true;

        try {
            // Nothing but the code: the quiz and the toggles are already the room's, saved as the host moved them.
            const started = await startPQLobby(lobby.code);

            // Before anything else: the caller navigates to the evening the moment this resolves.
            owed.current = null;

            if (mounted.current) setLobby(started);

            return started;
        } catch (failure) {
            if (mounted.current) setActionError(pqLobbyErrorMessage(failure));

            return null;
        } finally {
            writing.current = false;
            if (mounted.current) setStarting(false);
        }
    }, [lobby, isHost, starting]);

    // Moves part of the room's setup, and saves it.
    const updateSetup = useCallback(async (next: Partial<PQLobbySetup>) => {
        if (lobby === null) return;

        const lobbyCode = lobby.code;
        const previous = lobby.setup;

        setActionError(null);
        setSaving(true);
        writing.current = true;
        setLobby(current => (current === null ? null : { ...current, setup: { ...current.setup, ...next } }));

        try {
            const saved = await updatePQLobbySetup(lobbyCode, next);
            if (!mounted.current) return;

            // The server's answer rather than what was sent.
            setLobby(current => (current?.code === saved.code ? saved : current));
        } catch (failure) {
            if (!mounted.current) return;

            // Put the switch back.
            setLobby(current => (current === null ? null : { ...current, setup: previous }));
            setActionError(pqLobbyErrorMessage(failure));
        } finally {
            writing.current = false;
            if (mounted.current) setSaving(false);
        }
    }, [lobby]);

    const close = useCallback(async () => {
        const leaving = owed.current;
        if (leaving === null || closing) return;

        // Cleared up front, so the unmount that follows this on its way out of the screen does not send the same request a second time.
        owed.current = null;

        // Dropped rather than handed to `letGo`, because the request below goes out whatever the count says.
        if (held.current !== null) {
            release(held.current);
            held.current = null;
        }

        setClosing(true);

        try {
            await (leaving.host ? deletePQLobby(leaving.code) : leavePQLobby(leaving.code));
        } catch {
            // Best effort.
        } finally {
            if (mounted.current) setClosing(false);
        }
    }, [closing]);

    // The room is given back however the screen is left.
    useEffect(() => () => {
        const leaving = owed.current;
        letGo(leaving === null ? null : { host: leaving.host });
    }, [letGo]);

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
        mySeat,
        online,
        connection,
        closed,
        saving,
        starting,
        start,
        closing,
        close,
        reload,
        updateSetup
    };
}

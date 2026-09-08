import {
    createFFLobby,
    deleteFFLobby,
    isHostOfFF,
    joinFFLobby,
    leaveFFLobby,
    rematchFFLobby,
    startFFLobby,
    updateFFLobbySettings,
    type FFLobby,
    type FFLobbySettings
} from '@/api/calls/fake-filler-lobby';
import { ffRoom, type FFServerEvent } from '@/api/ff-socket';
import type { SocketStatus } from '@/api/socket';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import { useAuth } from '@/features/auth/useAuth';
import { ffLobbyErrorMessage } from '@/features/fake-filler/fake-filler-errors';
import type { TranslationKey } from '@/features/i18n/keys';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

// The Fake Filler room, from opening it to being carried out of it into the next one.

// How many screens on this device are sitting in each room, by join code.
const holders = new Map<string, number>();

function hold(code: string): void {
    holders.set(code, (holders.get(code) ?? 0) + 1);
}

// The give-backs still in the air.
const giveBacks = new Set<Promise<void>>();

function track(work: Promise<unknown>): void {
    // Swallowed rather than handled: a give-back is best-effort, and a room that failed to close is the server's to sweep.
    const settled = work.then(() => { }, () => { });

    giveBacks.add(settled);
    void settled.then(() => giveBacks.delete(settled));
}

// Waits for every Fake Filler room this device is in the middle of handing back.
export async function settleFFGiveBacks(): Promise<void> {
    // A loop rather than one `Promise.all`.
    while (giveBacks.size > 0) {
        await Promise.all([...giveBacks]);
    }
}

/** Lets go of one hold. True when it was the last, so the room is nobody's now. */
function release(code: string): boolean {
    const left = (holders.get(code) ?? 1) - 1;
    if (left > 0) {
        holders.set(code, left);
        return false;
    }

    holders.delete(code);
    return true;
}

export interface FFLobbyState {
    lobby: FFLobby | null
    /** True until the room has been opened or joined, one way or the other. */
    loading: boolean
    /** The room could not be opened or joined. There is nothing to show. */
    error: TranslationKey | null
    /** Something went wrong with a room that is still on screen — a save, a start. */
    actionError: TranslationKey | null
    /** This player owns the room: the settings and the start button are theirs. */
    isHost: boolean
    /** Who is connected right now, by user id. What the live dots are drawn from. */
    online: Set<string>
    /** Whether this device is live. Your own dot. */
    connection: SocketStatus
    /** The host closed the room while you were in it. The code no longer works. */
    closed: boolean
    /** A settings change is in the air. The start button waits it out. */
    saving: boolean

    starting: boolean
    /** Host only. Resolves to the started lobby, or null if it could not start. */
    start: () => Promise<FFLobby | null>
    closing: boolean
    // Leave for good: the host's room is deleted, a guest's seat is given back.
    close: () => Promise<void>
    // The room this table has moved on to, once the game is over and the host has opened another.
    rematchCode: string | null
    rematching: boolean
    /** Host only. Opens the next room on the same settings; everybody else is told. */
    rematch: () => Promise<void>
    reload: () => void
    // Host only.
    updateSettings: (settings: FFLobbySettings) => void
}

export function useLobby(code?: string): FFLobbyState {
    const { user, status } = useAuth();
    const [lobby, setLobby] = useState<FFLobby | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [actionError, setActionError] = useState<TranslationKey | null>(null);
    const [closed, setClosed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [starting, setStarting] = useState(false);
    const [closing, setClosing] = useState(false);
    const [rematching, setRematching] = useState(false);

    // Where the table has gone next, or null while this is still the only room.
    const [rematchCode, setRematchCode] = useState<string | null>(null);

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

        track(giveBack.host ? deleteFFLobby(heldCode) : leaveFFLobby(heldCode));
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
                ? await createFFLobby(locale.current)
                : await joinFFLobby(code);

            if (held.current === null) {
                held.current = opened.code;
                hold(opened.code);
            }

            if (!mounted.current) {
                // The screen went while the room was being opened.
                letGo(opened.status === 'waiting' ? { host: isHostOfFF(opened, userId) } : null);
                return;
            }

            // A room that has already started is a game, not a room.
            owed.current = opened.status === 'waiting'
                ? { code: opened.code, host: isHostOfFF(opened, userId) }
                : null;

            setError(null);
            setLobby(opened);
            setRematchCode(opened.rematchCode ?? null);
        } catch (failure) {
            // Never got in, so there is nothing to hand back — but the hold taken before the request still has to come off.
            letGo(null);

            if (!mounted.current) return;

            setError(ffLobbyErrorMessage(failure));
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

    const onEvent = useCallback((event: FFServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state':
            case 'lobby': {
                // Not while a write of our own is settling.
                if (writing.current) return;

                const fresh = event.data.lobby;
                // Only if it is still the room on screen.
                setLobby(current => (current?.code === fresh.code ? fresh : current));
                // Never cleared from here: a room only ever gains one of these.
                if (fresh.rematchCode !== undefined) setRematchCode(fresh.rematchCode);
                return;
            }

            case 'game_started': {
                // How a guest finds out. The host already knows — `start` set it.
                setLobby(current => (
                    current === null ? current : { ...current, status: 'started', gameId: event.data.gameId }
                ));
                return;
            }

            case 'rematch': {
                // The host opened the next room.
                setRematchCode(event.data.code);
                return;
            }

            case 'lobby_closed': {
                // The host shut the room.
                owed.current = null;
                setClosed(true);
                return;
            }

            default:
                // Everything else on this socket belongs to the board, which reads the same room through `useGame`.
                return;
        }
    }, []);

    // The room only listens.
    const { status: connection, online } = useRoomSocket<FFServerEvent>({
        room: openCode === undefined ? undefined : ffRoom(openCode),
        enabled: signedIn,
        onEvent
    });

    // The host clears this inside `start`, before it can be raced.
    const waiting = lobby?.status === 'waiting';
    useEffect(() => {
        if (!waiting && lobby !== null) owed.current = null;
    }, [waiting, lobby]);

    const isHost = lobby !== null && isHostOfFF(lobby, userId);

    const start = useCallback(async (): Promise<FFLobby | null> => {
        if (lobby === null || !isHost || starting) return null;

        setStarting(true);
        setActionError(null);
        writing.current = true;

        try {
            // Nothing but the code: the settings are already the room's, saved as the host moved them.
            const started = await startFFLobby(lobby.code);

            // Before anything else: the caller navigates to the board the moment this resolves.
            owed.current = null;

            if (mounted.current) setLobby(started);

            return started;
        } catch (failure) {
            if (mounted.current) setActionError(ffLobbyErrorMessage(failure));

            return null;
        } finally {
            writing.current = false;
            if (mounted.current) setStarting(false);
        }
    }, [lobby, isHost, starting]);

    // Opens the next room.
    const rematch = useCallback(async () => {
        if (lobby === null || !isHost || rematching) return;

        setRematching(true);
        setActionError(null);

        try {
            const next = await rematchFFLobby(lobby.code);
            if (!mounted.current) return;

            setRematchCode(next.code);
        } catch (failure) {
            if (mounted.current) setActionError(ffLobbyErrorMessage(failure));
        } finally {
            if (mounted.current) setRematching(false);
        }
    }, [lobby, isHost, rematching]);

    // Moves one of the room's settings, and saves it.
    const updateSettings = useCallback(async (next: FFLobbySettings) => {
        if (lobby === null) return;

        const lobbyCode = lobby.code;
        const previous = lobby.settings;

        setActionError(null);
        setSaving(true);
        writing.current = true;
        setLobby(current => (current === null ? null : { ...current, settings: next }));

        try {
            const saved = await updateFFLobbySettings(lobbyCode, next);
            if (!mounted.current) return;

            // The server's answer rather than what was sent.
            setLobby(current => (current?.code === saved.code ? saved : current));
        } catch (failure) {
            if (!mounted.current) return;

            // Put the switch back.
            setLobby(current => (current === null ? null : { ...current, settings: previous }));
            setActionError(ffLobbyErrorMessage(failure));
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
            await (leaving.host ? deleteFFLobby(leaving.code) : leaveFFLobby(leaving.code));
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
        setRematchCode(null);
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
        starting,
        start,
        closing,
        close,
        rematchCode,
        rematching,
        rematch,
        reload,
        updateSettings
    };
}

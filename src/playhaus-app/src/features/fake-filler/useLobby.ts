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

/**
 * The Fake Filler room, from opening it to being carried out of it into the next one.
 *
 * Deliberately a near-copy of `features/league-of-letters/useLobby.ts` rather than a
 * shared hook the two games pass an adapter to. The lobby halves of the two games are the
 * same idea, but this file is mostly not lobby logic — it is the bookkeeping that keeps a
 * *screen* and a *seat* from being confused for each other, and that bookkeeping is held
 * in module-scope state. Sharing it would mean one refactor away from two games' rooms
 * interfering with each other for the sake of saving a file.
 *
 * The three mechanisms below each fix a real bug and are copied intact.
 */

/**
 * How many screens on this device are sitting in each room, by join code.
 *
 * A room is handed back when the screen showing it goes — but "this screen went" and
 * "the player left" are not the same thing. A page torn down and built again while it is
 * opening a room (fast refresh does exactly this) leaves two screens overlapping: the
 * outgoing one's join is still in the air when the incoming one starts its own. Firing
 * the give-back per screen then hands back the seat the live screen is using — the host
 * watches the player arrive and vanish again.
 *
 * So the give-back is counted rather than fired per screen, and counted at module scope
 * because the two screens involved are, by definition, two instances of this hook.
 */
const holders = new Map<string, number>();

function hold(code: string): void {
    holders.set(code, (holders.get(code) ?? 0) + 1);
}

/**
 * The give-backs still in the air.
 *
 * Handing a room back happens on unmount, where nothing can be awaited — the screen is
 * already gone. That is fine for the room itself, but not for whoever asks the server
 * what this player still has open a moment later: the room screen does exactly that on
 * mount, so a host who left `/room` and came back would race their own delete and be
 * asked about the room they just closed.
 */
const giveBacks = new Set<Promise<void>>();

function track(work: Promise<unknown>): void {
    // Swallowed rather than handled: a give-back is best-effort, and a room that failed
    // to close is the server's to sweep. What matters here is only that it is over.
    const settled = work.then(() => { }, () => { });

    giveBacks.add(settled);
    void settled.then(() => giveBacks.delete(settled));
}

/**
 * Waits for every Fake Filler room this device is in the middle of handing back.
 *
 * Answers at once when there are none, which is the ordinary case — this only has
 * anything to wait for in the seconds after a room screen was left.
 */
export async function settleFFGiveBacks(): Promise<void> {
    // A loop rather than one `Promise.all`: a give-back can be fired while this is
    // already waiting, and finishing before it would be finishing early.
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
    /**
     * Leave for good: the host's room is deleted, a guest's seat is given back. Safe to
     * call once — afterwards the screen is expected to navigate away.
     */
    close: () => Promise<void>
    /**
     * The room this table has moved on to, once the game is over and the host has opened
     * another. The screen's cue to take everybody there — host and guest alike.
     */
    rematchCode: string | null
    rematching: boolean
    /** Host only. Opens the next room on the same settings; everybody else is told. */
    rematch: () => Promise<void>
    reload: () => void
    /**
     * Host only. Moves the room onto new settings and saves them, so everybody in it —
     * and the game that starts from it — sees the same ones.
     */
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

    /**
     * Where the table has gone next, or null while this is still the only room.
     *
     * Set from three places on purpose — the announcement, every lobby the room sends,
     * and the read that opens the screen — because missing it is being stranded on a
     * result while everybody else is in the next room.
     */
    const [rematchCode, setRematchCode] = useState<string | null>(null);

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

    /**
     * The room this screen is counted into `holders` under, or null once it has let go.
     * Every way out of this hook goes through `letGo` or `close`, exactly once.
     */
    const held = useRef<string | null>(null);

    /**
     * Stops holding the room, and hands it back if this was the last screen in it.
     *
     * `giveBack` is null for the cases where there is nothing to hand back: a join that
     * never landed, and a room that has since become a game.
     */
    const letGo = useCallback((giveBack: { host: boolean } | null) => {
        const heldCode = held.current;
        if (heldCode === null) return;

        held.current = null;
        owed.current = null;

        // Somebody else on this device still has the room open — the screen that
        // replaced this one. Handing it back now would take them out of it.
        if (!release(heldCode)) return;
        if (giveBack === null) return;

        track(giveBack.host ? deleteFFLobby(heldCode) : leaveFFLobby(heldCode));
    }, []);

    /** A write is in the air; an event must not land an older room on top of it. */
    const writing = useRef(false);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    /**
     * The language a room opens in: the host's own, so a room starts where its host
     * plays rather than always in Dutch. Only the opening value — the host is free to
     * change it in the settings card, and doing so does not touch their account.
     *
     * Held in a ref rather than closed over, so that changing your language on the
     * profile screen cannot change the identity of `load` and open a second room on top
     * of the one already on screen.
     */
    const locale = useRef(DEFAULT_LANGUAGE);
    useEffect(() => {
        locale.current = user?.locale ?? DEFAULT_LANGUAGE;
    }, [user]);

    const load = useCallback(async () => {
        if (!signedIn || userId === undefined) return;

        // A reload starts over, so whatever this screen was holding is dropped first.
        // Nothing is handed back on the way: it is about to be taken again.
        letGo(null);

        // Counted *before* the request, not after it, and this is the whole of the fix
        // for the overlapping-screens race: the screen replacing this one starts its own
        // join while this one's is still in the air, so a room counted only once the
        // server answers would look unheld at exactly the moment it matters.
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
                // The screen went while the room was being opened. Give it back — unless
                // the screen that replaced this one is sitting in the same room, which is
                // what `letGo` checks.
                letGo(opened.status === 'waiting' ? { host: isHostOfFF(opened, userId) } : null);
                return;
            }

            // A room that has already started is a game, not a room: there is nothing
            // left to hand back, and handing it back would delete a lobby out from under
            // the players still on the board.
            owed.current = opened.status === 'waiting'
                ? { code: opened.code, host: isHostOfFF(opened, userId) }
                : null;

            setError(null);
            setLobby(opened);
            setRematchCode(opened.rematchCode ?? null);
        } catch (failure) {
            // Never got in, so there is nothing to hand back — but the hold taken before
            // the request still has to come off.
            letGo(null);

            if (!mounted.current) return;

            setError(ffLobbyErrorMessage(failure));
        }
    }, [signedIn, userId, code, letGo]);

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: opening the room on mount and storing the result is the
        // whole job, and there is no query library here to hand it to. State is only
        // written after the request resolves, so nothing cascades in the render this
        // effect belongs to.
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
                // Not while a write of our own is settling: the optimistic value on
                // screen is newer than anything that was already in flight.
                if (writing.current) return;

                const fresh = event.data.lobby;
                // Only if it is still the room on screen. `close` and a re-join can both
                // land between a frame being sent and being handled.
                setLobby(current => (current?.code === fresh.code ? fresh : current));
                // Never cleared from here: a room only ever gains one of these, and a
                // frame that predates the announcement must not undo it.
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
                // The host opened the next room. Everybody still here follows, which the
                // screen does — this hook only knows where.
                setRematchCode(event.data.code);
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
                // same room through `useGame`.
                return;
        }
    }, []);

    // The room only listens. Fake Filler has nothing a client says over the socket at
    // all — no typing analogue — so unlike League of Letters neither this hook nor the
    // board ever sends.
    const { status: connection, online } = useRoomSocket<FFServerEvent>({
        room: openCode === undefined ? undefined : ffRoom(openCode),
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

    const isHost = lobby !== null && isHostOfFF(lobby, userId);

    const start = useCallback(async (): Promise<FFLobby | null> => {
        if (lobby === null || !isHost || starting) return null;

        setStarting(true);
        setActionError(null);
        writing.current = true;

        try {
            // Nothing but the code: the settings are already the room's, saved as the
            // host moved them, and the server starts on what it has stored.
            const started = await startFFLobby(lobby.code);

            // Before anything else: the caller navigates to the board the moment this
            // resolves, and this screen unmounting on the way there must not take the
            // room with it. The one exit that keeps the room alive.
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

    /**
     * Opens the next room. Host only, and only once the game behind this one is over.
     *
     * Answers nothing: what the caller needs is `rematchCode`, and that is set here as
     * well as by the announcement so the host does not have to wait for their own
     * broadcast to come back round.
     */
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

    /**
     * Moves one of the room's settings, and saves it.
     *
     * Optimistic, because these are switches and a switch that waits for a round trip
     * before it moves feels broken.
     *
     * `writing` is held for the same reason `start` holds it: the answer to this PATCH
     * is broadcast to the room, so a frame carrying the *old* settings can still be in
     * the air when the new ones go out, and landing it would put the switch back.
     */
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

            // The server's answer rather than what was sent: it normalises, and a room
            // showing something the server did not agree to is a room that will start on
            // something else.
            setLobby(current => (current?.code === saved.code ? saved : current));
        } catch (failure) {
            if (!mounted.current) return;

            // Put the switch back. A control that stays where it was moved to after the
            // save failed is a promise the room will not keep.
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

        // Cleared up front, so the unmount that follows this on its way out of the
        // screen does not send the same request a second time.
        owed.current = null;

        // Dropped rather than handed to `letGo`, because the request below goes out
        // whatever the count says: this is the player themselves asking to leave, not a
        // screen being tidied up after.
        if (held.current !== null) {
            release(held.current);
            held.current = null;
        }

        setClosing(true);

        try {
            await (leaving.host ? deleteFFLobby(leaving.code) : leaveFFLobby(leaving.code));
        } catch {
            // Best effort. The player asked to leave and is leaving; a room that failed
            // to close is the server's problem to sweep, and holding someone on a screen
            // they have finished with to say so is worse than the stale room.
        } finally {
            if (mounted.current) setClosing(false);
        }
    }, [closing]);

    // The room is given back however the screen is left. Mounted once, so everything it
    // needs is read off the refs rather than closed over — and it runs even with nothing
    // owed, because the hold this screen took still has to come off the count.
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

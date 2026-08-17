import {
    createLobby,
    deleteLobby,
    getLobby,
    isHostOf,
    joinLobby,
    leaveLobby,
    MAX_LOBBY_PLAYERS,
    setLobbyIdentity,
    startLobby,
    updateLobbySettings,
    type Lobby,
    type LobbySettings
} from '@/api/calls/league-of-letters-lobby';
import { useAuth } from '@/features/auth/useAuth';
import { lobbyErrorMessage } from '@/features/league-of-letters/game-errors';
import { DEFAULT_SOLO_SETTINGS } from '@/features/league-of-letters/solo-settings';
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
    /** Every seat is taken. Nobody else is getting in. */
    full: boolean
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
 * How often the room asks the server what changed.
 *
 * Solo deliberately does not poll — a game only moves because its one player moved it.
 * A lobby is the opposite: everything interesting about it (someone joining, the host
 * changing the word length, the game starting) happens on somebody else's phone, and
 * there is no socket here to be told over. A second is fast enough that a player
 * arriving feels immediate and slow enough to be nothing on a screen nobody stays on.
 *
 * TODO: drop to a socket when there is one. The room screen reads state off `lobby`
 * only, so what fills it in is this hook's business alone.
 */
const POLL_MS = 1000;

/**
 * Opens or joins one multiplayer room and keeps it up to date.
 *
 * Pass a `code` to join somebody else's room; pass nothing to open your own, which
 * makes you its host. Both end in the same place — a `Lobby` that polls itself — so the
 * two room screens differ only in what they are allowed to do to it.
 *
 * Leaving matters here in a way it does not on other screens: an abandoned room is a
 * code that still works and a game that will never start. So the room is given back on
 * unmount, whatever caused it — the confirm dialog, a tab in the bottom bar, the
 * browser's back button — and the one exit that must *not* give it back, starting the
 * game, says so explicitly.
 */
export function useLobby(code?: string): LobbyState {
    const { user, status } = useAuth();
    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
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

    /** A write is in the air; the poll must not land an older room on top of it. */
    const writing = useRef(false);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    /**
     * The name and swatch to go into the room under. Held in a ref rather than closed
     * over, so that renaming yourself in another tab cannot change the identity of
     * `load` and open a second room on top of the one already on screen.
     */
    const profile = useRef({ name: '', avatarColorId: '' });

    // Declared above the load effect, so it has already run by the time the room is
    // opened on mount.
    useEffect(() => {
        profile.current = { name: user?.name ?? '', avatarColorId: user?.color ?? '' };
    }, [user]);

    const load = useCallback(async () => {
        if (!signedIn || userId === undefined) return;

        // The real endpoints read the player off the bearer token. The mock has no
        // token to read, so it is told who is asking.
        setLobbyIdentity({ userId, ...profile.current });

        try {
            const opened = code === undefined
                ? await createLobby(DEFAULT_SOLO_SETTINGS)
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

    // Keyed on the two things the poll actually depends on rather than on `lobby`, which
    // is a new object every time the poll answers and would restart its own timer.
    const openCode = lobby?.code;
    const waiting = lobby?.status === 'waiting';

    useEffect(() => {
        if (openCode === undefined || !waiting) return;

        const tick = setInterval(() => {
            if (writing.current) return;

            void (async () => {
                try {
                    const fresh = await getLobby(openCode);
                    if (!mounted.current || writing.current) return;

                    // Only if it is still the room on screen: `close` and a re-join can
                    // both land between the request going out and coming back.
                    setLobby(current => (current?.code === openCode ? fresh : current));
                } catch {
                    // A poll that misses is not worth putting in front of anyone: the
                    // next one is a second away, and the room on screen is still the
                    // best answer there is. A room that is really gone shows up as the
                    // host closing it, which the screen finds out about by other means.
                }
            })();
        }, POLL_MS);

        return () => clearInterval(tick);
    }, [openCode, waiting]);

    // The host clears this inside `start`, before it can be raced. This is the other
    // half: a guest finds out through the poll, and from that moment leaving the board
    // is leaving a game rather than walking out of a room.
    useEffect(() => {
        if (!waiting && lobby !== null) owed.current = null;
    }, [waiting, lobby]);

    const isHost = lobby !== null && isHostOf(lobby, userId);
    const full = lobby !== null && lobby.players.length >= MAX_LOBBY_PLAYERS;

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
        void load();
    }, [load]);

    return {
        lobby,
        loading: lobby === null && error === null,
        error,
        actionError,
        isHost,
        full,
        saving,
        updateSettings,
        starting,
        start,
        closing,
        close,
        reload
    };
}

import { getReconnectableGames, type ReconnectableGame } from '@/api/calls/reconnect';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/useAuth';
import { kindOf } from '@/features/reconnect/game-kinds';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ReconnectableGames {
    /** Newest first, and only the ones this build can actually open. */
    games: ReconnectableGame[]
    /** The first load, with nothing on screen yet. */
    loading: boolean
    /** A reload over a list that is already up. */
    refreshing: boolean
    /** The load failed. There is no list to show, so the page offers the refresh. */
    error: string | null
    refresh: () => void
}

/** The reconnect page's copy is Dutch, so its failures are too. */
function reconnectErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 401) return 'Je sessie is verlopen. Log opnieuw in.';
        return 'Er ging iets mis bij het ophalen van je spellen. Probeer het opnieuw.';
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all —
    // in development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'Geen verbinding met de server. Check je verbinding en probeer opnieuw.';
}

/**
 * Sorted newest first, and stripped of anything this build has no screen for.
 *
 * The server lists every type it knows about, which is not the same set as the
 * types this app can draw a row for — see `GAME_KINDS`. Dropping those here
 * rather than at render time is what makes "the list is empty" one question
 * instead of two.
 */
function playable(games: ReconnectableGame[]): ReconnectableGame[] {
    return games
        .filter(game => kindOf(game) !== undefined)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Every game the signed-in player left running.
 *
 * Loaded whenever the page comes into focus, and otherwise only on request.
 * There is no polling: the list changes when this player starts or finishes a
 * game, and neither of those happens while they are looking at this page — the
 * refresh button covers the one case that can, a game left running on another
 * device.
 */
export function useReconnectableGames(): ReconnectableGames {
    const { status } = useAuth();
    const [games, setGames] = useState<ReconnectableGame[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Nothing may touch state after unmount, and `refresh` can fire again while an
    // earlier load is still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /**
     * Every state change happens after the `await`, never on the way in — the
     * effect below calls this during render's commit, and a `setState` before the
     * first suspension point would be a synchronous cascading render.
     */
    const load = useCallback(async () => {
        try {
            const fresh = await getReconnectableGames();
            if (!mounted.current) return;

            setError(null);
            setGames(playable(fresh));
        } catch (failure) {
            if (!mounted.current) return;

            // The list in hand is dropped rather than kept: a failed refresh means
            // we no longer know what is still running, and leaving stale rows up
            // under an error would offer games that may already be over.
            setGames(null);
            setError(reconnectErrorMessage(failure));
        } finally {
            if (mounted.current) setRefreshing(false);
        }
    }, []);

    // Only a signed-in session has games to list: the endpoint is behind auth, and
    // while signed out the auth gate is standing over this page anyway.
    const signedIn = status === 'signedIn';

    /**
     * On every focus, not just on mount.
     *
     * This is the one page whose list is invalidated by leaving it: the way you
     * use a row is to walk into the game it points at, and the way you come back
     * is with that game finished. A page that only loaded once would then be
     * offering a game that is over, and the button would drop the player into a
     * finished board.
     *
     * Nothing is cleared on the way in, so a reload over a list already on screen
     * swaps it rather than blanking it.
     */
    useFocusEffect(useCallback(() => {
        if (!signedIn) return;

        // Fetching and storing the result is the whole job, and there is no query
        // library here to hand it to. State is only written after the request
        // resolves, so nothing cascades in the render this belongs to.
        void load();
    }, [signedIn, load]));

    const refresh = useCallback(() => {
        if (!signedIn || refreshing) return;

        // Set before the request goes out, so the button says so for as long as it
        // is in the air. `load` puts it back down however it ends.
        setRefreshing(true);
        void load();
    }, [signedIn, refreshing, load]);

    return {
        games: games ?? [],
        // A session still being restored counts as loading, so the page does not
        // flash "niets gevonden" in the moment before the request can even go out.
        // A signed-out one does not: it is waiting on the gate, not on us.
        loading: status !== 'signedOut' && games === null && error === null,
        refreshing,
        error: signedIn ? error : null,
        refresh
    };
}

import { getReconnectableGames, type ReconnectableGame } from '@/api/calls/reconnect';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
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
    // The load failed.
    error: TranslationKey | null
    // When the list on screen came back, as an ISO timestamp, or `null` while there has never been one.
    loadedAt: string | null
    refresh: () => void
}

/** Which line a failed load deserves, as a catalogue key. */
function reconnectErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        if (error.status === 401) return 'reconnect.errors.expired';
        return 'reconnect.errors.generic';
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'reconnect.errors.network';
}

// Sorted newest first, and stripped of anything this build has no screen for.
function playable(games: ReconnectableGame[]): ReconnectableGame[] {
    return games
        .filter(game => kindOf(game) !== undefined)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Every game the signed-in player left running.
export function useReconnectableGames(): ReconnectableGames {
    const { status } = useAuth();
    const [games, setGames] = useState<ReconnectableGame[] | null>(null);
    const [loadedAt, setLoadedAt] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<TranslationKey | null>(null);

    // Nothing may touch state after unmount, and `refresh` can fire again while an earlier load is still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Every state change happens after the `await`, never on the way in.
    const load = useCallback(async () => {
        try {
            const fresh = await getReconnectableGames();
            if (!mounted.current) return;

            setError(null);
            setGames(playable(fresh));
            setLoadedAt(new Date().toISOString());
        } catch (failure) {
            if (!mounted.current) return;

            // The list in hand is dropped rather than kept.
            setGames(null);
            setLoadedAt(null);
            setError(reconnectErrorMessage(failure));
        } finally {
            if (mounted.current) setRefreshing(false);
        }
    }, []);

    // Only a signed-in session has games to list.
    const signedIn = status === 'signedIn';

    // On every focus, not just on mount.
    useFocusEffect(useCallback(() => {
        if (!signedIn) return;

        // Fetching and storing the result is the whole job, and there is no query library here to hand it to.
        void load();
    }, [signedIn, load]));

    const refresh = useCallback(() => {
        if (!signedIn || refreshing) return;

        // Set before the request goes out, so the button says so for as long as it is in the air.
        setRefreshing(true);
        void load();
    }, [signedIn, refreshing, load]);

    return {
        games: games ?? [],
        // A session still being restored counts as loading.
        loading: status !== 'signedOut' && games === null && error === null,
        refreshing,
        error: signedIn ? error : null,
        loadedAt,
        refresh
    };
}

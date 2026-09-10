import { getFriends, type Friend } from '@/api/calls/friends';
import { friendsErrorMessage } from '@/features/friends/friends-errors';
import type { TranslationKey } from '@/features/i18n/keys';
import { useCallback, useEffect, useState } from 'react';

export type FriendsStatus = 'loading' | 'ready' | 'failed';

export interface FriendsState {
    friends: Friend[]
    status: FriendsStatus
    /** The key of a line to show instead of the list. Null while it is fine. */
    error: TranslationKey | null
    refresh: () => void
}

// Everybody you have played with, which is the only way anybody gets on this list.
export function useFriends(): FriendsState {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [status, setStatus] = useState<FriendsStatus>('loading');
    const [error, setError] = useState<TranslationKey | null>(null);
    const [attempt, setAttempt] = useState(0);

    const refresh = useCallback(() => setAttempt(n => n + 1), []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const list = await getFriends();
                if (cancelled) return;

                setFriends(list);
                setError(null);
                setStatus('ready');
            } catch (err) {
                if (cancelled) return;

                setError(friendsErrorMessage(err));
                setStatus('failed');
            }
        })();

        return () => { cancelled = true };
    }, [attempt]);

    return { friends, status, error, refresh };
}

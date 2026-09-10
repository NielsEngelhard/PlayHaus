import { getInvites, markInvitesSeen, type FriendInvite } from '@/api/calls/friends';
import { useAuth } from '@/features/auth/useAuth';
import { useUserSocket } from '@/features/notifications/useUserSocket';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

interface FriendInvites {
    /** Everything waiting for you, newest first. */
    invites: FriendInvite[]
    /** Takes one off the list and tells the server it was shown. */
    dismiss: (id: string) => void
}

/** Whose list it is, alongside the list. Signing out is then a mismatch rather than something an effect has to clear. */
interface Loaded {
    userId: string
    list: FriendInvite[]
}

const NONE: FriendInvite[] = [];

const FriendInviteContext = createContext<FriendInvites | undefined>(undefined);

// Holds the invites waiting for you, for the whole app.
export function FriendInviteProvider({ children }: { children: ReactNode }) {
    const { status, user } = useAuth();

    const [loaded, setLoaded] = useState<Loaded>({ userId: '', list: NONE });

    // Counting rather than calling: the fetch lives in one effect, which is what keeps the setState out of an effect body.
    const [attempt, setAttempt] = useState(0);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    const refresh = useCallback(() => setAttempt(count => count + 1), []);

    // A socket frame carries the invite, but the row is the truth, so a frame only ever means "fetch now" — including the `sync` the server sends on connect.
    useUserSocket(refresh);

    useEffect(() => {
        if (!signedIn || userId === undefined) return;

        let cancelled = false;

        void (async () => {
            try {
                const list = await getInvites();

                if (!cancelled) setLoaded({ userId, list });
            } catch {
                // Nothing to show is the right answer to a fetch that failed; the next one will find them.
            }
        })();

        return () => { cancelled = true };
    }, [signedIn, userId, attempt]);

    // A phone that was asleep heard nothing, and the socket may not have noticed yet either.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') refresh();
        });

        return () => subscription.remove();
    }, [refresh]);

    const dismiss = useCallback((id: string) => {
        setLoaded(current => ({ ...current, list: current.list.filter(invite => invite.id !== id) }));

        // The row stays; it stops being pending. A failure here only means the banner comes back once.
        void markInvitesSeen([id]).catch(() => {
            // The next fetch offers it again, which is the right way to fail here.
        });
    }, []);

    // Somebody else's list can never be shown: it is only ever read back for the id it was fetched for.
    const invites = userId !== undefined && loaded.userId === userId ? loaded.list : NONE;

    const value = useMemo(() => ({ invites, dismiss }), [invites, dismiss]);

    return <FriendInviteContext.Provider value={value}>{children}</FriendInviteContext.Provider>;
}

// The invites waiting for you.
export function useFriendInvites(): FriendInvites {
    const context = useContext(FriendInviteContext);

    if (context === undefined) {
        throw new Error('useFriendInvites must be used inside a FriendInviteProvider');
    }

    return context;
}

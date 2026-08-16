import { me } from '@/api/calls/auth';
import { updateProfile, type Profile as UserProfile, type ProfileUpdate } from '@/api/calls/profile';
import { ApiError } from '@/api/client';
import { useAuth } from '@/features/auth/useAuth';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Profile {
    profile: UserProfile | null
    /** True until the first load settles, one way or the other. */
    loading: boolean
    /** The initial load failed. There is nothing to show, so the page offers a retry. */
    error: string | null
    /** A save failed and was rolled back. The page keeps working. */
    saveError: string | null
    reload: () => void
    save: (update: ProfileUpdate) => void
}

/** The profile page's copy is Dutch, so its failures are too. */
function profileErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 401) return 'Je sessie is verlopen. Log opnieuw in.';
        return error.message || 'Er ging iets mis. Probeer het opnieuw.';
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all —
    // in development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'Geen verbinding met de server. Check je verbinding en probeer opnieuw.';
}

/**
 * Loads the signed-in account's profile and saves edits back to it.
 *
 * Fetches fresh rather than reading the user off the session: the session's copy
 * is whatever `/me` returned at launch, which may be hours old and may have been
 * edited on another device since.
 *
 * Saves are optimistic. A colour swatch and a toggle have no confirm step, so
 * waiting for a round trip before moving them would make the controls feel
 * broken; the change lands immediately and is undone if the server refuses it.
 */
export function useProfile(): Profile {
    const { user, status } = useAuth();
    const [loaded, setLoaded] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Nothing may touch state after unmount, and `reload` can be fired again
    // while an earlier load is still in the air.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /**
     * Saves run one after another rather than in parallel. Two toggles flipped in
     * quick succession are two requests, and letting them race means the profile
     * ends up as whichever reply happened to land last.
     */
    const queue = useRef<Promise<unknown>>(Promise.resolve());

    /**
     * Every state change here happens after the `await`, never on the way in.
     * The effect below calls this during render's commit, and a `setState` before
     * the first suspension point would be a synchronous cascading render.
     */
    const load = useCallback(async () => {
        try {
            const fresh = await me();
            if (!mounted.current) return;

            setError(null);
            setLoaded(fresh);
        } catch (failure) {
            if (!mounted.current) return;

            setError(profileErrorMessage(failure));
        }
    }, []);

    /**
     * Only a signed-in session has a profile to fetch.
     *
     * Both other states report as loading rather than as an error. `restoring`
     * genuinely is still loading, and `signedOut` has the auth gate standing over
     * this page — fetching there would 401 and leave "your session expired"
     * sitting behind the popup, still there after you sign in.
     *
     * Keyed on the user's id as well as the session status, so signing out and
     * back in as somebody else re-reads rather than keeping the previous account.
     */
    const userId = user?.id ?? null;
    const signedIn = status === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        // set-state-in-effect: fetching on mount and storing the result is the
        // whole job, and there is no query library here to hand it to. The state
        // is only written after the request resolves, so nothing cascades in the
        // render this effect belongs to. `AuthProvider` restores the session the
        // same way.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [signedIn, userId, load]);

    /**
     * What was fetched is only this profile if it is this account's. Derived
     * rather than cleared from an effect: no session and a session whose profile
     * has not landed yet are both "nothing to show", and an effect that wrote
     * that would only be a second render saying so — which is also what would let
     * the previous account flash on screen after switching users.
     */
    const profile = signedIn && loaded?.id === userId ? loaded : null;

    // A failure from a session that has since ended is not this session's news.
    const visibleError = signedIn ? error : null;

    // Nothing to show and nothing has failed, so something is still on its way.
    const loading = profile === null && visibleError === null;

    const save = useCallback((update: ProfileUpdate) => {
        setSaveError(null);
        // Show the edit now. The request below either confirms it or takes it back.
        setLoaded(current => (current ? { ...current, ...update } : current));

        queue.current = queue.current.then(async () => {
            try {
                const saved = await updateProfile(update);
                if (!mounted.current) return;

                setLoaded(saved);
            } catch (failure) {
                if (!mounted.current) return;

                setSaveError(profileErrorMessage(failure));

                // Re-read instead of restoring a snapshot taken before the edit:
                // by now other saves may have succeeded, and rolling back to a
                // pre-edit copy would quietly undo those too.
                try {
                    const truth = await me();
                    if (mounted.current) setLoaded(truth);
                } catch {
                    // The server is unreachable rather than refusing the edit.
                    // Leaving the optimistic value on screen is the better of two
                    // bad options — it is what the next save will send anyway.
                }
            }
        });
    }, []);

    const reload = useCallback(() => {
        if (!signedIn) return;

        // Dropping the error here rather than inside `load` is what puts the
        // loading page back up, so a retry visibly does something. Safe from an
        // event handler, which is not what the effect rule is about.
        setError(null);
        void load();
    }, [signedIn, load]);

    return {
        profile,
        loading,
        error: visibleError,
        saveError: signedIn ? saveError : null,
        reload,
        save
    };
}

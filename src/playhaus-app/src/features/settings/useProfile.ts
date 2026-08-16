import type { User } from '@/api/calls/auth';
import { ApiError, request } from '@/api/client';
import { useAuth } from '@/features/auth/useAuth';
import { useCallback, useRef, useState } from 'react';

interface Profile {
    /** The signed-in account, or nothing while the session is being restored. */
    profile: User | null
    /** A save is in the air. Every control says so and stays put until it lands. */
    saving: boolean
    /** A save failed. Nothing was changed, and the page keeps working. */
    saveError: string | null
    updateUsername: (username: string) => void
    updateColor: (color: string) => void
    updateEnableSounds: (enabled: boolean) => void
    updateEnableMusic: (enabled: boolean) => void
    updateEnableVibration: (enabled: boolean) => void
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
 * Edits the signed-in account.
 *
 * There is no fetch here. `/me` already answers with the whole account —
 * name, colour, all three toggles — so the session's copy in `AuthProvider` is
 * the profile, and reading it a second time on this page would only be a way
 * for the two to disagree.
 *
 * Every field is its own endpoint, each answering `204` with an empty body.
 * That is what makes the write local: a reply means the server now holds
 * exactly what was sent, so `patchUser` puts it on screen without a re-read.
 *
 * Saves are confirmed rather than optimistic — a control moves once the server
 * has taken the value, not before. One round trip is short enough that the lag
 * is barely there, and it means nothing on this page is ever showing something
 * the account does not actually hold.
 */
export function useProfile(): Profile {
    const { user, patchUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    /**
     * One save at a time, across the whole page.
     *
     * `saving` is state because the controls grey out on it, but state does not
     * settle until the next render — two taps in the same tick would both read
     * `false` and both fire. The ref is what actually holds the door shut.
     */
    const inFlight = useRef(false);

    /**
     * `body` carries exactly the one field its endpoint names: the backend
     * decodes with `DisallowUnknownFields`, so an extra one is a 400 rather than
     * something quietly ignored.
     *
     * `patch` is what the account will hold once that lands — usually the same
     * value under the name `/me` gives it, which is not always the name the
     * endpoint takes (`username` in, `name` out).
     */
    const save = useCallback(async (path: string, body: object, patch: Partial<User>) => {
        if (inFlight.current) return;

        inFlight.current = true;
        setSaving(true);
        setSaveError(null);

        try {
            await request<null>(path, { method: 'PUT', body: JSON.stringify(body) });
            patchUser(patch);
        } catch (failure) {
            // Nothing moved on screen, so there is nothing to roll back — the
            // control is still showing the value the account still holds.
            setSaveError(profileErrorMessage(failure));
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    }, [patchUser]);

    /**
     * Trimmed, because that is what the backend stores and measures its length
     * against — so the trimmed name is what the account ends up holding, and
     * patching with the raw draft would leave the page a space out of step.
     */
    const updateUsername = useCallback((username: string) => {
        const name = username.trim();
        void save('/api/v1/user/username', { username: name }, { name });
    }, [save]);

    const updateColor = useCallback((color: string) => {
        void save('/api/v1/user/color', { color }, { color });
    }, [save]);

    const updateEnableSounds = useCallback((enableSounds: boolean) => {
        void save('/api/v1/user/enable-sounds', { enableSounds }, { enableSounds });
    }, [save]);

    const updateEnableMusic = useCallback((enableMusic: boolean) => {
        void save('/api/v1/user/enable-music', { enableMusic }, { enableMusic });
    }, [save]);

    const updateEnableVibration = useCallback((enableVibration: boolean) => {
        void save('/api/v1/user/enable-vibration', { enableVibration }, { enableVibration });
    }, [save]);

    return {
        profile: user,
        saving,
        saveError,
        updateUsername,
        updateColor,
        updateEnableSounds,
        updateEnableMusic,
        updateEnableVibration
    };
}

import type { User } from '@/api/calls/auth';
import { ApiError, request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
import { useCallback, useRef, useState } from 'react';

interface Profile {
    /** The signed-in account, or nothing while the session is being restored. */
    profile: User | null
    /** A save is in the air. Every control says so and stays put until it lands. */
    saving: boolean
    // A save failed.
    saveError: TranslationKey | null
    updateUsername: (username: string) => void
    updateColor: (color: string) => void
    updateLocale: (locale: LanguageCode) => void
    updateEnableSounds: (enabled: boolean) => void
    updateEnableMusic: (enabled: boolean) => void
    updateEnableVibration: (enabled: boolean) => void
}

// Which line a failed save deserves, as a catalogue key.
function profileErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        if (error.status === 401) return 'profile.errors.expired';
        return 'profile.errors.generic';
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'profile.errors.network';
}

// Edits the signed-in account.
export function useProfile(): Profile {
    const { user, patchUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<TranslationKey | null>(null);

    // One save at a time, across the whole page.
    const inFlight = useRef(false);

    // `body` carries exactly the one field its endpoint names.
    const save = useCallback(async (path: string, body: object, patch: Partial<User>) => {
        if (inFlight.current) return;

        inFlight.current = true;
        setSaving(true);
        setSaveError(null);

        try {
            await request<null>(path, { method: 'PUT', body: JSON.stringify(body) });
            patchUser(patch);
        } catch (failure) {
            // Nothing moved on screen, so there is nothing to roll back.
            setSaveError(profileErrorMessage(failure));
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    }, [patchUser]);

    // Trimmed, because that is what the backend stores and measures its length against.
    const updateUsername = useCallback((username: string) => {
        const name = username.trim();
        void save('/api/v1/user/username', { username: name }, { name });
    }, [save]);

    const updateColor = useCallback((color: string) => {
        void save('/api/v1/user/color', { color }, { color });
    }, [save]);

    // The flag in the header renders off the session's `locale`, so `patchUser` is what moves it.
    const updateLocale = useCallback((locale: LanguageCode) => {
        void save('/api/v1/user/locale', { locale }, { locale });
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
        updateLocale,
        updateEnableSounds,
        updateEnableMusic,
        updateEnableVibration
    };
}

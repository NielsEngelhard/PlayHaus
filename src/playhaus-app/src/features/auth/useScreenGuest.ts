import { useAuth } from "@/features/auth/useAuth";
import { deviceLanguage } from "@/features/i18n/device-language";
import { randomName } from "@/features/settings/profile";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ScreenGuest {
    /** The sign-in never landed. The screen says so rather than sitting on a spinner forever. */
    failed: boolean
    retry: () => void
    /** A session is being made. There is nothing to draw yet. */
    signing: boolean
}

// A television holds no seat and nobody types on it, so it signs itself in as a guest with a name nothing ever shows.
export function useScreenGuest(): ScreenGuest {
    const { continueAsGuest, status } = useAuth();

    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    // One sign-in per mount, whatever React does with the effect.
    const asked = useRef(false);

    const signedOut = status === 'signedOut';

    useEffect(() => {
        if (!signedOut || asked.current) return;

        asked.current = true;
        const locale = deviceLanguage() ?? 'en';

        // The sign-in this effect exists to make is the only thing that can fail here.
        void continueAsGuest(locale, randomName(locale)).catch(() => setFailed(true));
    }, [signedOut, continueAsGuest, attempt]);

    const retry = useCallback(() => {
        asked.current = false;
        setFailed(false);
        setAttempt(count => count + 1);
    }, []);

    return { failed, retry, signing: signedOut && !failed };
}

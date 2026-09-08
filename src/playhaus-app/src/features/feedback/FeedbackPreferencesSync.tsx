import { setFeedbackPreferences } from "@/features/feedback/preferences";
import { useAuth } from "@/features/auth/useAuth";
import { useEffect } from "react";

// Copies the account's sound and vibration switches into the module-scope mirror that `preferences.ts` hands to non-React callers.
export default function FeedbackPreferencesSync(): null {
    const { user } = useAuth();

    const sounds = user?.enableSounds;
    const vibration = user?.enableVibration;

    useEffect(() => {
        if (sounds === undefined || vibration === undefined) return;

        setFeedbackPreferences({ sounds, vibration });
    }, [sounds, vibration]);

    return null;
}

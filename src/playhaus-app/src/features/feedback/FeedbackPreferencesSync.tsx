import { setFeedbackPreferences } from "@/features/feedback/preferences";
import { useAuth } from "@/features/auth/useAuth";
import { useEffect } from "react";

/**
 * Copies the account's sound and vibration switches into the module-scope mirror that
 * `preferences.ts` hands to non-React callers. Renders nothing.
 *
 * A component rather than an effect inside `AuthProvider` on purpose: the auth feature is
 * the most load-bearing file in the app and has no business knowing that sound exists.
 * Mounted as a sibling of the page frame in the root layout, so it lives for as long as
 * the app does and there is no moment where somebody is signed in and the mirror is not
 * looking at them.
 *
 * Signing out leaves the last account's values in place, which is the right answer:
 * nothing plays behind the auth gate anyway, and the alternative — resetting to the
 * defaults — would have somebody who muted the app hear it again on the way out.
 */
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

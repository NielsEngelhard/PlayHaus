/**
 * The short buzzes the app answers a touch with.
 *
 * Split by platform because haptics are a phone idea and this app also ships to web —
 * same reasoning as `share.ts`/`share.web.ts`. The web half is a no-op: the Vibration API
 * is a blunt on/off rumble on the handful of browsers that have it, needs a permission
 * prompt on some of them, and there is no desktop hardware to feel it. See `haptics.web.ts`.
 *
 * Every call is gated on the account's own switch and swallows everything. `impactAsync`
 * rejects outright on hardware with no haptic engine — emulators, most iPads — and iOS
 * silently disables the Taptic engine in Low Power Mode, while the camera is open, and
 * during dictation. None of that is worth an error, and none of it is a bug to chase.
 */

import { vibrationEnabled } from "@/features/feedback/preferences";
import * as Haptics from "expo-haptics";

/**
 * What a buzz is for, rather than how strong it is — the mapping onto the platform's own
 * scale lives here so a call site never has to think about `ImpactFeedbackStyle`.
 *
 * - `tap`: a key going down. The lightest thing available, because it fires on every letter.
 * - `land`: something the app was waiting for arrived.
 * - `success` / `nearMiss`: how that thing turned out.
 */
export type HapticFeel = 'tap' | 'land' | 'success' | 'nearMiss';

export function haptic(feel: HapticFeel): void {
    if (!vibrationEnabled()) return;

    try {
        switch (feel) {
            case 'tap':
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                break;
            case 'land':
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                break;
            case 'success':
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
                break;
            case 'nearMiss':
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
                break;
        }
    } catch {
        // A platform that throws synchronously rather than rejecting. Either way a buzz
        // that did not happen must not take the keypress that asked for it down with it.
    }
}

// The short buzzes the app answers a touch with.

import { vibrationEnabled } from "@/features/feedback/preferences";
import * as Haptics from "expo-haptics";

// What a buzz is for, rather than how strong it is.
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
        // A platform that throws synchronously rather than rejecting.
    }
}

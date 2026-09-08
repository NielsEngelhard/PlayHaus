// The account's feedback switches, kept at module scope rather than in state.

// Both default to on, matching the backend's column defaults — a fresh account has all three toggles true.
let preferences = {
    sounds: true,
    vibration: true
};

/** Called by `FeedbackPreferencesSync` whenever the session's copy of the user changes. */
export function setFeedbackPreferences(next: { sounds: boolean, vibration: boolean }): void {
    preferences = next;
}

/** Whether the press sound may play. */
export function soundsEnabled(): boolean {
    return preferences.sounds;
}

/** Whether haptics may fire. */
export function vibrationEnabled(): boolean {
    return preferences.vibration;
}

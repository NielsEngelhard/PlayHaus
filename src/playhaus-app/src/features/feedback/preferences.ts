/**
 * The account's feedback switches, kept at module scope rather than in state.
 *
 * The same reasoning as `currentToken` in `useAuth.tsx`: the things that read these are
 * not components. A keypress sound is fired from a `Pressable`'s `onPressIn` deep inside
 * a shared wrapper, and a buzz from an `async` function in a data hook — neither has a
 * context to read, and threading one down to every button in the app to answer a yes/no
 * question would be a lot of plumbing for a garnish.
 *
 * `FeedbackPreferencesSync` is what fills these in, from the signed-in account.
 *
 * Two rules for readers:
 *
 * - **Never read one during render.** The React Compiler is on (`app.json`
 *   `experiments.reactCompiler`), so it is free to skip re-running a component body whose
 *   tracked inputs have not changed — a component that rendered off one of these could
 *   hold a stale answer indefinitely. Read them from handlers, effects, and callers
 *   outside React, where nothing is memoised.
 * - **Music is deliberately not here.** It is started and stopped by `Soundtrack`, which
 *   is a component with `user` already in hand, so a module copy would be a second source
 *   of truth that buys nothing.
 */

/**
 * Both default to on, matching the backend's column defaults — a fresh account has all
 * three toggles true. That matters for the gap before `/me` answers on a cold start:
 * defaulting to off would mean the first few presses of every launch were silent.
 */
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

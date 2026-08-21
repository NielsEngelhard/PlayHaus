import { setAudioModeAsync } from "expo-audio";

/**
 * The one audio mode the app runs in.
 *
 * There is only one — `setAudioModeAsync` is global, not per player — so the press sound
 * and the background music have to agree on it, and this is where they do. Two modules
 * each setting their own would mean whichever spoke last decided for both.
 *
 * `playsInSilentMode: false` is the important half. A cosmetic tick is exactly the sound
 * somebody who flipped the silent switch meant to silence, and the same goes for a music
 * loop under a word game: the switch is the fastest way to shut a game up on a train, and
 * a game that overrides it is the one people delete. The in-app toggles are there for
 * anyone who wants the sound and has the phone unmuted.
 *
 * `mixWithOthers` keeps the app off everybody else's audio — a keypress never interrupts
 * a podcast, at the cost of the music playing over one rather than pausing it. On iOS the
 * two settings are also the only legal quiet pair: the native side rejects
 * `playsInSilentMode: false` together with `duckOthers`.
 */
let applied = false;

/**
 * Put the audio session in place, once. Cheap to call on every sound — after the first it
 * is a boolean check.
 *
 * Fire and forget, and nothing it does may throw: a platform that will not take an audio
 * mode can very well still play a sound, so refusing to try would be giving up early.
 */
export function ensureAudioSession(): void {
    if (applied) return;
    applied = true;

    try {
        setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => { });
    } catch { }
}

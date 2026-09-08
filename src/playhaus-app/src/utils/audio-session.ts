import { setAudioModeAsync } from "expo-audio";

// The one audio mode the app runs in.
let applied = false;

// Put the audio session in place, once.
export function ensureAudioSession(): void {
    if (applied) return;
    applied = true;

    try {
        setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => { });
    } catch { }
}

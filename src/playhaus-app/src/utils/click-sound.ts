import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * The tick that plays under a finger, shared by every button and key in the app.
 *
 * One player for all of them rather than one each: the on-screen keyboard alone would
 * otherwise hold twenty-six copies of the same clip, and only one tick can ever be
 * audible at a time anyway. It is built on the first press rather than at import, so a
 * cold start never waits on the audio session, and it is deliberately never released —
 * it lives as long as the app does.
 */
let player: AudioPlayer | undefined;

/** Set once a device has refused us a player, so we stop asking on every keystroke. */
let unavailable = false;

function clickPlayer(): AudioPlayer | undefined {
    if (unavailable) return undefined;
    if (player) return player;

    try {
        // A cosmetic tick is exactly the sound someone who flipped the silent switch
        // meant to silence, so this one respects it. `mixWithOthers` keeps a keypress
        // from interrupting whatever they happen to be listening to.
        //
        // Separately caught: a platform that won't take an audio mode can still very
        // well play a sound, and refusing to try would be giving up early.
        setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => { });
    } catch { }

    try {
        player = createAudioPlayer(require('@/assets/sounds/click.wav'));
    } catch {
        unavailable = true;
    }

    return player;
}

/**
 * Play the click, if audio will have us. Sound is a garnish here — a device that can't
 * play it still gets a working keyboard, so nothing this does is allowed to throw.
 */
export function playClick(): void {
    const sound = clickPlayer();
    if (!sound) return;

    try {
        // Rewound rather than left to finish: fast typing has to be able to cut the
        // previous tick short, or every second keypress would land in silence.
        sound.seekTo(0).catch(() => { });
        sound.play();
    } catch {
        // One tick that failed to play is not worth silencing the next one over.
    }
}

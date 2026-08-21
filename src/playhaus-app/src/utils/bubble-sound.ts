import { soundsEnabled } from "@/features/feedback/preferences";
import { ensureAudioSession } from "@/utils/audio-session";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

/**
 * The bubble that pops under a finger, shared by every button and key in the app.
 *
 * One player for all of them rather than one each: the on-screen keyboard alone would
 * otherwise hold twenty-six copies of the same clip, and only one pop can ever be audible
 * at a time anyway. It is built on the first press rather than at import, so a cold start
 * never waits on the audio session — and so nothing constructs a player during the web
 * build's static pre-render, where there is no `Audio` to construct.
 *
 * Deliberately never released: it lives as long as the app does.
 */
let player: AudioPlayer | undefined;

/** Set once a device has refused us a player, so we stop asking on every keystroke. */
let unavailable = false;

function bubblePlayer(): AudioPlayer | undefined {
    if (unavailable) return undefined;
    if (player) return player;

    ensureAudioSession();

    try {
        player = createAudioPlayer(require('@/assets/sounds/bubble.wav'));
    } catch {
        unavailable = true;
    }

    return player;
}

/**
 * Play the pop, if the account asked for sound and audio will have us. Sound is a garnish
 * here — a device that can't play it still gets a working keyboard, so nothing this does
 * is allowed to throw.
 *
 * The switch is read here rather than at the call sites so there is exactly one place it
 * can be forgotten. One consequence worth knowing: with sound off no player is ever
 * built, so the first press after turning it back on pays for building one and may be
 * silent. That is one press, on a control somebody just deliberately turned on.
 */
export function playBubble(): void {
    if (!soundsEnabled()) return;

    const sound = bubblePlayer();
    if (!sound) return;

    try {
        // Rewound rather than left to finish: fast typing has to be able to cut the
        // previous pop short, or every second keypress would land in silence.
        sound.seekTo(0).catch(() => { });
        sound.play();
    } catch {
        // One pop that failed to play is not worth silencing the next one over.
    }
}

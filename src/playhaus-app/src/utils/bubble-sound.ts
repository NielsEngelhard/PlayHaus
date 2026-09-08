import { soundsEnabled } from "@/features/feedback/preferences";
import { ensureAudioSession } from "@/utils/audio-session";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

// The bubble that pops under a finger, shared by every button and key in the app.
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

// Play the pop, if the account asked for sound and audio will have us.
export function playBubble(): void {
    if (!soundsEnabled()) return;

    const sound = bubblePlayer();
    if (!sound) return;

    try {
        // Rewound rather than left to finish.
        sound.seekTo(0).catch(() => { });
        sound.play();
    } catch {
        // One pop that failed to play is not worth silencing the next one over.
    }
}

import { soundsEnabled } from "@/features/feedback/preferences";
import { ensureAudioSession } from "@/utils/audio-session";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

// The chime that says a shared board is waiting on you, specifically.
let player: AudioPlayer | undefined;

/** Set once a device has refused us a player, so we stop asking on every turn. */
let unavailable = false;

function yourTurnPlayer(): AudioPlayer | undefined {
    if (unavailable) return undefined;
    if (player) return player;

    ensureAudioSession();

    try {
        player = createAudioPlayer(require('@/assets/sounds/your-turn.wav'));
    } catch {
        unavailable = true;
    }

    return player;
}

// Play the chime, if the account asked for sound and audio will have us.
export function playYourTurn(): void {
    if (!soundsEnabled()) return;

    const sound = yourTurnPlayer();
    if (!sound) return;

    try {
        sound.seekTo(0).catch(() => { });
        sound.play();
    } catch {
        // One chime that failed to play is not worth silencing the next turn's.
    }
}

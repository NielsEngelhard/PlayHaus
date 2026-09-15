import { soundsEnabled } from "@/features/feedback/preferences";
import { ensureAudioSession } from "@/utils/audio-session";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

// A short sound that plays from the top on every call, if the account asked for sound and audio will have us.
export function createSoundEffect(source: number): () => void {
    let player: AudioPlayer | undefined;

    // Set once a device has refused us a player, so we stop asking on every call.
    let unavailable = false;

    return () => {
        if (!soundsEnabled() || unavailable) return;

        if (!player) {
            ensureAudioSession();

            try {
                player = createAudioPlayer(source);
            } catch {
                unavailable = true;

                return;
            }
        }

        try {
            // Rewound rather than left to finish.
            player.seekTo(0).catch(() => { });
            player.play();
        } catch {
            // One sound that failed to play is not worth silencing the next one over.
        }
    };
}

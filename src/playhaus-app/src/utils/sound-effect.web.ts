import { context, hold, loadBuffer, release } from "@/features/audio/web-audio";
import { soundsEnabled } from "@/features/feedback/preferences";

// Web Audio rather than expo-audio's `<audio>` element, which would pause whatever else the phone is playing.
export function createSoundEffect(source: number): () => void {
    return () => {
        // Checked before anything is built, so a muted account never touches the phone's audio.
        if (!soundsEnabled()) return;

        const graph = context();
        if (!graph) return;

        // Held before the decode so the resume lands inside the gesture that asked for the sound.
        hold();

        void loadBuffer(source).then(buffer => {
            if (!buffer) {
                release();

                return;
            }

            try {
                const node = graph.createBufferSource();
                node.buffer = buffer;
                node.connect(graph.destination);
                node.onended = () => {
                    node.disconnect();
                    release();
                };
                node.start();
            } catch {
                release();
            }
        });
    };
}

import { pickTrack, SOURCES, type MusicScene, type TrackId } from "@/features/audio/music-tracks";
import { ensureAudioSession } from "@/utils/audio-session";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

/**
 * The background loops, and the machinery for having exactly one of them going.
 *
 * Split by platform — see `music-player.web.ts`, which answers the same contract with the
 * browser's own audio stack for reasons set out there.
 *
 * State lives at module scope rather than in the provider that drives it, for the same reason
 * `bubble-sound.ts` does: it keeps every player out of the static pre-render, and it means Fast
 * Refresh reloading the provider does not leave a loop orphaned with nothing holding a handle
 * to it.
 */

/**
 * Quiet. This is music nobody chose to put on, playing under a game they came for, and on iOS it
 * plays *on top of* whatever they were already listening to rather than pausing it (see the
 * `mixWithOthers` note in `audio-session.ts`). Every loop is mastered to −18.8 LUFS, so one
 * number suits all of them.
 */
const VOLUME = 0.2;

const players = new Map<TrackId, AudioPlayer>();

/** Which scene is meant to be playing, or nothing. */
let currentScene: MusicScene | null = null;
/** The track `currentScene` picked. Kept so it can be paused without picking again. */
let currentTrack: TrackId | null = null;

/** Set once a device has refused us a player, so we stop asking on every navigation. */
let unavailable = false;

function trackPlayer(track: TrackId): AudioPlayer | undefined {
    if (unavailable) return undefined;

    const existing = players.get(track);
    if (existing) return existing;

    ensureAudioSession();

    try {
        const player = createAudioPlayer(SOURCES[track]);

        player.loop = true;
        player.volume = VOLUME;

        players.set(track, player);

        return player;
    } catch {
        unavailable = true;

        return undefined;
    }
}

/**
 * Play something suitable for `scene`, and make sure it is the only thing going.
 *
 * Idempotent *per scene*, which is the point: the provider calls this from an effect, and
 * guarding on the scene rather than the track means a re-render cannot reshuffle the music
 * under someone who has not gone anywhere.
 *
 * A player per track rather than one player whose source is swapped. `AudioPlayer.replace` tears
 * the underlying player down and builds a new one at the platform's defaults, so the loop comes
 * back as a one-shot at full volume. Eight streamed AAC loops cost next to nothing, and only the
 * ones actually picked are ever built.
 */
export function playScene(scene: MusicScene): void {
    if (currentScene === scene) return;

    stopMusic();

    const track = pickTrack(scene);

    const player = trackPlayer(track);
    if (!player) return;

    currentScene = scene;
    currentTrack = track;

    try {
        // From the top. Music is scoped to lobbies and games now, so every claim is somebody
        // arriving somewhere — there is no journey to resume, and starting a fresh pick
        // partway through it would be a strange way to greet them.
        player.seekTo(0);
        player.play();
    } catch {
        // Nothing above this cares. The screen works without a soundtrack.
    }
}

/** Silence. */
export function stopMusic(): void {
    if (currentTrack !== null) {
        try {
            players.get(currentTrack)?.pause();
        } catch { }
    }

    currentScene = null;
    currentTrack = null;
}

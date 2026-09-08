import { FADE_MS, rampVolume, type Fade } from "@/features/audio/fade";
import { loopsForever, pickTrack, SOURCES, type MusicScene, type TrackId } from "@/features/audio/music-tracks";
import { ensureAudioSession } from "@/utils/audio-session";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

// The background loops, and the machinery for having exactly one of them going.

// Quiet.
const VOLUME = 0.2;

const players = new Map<TrackId, AudioPlayer>();

// Where each player's volume currently is.
const levels = new Map<TrackId, number>();

/** Ramps in flight, so starting one on a track cancels the one it replaces. */
const fades = new Map<TrackId, Fade>();

// Which players are actually rolling.
const running = new Set<TrackId>();

// The scene and track a fade out is still working through.
let retired: { scene: MusicScene, track: TrackId } | null = null;

/** Which scene is meant to be playing, or nothing. */
let currentScene: MusicScene | null = null;
/** The track `currentScene` picked. Kept so it can be faded out without picking again. */
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

        player.loop = loopsForever(track);
        // Silent until something fades it in.
        player.volume = 0;

        players.set(track, player);
        levels.set(track, 0);

        // A track that does not loop natively hands its ending to `rotate` instead of going quiet.
        if (!player.loop) {
            player.addListener('playbackStatusUpdate', status => {
                if (status.didJustFinish) rotate(track);
            });
        }

        return player;
    } catch {
        unavailable = true;

        return undefined;
    }
}

function setLevel(track: TrackId, volume: number): void {
    levels.set(track, volume);

    try {
        const player = players.get(track);
        if (player) player.volume = volume;
    } catch {
        // A player that will not take a volume is still a player. Nothing above this cares.
    }
}

// Ramp `track` to `to`, from wherever it is now, cancelling whatever ramp it was on.
function fadeTo(track: TrackId, to: number, onDone?: () => void): void {
    fades.get(track)?.cancel();

    if (!players.has(track)) return;

    const handle = rampVolume(
        volume => setLevel(track, volume),
        levels.get(track) ?? 0,
        to,
        FADE_MS,
        () => {
            fades.delete(track);
            onDone?.();
        }
    );

    fades.set(track, handle);
}

function pause(track: TrackId): void {
    running.delete(track);

    try {
        players.get(track)?.pause();
    } catch { }
}

/** Bring `track` up to level, starting it first if it is not already going. */
function start(track: TrackId): void {
    const player = players.get(track);
    if (!player) return;

    // Anything already rolling is a track being reclaimed mid-fade.
    if (!running.has(track)) {
        try {
            // From the top.
            player.seekTo(0);
            setLevel(track, 0);
            player.play();
        } catch {
            // Nothing above this cares. The screen works without a soundtrack.
            return;
        }

        running.add(track);
    }

    fadeTo(track, VOLUME);
}

/** Take `track` down to silence and stop it once it gets there. */
function retire(track: TrackId): void {
    fadeTo(track, 0, () => {
        pause(track);

        // Gone for good now, so there is nothing left to pick back up.
        if (retired?.track === track) retired = null;
    });
}

// A track finishing on its own is a cue, not a stop.
function rotate(track: TrackId): void {
    if (currentScene === null || currentTrack !== track) return;

    const scene = currentScene;
    const next = pickTrack(scene);

    const player = trackPlayer(next);
    if (!player) {
        // No fresh pick to hand over to.
        currentScene = null;
        currentTrack = null;
        retire(track);

        return;
    }

    currentTrack = next;

    // The old track is already silent — it just finished — so this is a fade in rather than a crossfade.
    retire(track);
    start(next);
}

// Play something suitable for `scene`, and make sure it is the only thing going.
export function playScene(scene: MusicScene): void {
    if (currentScene === scene) return;

    const previous = currentTrack;

    // Still audible from a stop this scene has not finished leaving — so it is resumed rather than replaced.
    const resumable = retired !== null && retired.scene === scene && running.has(retired.track)
        ? retired.track
        : null;

    retired = null;

    const track = resumable ?? pickTrack(scene);

    const player = trackPlayer(track);
    if (!player) {
        // No new loop to hand over to, so this is a stop rather than a swap.
        stopMusic();

        return;
    }

    currentScene = scene;
    currentTrack = track;

    // Both ramps run at once and cross in the middle.
    if (previous !== null && previous !== track) retire(previous);

    start(track);
}

/** Silence, arrived at rather than dropped into. */
export function stopMusic(): void {
    const scene = currentScene;
    const track = currentTrack;

    currentScene = null;
    currentTrack = null;

    if (track === null) return;

    retired = scene === null ? null : { scene, track };

    retire(track);
}

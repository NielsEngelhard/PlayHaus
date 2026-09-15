import { FADE_MS, rampVolume, type Fade } from "@/features/audio/fade";
import { loopsForever, pickTrack, SOURCES, type MusicScene, type TrackId } from "@/features/audio/music-tracks";
import { context, forgetBuffer, hold, loadBuffer, release } from "@/features/audio/web-audio";

// Web half of the background music — see `music-player.ts` for the contract and for why these are split at all.

/** Matches `music-player.ts`. Every loop is mastered to −18.8 LUFS, so one number covers all. */
const VOLUME = 0.2;

/** One loop: a gain that outlives the one-shot sources played through it. */
type Voice = {
    gain: GainNode,
    source: AudioBufferSourceNode | null,
    /** Bumped by every start and stop, so a file that finishes decoding after a stop knows it is stale. */
    token: number
};

const voices = new Map<TrackId, Voice>();

/** Where each voice's level currently is — see the note on `levels` in `music-player.ts`. */
const levels = new Map<TrackId, number>();

/** Ramps in flight, so starting one on a track cancels the one it replaces. */
const fades = new Map<TrackId, Fade>();

/** Which tracks are rolling or decoding on their way to it. See `music-player.ts`, whose `running` this mirrors. */
const running = new Set<TrackId>();

// The scene and track a fade out is still working through.
let retired: { scene: MusicScene, track: TrackId } | null = null;

let currentScene: MusicScene | null = null;
let currentTrack: TrackId | null = null;

function trackVoice(track: TrackId): Voice | undefined {
    const existing = voices.get(track);
    if (existing) return existing;

    const graph = context();
    if (!graph) return undefined;

    try {
        const gain = graph.createGain();
        // Silent until something fades it in.
        gain.gain.value = 0;
        gain.connect(graph.destination);

        const voice: Voice = { gain, source: null, token: 0 };

        voices.set(track, voice);
        levels.set(track, 0);

        return voice;
    } catch {
        return undefined;
    }
}

function setLevel(track: TrackId, volume: number): void {
    levels.set(track, volume);

    const voice = voices.get(track);
    if (!voice) return;

    try {
        // Written straight onto the param rather than scheduled with `linearRampToValueAtTime`.
        voice.gain.gain.value = volume;
    } catch { }
}

/** Ramp `track` to `to` from wherever it is now. See `fadeTo` in `music-player.ts`. */
function fadeTo(track: TrackId, to: number, onDone?: () => void): void {
    fades.get(track)?.cancel();

    if (!voices.has(track)) return;

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

function stop(track: TrackId): void {
    const wasRunning = running.delete(track);

    const voice = voices.get(track);
    if (voice) {
        voice.token++;

        const source = voice.source;
        voice.source = null;

        if (source) {
            // Cleared first, or stopping a track that does not loop would read as it finishing and rotate.
            source.onended = null;

            try {
                source.stop();
                source.disconnect();
            } catch { }
        }
    }

    if (wasRunning) release();

    // A decoded loop is tens of megabytes, so only the one meant to be playing stays in memory.
    if (track !== currentTrack) forgetBuffer(SOURCES[track]);
}

/** Bring `track` up to level, starting it first if it is not already going. */
function start(track: TrackId): void {
    const voice = voices.get(track);
    if (!voice) return;

    // Anything already rolling is a track being reclaimed mid-fade — see the same guard in `music-player.ts`.
    if (running.has(track)) {
        fadeTo(track, VOLUME);

        return;
    }

    running.add(track);
    hold();
    setLevel(track, 0);

    const token = ++voice.token;

    void loadBuffer(SOURCES[track]).then(buffer => {
        if (voice.token !== token) return;

        const graph = context();
        if (!buffer || !graph) {
            stop(track);

            return;
        }

        try {
            const source = graph.createBufferSource();
            source.buffer = buffer;
            source.loop = loopsForever(track);

            // A track that does not loop natively hands its ending to `rotate` instead of going quiet.
            if (!source.loop) source.onended = () => rotate(track);

            source.connect(voice.gain);
            source.start();
            voice.source = source;
        } catch {
            stop(track);

            return;
        }

        // Faded from when it becomes audible rather than from the request, which a decode can trail by a second.
        if (currentTrack === track) fadeTo(track, VOLUME);
    });
}

/** Take `track` down to silence and stop it once it gets there. */
function retire(track: TrackId): void {
    fadeTo(track, 0, () => {
        stop(track);

        // Gone for good now, so there is nothing left to pick back up.
        if (retired?.track === track) retired = null;
    });
}

// A track finishing on its own is a cue, not a stop.
function rotate(track: TrackId): void {
    if (currentScene === null || currentTrack !== track) return;

    const scene = currentScene;
    const next = pickTrack(scene);

    const voice = trackVoice(next);
    if (!voice) {
        // No fresh pick to hand over to.
        currentScene = null;
        currentTrack = null;
        retire(track);

        return;
    }

    currentTrack = next;

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

    const voice = trackVoice(track);
    if (!voice) {
        // No new loop to hand over to, so this is a stop rather than a swap.
        stopMusic();

        return;
    }

    currentScene = scene;
    currentTrack = track;

    // Both ramps run at once and cross in the middle — see the equal-power note in `fade.ts`.
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

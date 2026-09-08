import { FADE_MS, rampVolume, type Fade } from "@/features/audio/fade";
import { loopsForever, pickTrack, SOURCES, type MusicScene, type TrackId } from "@/features/audio/music-tracks";
import { Asset } from "expo-asset";

// Web half of the background music — see `music-player.ts` for the contract and for why these are split at all.

/** Matches `music-player.ts`. Every loop is mastered to −18.8 LUFS, so one number covers all. */
const VOLUME = 0.2;

/** One loop, and whichever knob this browser gave us for its level. */
type Voice = {
    element: HTMLAudioElement,
    /** `null` where the browser has no Web Audio, in which case the level is the element's own. */
    gain: GainNode | null
};

const voices = new Map<TrackId, Voice>();

/** Where each voice's level currently is — see the note on `levels` in `music-player.ts`. */
const levels = new Map<TrackId, number>();

/** Ramps in flight, so starting one on a track cancels the one it replaces. */
const fades = new Map<TrackId, Fade>();

/** Which elements are actually rolling. See `music-player.ts`, whose `running` this mirrors. */
const running = new Set<TrackId>();

// The scene and track a fade out is still working through.
let retired: { scene: MusicScene, track: TrackId } | null = null;

let currentScene: MusicScene | null = null;
let currentTrack: TrackId | null = null;

/** Set once the browser has refused us audio, so we stop asking on every navigation. */
let unavailable = false;

// The shared `AudioContext`, or `null` if this browser has no Web Audio.
let context: AudioContext | null = null;
let contextBuilt = false;

function browser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function audioContext(): AudioContext | null {
    if (contextBuilt) return context;
    contextBuilt = true;

    try {
        const Ctor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;

        context = new Ctor();
    } catch {
        context = null;
    }

    return context;
}

function trackVoice(track: TrackId): Voice | undefined {
    if (unavailable) return undefined;

    const existing = voices.get(track);
    if (existing) return existing;

    try {
        // `require` of an `.m4a` is an asset reference, not a URL, on every platform.
        const element = new Audio(Asset.fromModule(SOURCES[track]).uri);

        element.loop = loopsForever(track);
        element.preload = 'auto';

        // A track that does not loop natively hands its ending to `rotate` instead of going quiet.
        if (!element.loop) element.addEventListener('ended', () => rotate(track));

        let gain: GainNode | null = null;

        const ctx = audioContext();
        if (ctx) {
            gain = ctx.createGain();
            // Silent until something fades it in.
            gain.gain.value = 0;
            gain.connect(ctx.destination);

            // Routed through the graph, the element's own volume is upstream of the gain and would attenuate twice.
            element.volume = 1;
            ctx.createMediaElementSource(element).connect(gain);
        } else {
            element.volume = 0;
        }

        const voice = { element, gain };

        voices.set(track, voice);
        levels.set(track, 0);

        return voice;
    } catch {
        unavailable = true;

        return undefined;
    }
}

function setLevel(track: TrackId, volume: number): void {
    levels.set(track, volume);

    const voice = voices.get(track);
    if (!voice) return;

    try {
        // Written straight onto the param rather than scheduled with `linearRampToValueAtTime`.
        if (voice.gain) voice.gain.gain.value = volume;
        else voice.element.volume = volume;
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
    running.delete(track);

    try {
        voices.get(track)?.element.pause();
    } catch { }
}

/** Bring `track` up to level, starting it first if it is not already going. */
function start(track: TrackId): void {
    const voice = voices.get(track);
    if (!voice) return;

    // Anything already rolling is a track being reclaimed mid-fade — see the same guard in `music-player.ts`.
    if (!running.has(track)) {
        try {
            // Suspended until a gesture, and getting here took several. Harmless when running.
            void audioContext()?.resume().catch(() => { });

            voice.element.currentTime = 0;
            setLevel(track, 0);
            // Unlike the native player this hands back a promise.
            void voice.element.play().catch(() => { });
        } catch {
            return;
        }

        running.add(track);
    }

    fadeTo(track, VOLUME);
}

/** Take `track` down to silence and stop it once it gets there. */
function retire(track: TrackId): void {
    fadeTo(track, 0, () => {
        stop(track);

        // Gone for good now, so there is nothing left to pick back up.
        if (retired?.track === track) retired = null;
    });
}

// A tab that is not being looked at should not be playing a game's music.
let watching = false;

function watchVisibility(): void {
    if (watching) return;
    watching = true;

    document.addEventListener('visibilitychange', () => {
        for (const track of running) {
            const voice = voices.get(track);
            if (!voice) continue;

            try {
                if (document.hidden) voice.element.pause();
                else void voice.element.play().catch(() => { });
            } catch { }
        }
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
    if (!browser()) return;
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

    watchVisibility();

    // Both ramps run at once and cross in the middle — see the equal-power note in `fade.ts`.
    if (previous !== null && previous !== track) retire(previous);

    start(track);
}

/** Silence, arrived at rather than dropped into. */
export function stopMusic(): void {
    if (!browser()) return;

    const scene = currentScene;
    const track = currentTrack;

    currentScene = null;
    currentTrack = null;

    if (track === null) return;

    retired = scene === null ? null : { scene, track };

    retire(track);
}

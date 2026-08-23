import { FADE_MS, rampVolume, type Fade } from "@/features/audio/fade";
import { pickTrack, SOURCES, type MusicScene, type TrackId } from "@/features/audio/music-tracks";
import { Asset } from "expo-asset";

/**
 * Web half of the background music — see `music-player.ts` for the contract and for why these
 * are split at all.
 *
 * This used to be a pair of no-ops, on four grounds. Three of them stopped applying when music
 * was scoped to lobbies and games, and the fourth has a fix:
 *
 * - **Autoplay.** The objection was a loop starting because a page mounted, with no gesture
 *   behind it. Nothing starts on load any more: the only things that ask for music are a lobby
 *   and a board, and neither can be reached without tapping through to it. By the time
 *   `playScene` is called the browser has long since had its gesture.
 * - **Volume.** Apple ignores `HTMLMediaElement.volume`, so a track meant for 20% would play at
 *   full on iOS Safari — the one failure mode worse than no music at all. Routing through a
 *   `GainNode` instead is respected there. Where Web Audio is unavailable we fall back to
 *   `volume`, which is wrong only on the platform that was going to be wrong anyway.
 * - **Pre-render.** The web build is exported statically, which runs this module in Node. So
 *   nothing here touches `Audio`, `window` or `document` at import — every browser API sits
 *   behind `browser()` and is reached only once something asks for a scene.
 * - **Nothing to pause it.** A native app's players are stopped for it when it backgrounds; a
 *   tab's are not. `watchVisibility` is that missing half.
 *
 * A gain node **per track** rather than one shared one, which is what a crossfade needs: during
 * a handover two loops are audible at once at different levels, and a single output stage can
 * only hold one level for both.
 */

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

/**
 * The scene and track a fade out is still working through.
 *
 * Kept so that reclaiming the same scene before the fade lands picks that loop back up instead
 * of a different one — which is what muting and unmuting inside a game is, and getting a new
 * song out of a button labelled "unmute" is not what anybody pressed it for.
 */
let retired: { scene: MusicScene, track: TrackId } | null = null;

let currentScene: MusicScene | null = null;
let currentTrack: TrackId | null = null;

/** Set once the browser has refused us audio, so we stop asking on every navigation. */
let unavailable = false;

/**
 * The shared `AudioContext`, or `null` if this browser has no Web Audio. Built once, lazily —
 * constructing one before a gesture gets it a suspended context on some browsers and a console
 * warning on the rest.
 */
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
        // `require` of an `.m4a` is an asset reference, not a URL, on every platform. This is
        // the one thing that turns it into something `Audio` can be pointed at.
        const element = new Audio(Asset.fromModule(SOURCES[track]).uri);

        element.loop = true;
        element.preload = 'auto';

        let gain: GainNode | null = null;

        const ctx = audioContext();
        if (ctx) {
            gain = ctx.createGain();
            // Silent until something fades it in.
            gain.gain.value = 0;
            gain.connect(ctx.destination);

            // Routed through the graph, the element's own volume is upstream of the gain and
            // would attenuate twice. The gain is the only thing holding the level.
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
        // Written straight onto the param rather than scheduled with `linearRampToValueAtTime`:
        // the ramp is already being walked by `fade.ts`, so both halves of the app move on the
        // same curve, and there is no scheduled automation left for a cancelled fade to fight.
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

    // Anything already rolling is a track being reclaimed mid-fade — see the same guard in
    // `music-player.ts`. It comes back up from where it got to rather than restarting.
    if (!running.has(track)) {
        try {
            // Suspended until a gesture, and getting here took several. Harmless when running.
            void audioContext()?.resume().catch(() => { });

            voice.element.currentTime = 0;
            setLevel(track, 0);
            // Unlike the native player this hands back a promise, and a rejected one is an
            // unhandled rejection in the console rather than a thrown error. Swallowed here for
            // the same reason everything else is: the screen works without a soundtrack.
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

/**
 * A tab that is not being looked at should not be playing a game's music. Registered on the
 * first `playScene` rather than at import, because `document` does not exist during the static
 * pre-render.
 *
 * Every rolling element, not just the claimed one: mid-handover there are two, and the one on
 * its way out is exactly as audible as the one arriving.
 */
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

/**
 * Play something suitable for `scene`, and make sure it is the only thing going. Idempotent per
 * scene — see `music-player.ts`, whose contract this matches exactly.
 */
export function playScene(scene: MusicScene): void {
    if (!browser()) return;
    if (currentScene === scene) return;

    const previous = currentTrack;

    // Still audible from a stop this scene has not finished leaving — so it is resumed rather
    // than replaced. Anything else is a fresh arrival and gets a fresh pick.
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

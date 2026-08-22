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
 */

/** Matches `music-player.ts`. Every loop is mastered to −18.8 LUFS, so one number covers all. */
const VOLUME = 0.2;

const elements = new Map<TrackId, HTMLAudioElement>();

let currentScene: MusicScene | null = null;
let currentTrack: TrackId | null = null;

/** Set once the browser has refused us audio, so we stop asking on every navigation. */
let unavailable = false;

/**
 * The shared output stage, or `null` if this browser has no Web Audio. Built once, lazily —
 * constructing an `AudioContext` before a gesture gets it a suspended one on some browsers and
 * a console warning on the rest.
 */
let output: { context: AudioContext, gain: GainNode } | null = null;
let outputBuilt = false;

function browser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function graph(): { context: AudioContext, gain: GainNode } | null {
    if (outputBuilt) return output;
    outputBuilt = true;

    try {
        const Ctor = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;

        const context = new Ctor();
        const gain = context.createGain();

        gain.gain.value = VOLUME;
        gain.connect(context.destination);

        output = { context, gain };
    } catch {
        output = null;
    }

    return output;
}

function trackElement(track: TrackId): HTMLAudioElement | undefined {
    if (unavailable) return undefined;

    const existing = elements.get(track);
    if (existing) return existing;

    try {
        // `require` of an `.m4a` is an asset reference, not a URL, on every platform. This is
        // the one thing that turns it into something `Audio` can be pointed at.
        const element = new Audio(Asset.fromModule(SOURCES[track]).uri);

        element.loop = true;
        element.preload = 'auto';

        const stage = graph();
        if (stage) {
            // Routed through the graph, the element's own volume is upstream of the gain and
            // would attenuate twice. The gain is the only thing holding the level.
            element.volume = 1;
            stage.context.createMediaElementSource(element).connect(stage.gain);
        } else {
            element.volume = VOLUME;
        }

        elements.set(track, element);

        return element;
    } catch {
        unavailable = true;

        return undefined;
    }
}

/**
 * A tab that is not being looked at should not be playing a game's music. Registered on the
 * first `playScene` rather than at import, because `document` does not exist during the static
 * pre-render.
 */
let watching = false;

function watchVisibility(): void {
    if (watching) return;
    watching = true;

    document.addEventListener('visibilitychange', () => {
        if (currentTrack === null) return;

        const element = elements.get(currentTrack);
        if (!element) return;

        try {
            if (document.hidden) element.pause();
            else void element.play().catch(() => { });
        } catch { }
    });
}

/**
 * Play something suitable for `scene`, and make sure it is the only thing going. Idempotent per
 * scene — see `music-player.ts`, whose contract this matches exactly.
 */
export function playScene(scene: MusicScene): void {
    if (!browser()) return;
    if (currentScene === scene) return;

    stopMusic();

    const track = pickTrack(scene);

    const element = trackElement(track);
    if (!element) return;

    currentScene = scene;
    currentTrack = track;

    watchVisibility();

    try {
        // Suspended until a gesture, and getting here took several. Harmless when already running.
        void output?.context.resume().catch(() => { });

        element.currentTime = 0;
        // Unlike the native player this hands back a promise, and a rejected one is an unhandled
        // rejection in the console rather than a thrown error. Swallowed here for the same
        // reason everything else is: the screen works without a soundtrack.
        void element.play().catch(() => { });
    } catch { }
}

/** Silence. */
export function stopMusic(): void {
    if (!browser()) return;

    if (currentTrack !== null) {
        try {
            elements.get(currentTrack)?.pause();
        } catch { }
    }

    currentScene = null;
    currentTrack = null;
}

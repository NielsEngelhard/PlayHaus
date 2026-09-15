import { Asset } from "expo-asset";

// The browser's one audio graph; media elements would take audio focus on Android and interrupt other apps on iOS.

// Low enough that a decoded music loop costs tens of megabytes rather than a hundred.
const SAMPLE_RATE = 22050;

// How long the graph may sit silent before it is suspended and the phone's audio session let go.
const IDLE_MS = 1500;

let ctx: AudioContext | null = null;
let built = false;

// Sources currently sounding, or about to be once their file has decoded.
let holders = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const buffers = new Map<number, Promise<AudioBuffer | null>>();

function browser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

// Safari's Audio Session API: `ambient` mixes with other apps' audio and respects the ringer switch.
function joinAmbientSession(): void {
    try {
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
        if (session) session.type = 'ambient';
    } catch { }
}

function resume(): void {
    if (!ctx || ctx.state === 'running' || document.hidden) return;

    void ctx.resume().catch(() => { });
}

function suspend(): void {
    if (!ctx || ctx.state !== 'running') return;

    void ctx.suspend().catch(() => { });
}

// The shared context, built on first use, or `null` where there is no browser or no Web Audio.
export function context(): AudioContext | null {
    if (built) return ctx;
    if (!browser()) return null;
    built = true;

    const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    joinAmbientSession();

    try {
        ctx = new Ctor({ sampleRate: SAMPLE_RATE });
    } catch {
        try {
            ctx = new Ctor();
        } catch {
            return null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) suspend();
        else if (holders > 0) resume();
    });

    // iOS only lets a context start from inside a gesture, and a scene change arrives a render after the tap.
    const unlock = () => {
        if (holders > 0) resume();
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('touchend', unlock, true);

    return ctx;
}

// Keep the graph running until the matching `release`.
export function hold(): void {
    holders++;

    if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }

    resume();
}

export function release(): void {
    holders = Math.max(0, holders - 1);
    if (holders > 0 || idleTimer !== null) return;

    idleTimer = setTimeout(() => {
        idleTimer = null;
        if (holders === 0) suspend();
    }, IDLE_MS);
}

// The decoded audio for a `require`d asset, fetched once and shared; `null` if it would not load.
export function loadBuffer(module: number): Promise<AudioBuffer | null> {
    const existing = buffers.get(module);
    if (existing) return existing;

    const graph = context();
    if (!graph) return Promise.resolve(null);

    const pending = (async () => {
        try {
            const response = await fetch(Asset.fromModule(module).uri);

            return await graph.decodeAudioData(await response.arrayBuffer());
        } catch {
            // Dropped so a later call gets a fresh try rather than this failure.
            buffers.delete(module);

            return null;
        }
    })();

    buffers.set(module, pending);

    return pending;
}

// Let go of a decoded file; anything still playing it keeps its own reference.
export function forgetBuffer(module: number): void {
    buffers.delete(module);
}

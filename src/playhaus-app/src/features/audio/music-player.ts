import { ensureAudioSession } from "@/utils/audio-session";
import { createAudioPlayer, type AudioPlayer, type AudioSource } from "expo-audio";

/**
 * The two background loops, and the machinery for having exactly one of them going.
 *
 * Split by platform, and the web half is a no-op — see `music-player.web.ts` for the four
 * separate reasons a browser cannot be handed a looping ambient track on page load.
 *
 * State lives at module scope rather than in the provider that drives it, for the same
 * reason `bubble-sound.ts` does: it makes the web half a two-line file, it keeps every
 * player out of the static pre-render, and it means Fast Refresh reloading the provider
 * does not leave a loop orphaned with nothing holding a handle to it.
 */

export type MusicTrack = 'zen' | 'action';

/**
 * `require` at module scope is safe on every platform — Metro resolves these to an asset
 * reference, and nothing here touches the audio APIs until `playMusic` is called.
 *
 * Both files are AAC rather than mp3: `AudioPlayer.loop` is not gapless, and an mp3's
 * encoder padding widens the seam at the loop point into something you can hear.
 */
const SOURCES: Record<MusicTrack, AudioSource> = {
    zen: require('@/assets/music/zen.m4a'),
    action: require('@/assets/music/action.m4a')
};

/**
 * Quiet. This is music nobody chose to put on, playing under a game they came for, and on
 * iOS it plays *on top of* whatever they were already listening to rather than pausing it
 * (see the `mixWithOthers` note in `audio-session.ts`). Both files were mastered to the
 * same loudness, so one number suits both.
 */
const VOLUME = 0.2;

const players = new Map<MusicTrack, AudioPlayer>();

/** Which loop is meant to be going, or nothing. */
let current: MusicTrack | null = null;

/** Set once a device has refused us a player, so we stop asking on every navigation. */
let unavailable = false;

function trackPlayer(track: MusicTrack): AudioPlayer | undefined {
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
 * Start a loop, and make sure it is the only one going. Idempotent: calling it for the
 * track already playing does nothing, which is what lets the caller drive it from an
 * effect without having to remember what it asked for last time.
 *
 * A player per track rather than one player whose source is swapped. `AudioPlayer.replace`
 * tears the underlying player down and builds a new one at the platform's defaults, which
 * on web means the loop comes back as a one-shot at full volume — and doing it mid-fade or
 * mid-navigation re-triggers playback. Two streamed AAC loops cost next to nothing.
 */
export function playMusic(track: MusicTrack): void {
    if (current === track) return;

    // Paused rather than rewound: coming back out of a game should pick the ambient loop
    // up where it was, not restart the same eight bars every time.
    pauseCurrent();

    const player = trackPlayer(track);
    if (!player) return;

    current = track;

    try {
        player.play();
    } catch {
        // Nothing above this cares. The screen works without a soundtrack.
    }
}

/** Silence, without forgetting where either loop had got to. */
export function stopMusic(): void {
    pauseCurrent();

    current = null;
}

function pauseCurrent(): void {
    if (current === null) return;

    try {
        players.get(current)?.pause();
    } catch { }
}

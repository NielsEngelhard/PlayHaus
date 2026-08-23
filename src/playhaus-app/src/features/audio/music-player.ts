import { FADE_MS, rampVolume, type Fade } from "@/features/audio/fade";
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
 *
 * Nothing here cuts. Every arrival, departure and handover is a ramp — see `fade.ts` for the
 * shape and the timing.
 */

/**
 * Quiet. This is music nobody chose to put on, playing under a game they came for, and on iOS it
 * plays *on top of* whatever they were already listening to rather than pausing it (see the
 * `mixWithOthers` note in `audio-session.ts`). Every loop is mastered to −18.8 LUFS, so one
 * number suits all of them.
 *
 * The ceiling a fade in climbs to, rather than a level anything is ever set to outright.
 */
const VOLUME = 0.2;

const players = new Map<TrackId, AudioPlayer>();

/**
 * Where each player's volume currently is.
 *
 * Kept here rather than read back off `player.volume`, because a fade has to know what level to
 * start from and the only thing that reliably knows is whoever wrote it last. Reading the
 * platform's own idea of it puts a bridge hop in the middle of every step.
 */
const levels = new Map<TrackId, number>();

/** Ramps in flight, so starting one on a track cancels the one it replaces. */
const fades = new Map<TrackId, Fade>();

/**
 * Which players are actually rolling.
 *
 * A track on its way out keeps playing until its fade reaches silence, so this is not the same
 * question as "which track is claimed" — and it is what lets a scene reclaimed mid-fade pick the
 * loop back up where it is instead of snapping it to the top.
 */
const running = new Set<TrackId>();

/**
 * The scene and track a fade out is still working through.
 *
 * Kept so that reclaiming the same scene before the fade lands picks that loop back up instead
 * of a different one — which is what muting and unmuting inside a game is, and getting a new
 * song out of a button labelled "unmute" is not what anybody pressed it for.
 */
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

        player.loop = true;
        // Silent until something fades it in. A player built at `VOLUME` would be a hard cut
        // waiting to happen the first time anything called `play` without a ramp.
        player.volume = 0;

        players.set(track, player);
        levels.set(track, 0);

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

/**
 * Ramp `track` to `to`, from wherever it is now, cancelling whatever ramp it was on.
 *
 * `onDone` runs only on arrival. A cancelled fade is one something else has taken over — firing
 * its tidy-up would pause a track that has just been asked to play again.
 */
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

    // Anything already rolling is a track being reclaimed mid-fade — muting and unmuting inside
    // a game, or a lobby retaken before its handover finished. Those only come back up from
    // where they got to; restarting the loop under someone who never left would be the cut this
    // all exists to avoid.
    if (!running.has(track)) {
        try {
            // From the top. Music is scoped to lobbies and games, so a claim on a track that is
            // not already going is somebody arriving somewhere — there is no journey to resume,
            // and starting a fresh pick partway through it would be a strange way to greet them.
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

/**
 * Play something suitable for `scene`, and make sure it is the only thing going.
 *
 * Idempotent *per scene*, which is the point: the provider calls this from an effect, and
 * guarding on the scene rather than the track means a re-render cannot reshuffle the music
 * under someone who has not gone anywhere.
 *
 * A player per track rather than one player whose source is swapped. `AudioPlayer.replace` tears
 * the underlying player down and builds a new one at the platform's defaults, so the loop comes
 * back as a one-shot at full volume — and a crossfade needs both tracks audible at once anyway,
 * which one player cannot do. Six streamed AAC loops cost next to nothing, and only the ones
 * actually picked are ever built.
 */
export function playScene(scene: MusicScene): void {
    if (currentScene === scene) return;

    const previous = currentTrack;

    // Still audible from a stop this scene has not finished leaving — so it is resumed rather
    // than replaced. Anything else is a fresh arrival and gets a fresh pick.
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

    // Both ramps run at once and cross in the middle — see the equal-power note in `fade.ts`,
    // which is what keeps the level steady through the handover instead of sagging.
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

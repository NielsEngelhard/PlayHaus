/**
 * Which loops exist, and which of them belong to which part of the app.
 *
 * Platform-agnostic on purpose, and imported by both halves of `music-player`. The table used
 * to live in the player itself, which meant the web half kept its own copy of the track union
 * and the two drifted the moment either changed.
 */

/**
 * Where the music is, rather than which track is playing.
 *
 * League of Letters is the only game with a soundtrack, and it has exactly two places worth
 * scoring — a room waiting to start, and a game being played. Callers claim the *place*;
 * picking the track from it is this module's job.
 */
export type MusicScene = 'lobby' | 'playing';

export type TrackId =
    | 'bossa'
    | 'adventure' | 'action' | 'chill' | 'sunny' | 'zen';

/**
 * `require` at module scope is safe on every platform — Metro resolves these to asset
 * references, and nothing here touches an audio API or a browser global.
 *
 * All six are AAC rather than mp3: `loop` is not gapless, and an mp3's encoder padding widens
 * the seam at the loop point into something you can hear. See `assets/music/CREDITS.md` for
 * where each one came from and what was done to make it loop.
 */
export const SOURCES: Record<TrackId, number> = {
    bossa: require('@/assets/music/bossa.m4a'),
    adventure: require('@/assets/music/adventure.m4a'),
    action: require('@/assets/music/action.m4a'),
    chill: require('@/assets/music/chill.m4a'),
    sunny: require('@/assets/music/sunny.m4a'),
    zen: require('@/assets/music/zen.m4a')
};

/**
 * One fixed loop for a room that is waiting, five to pick from for a game being played.
 *
 * The lobby is deliberately always the same track — it is the sound of the room, and a room
 * that greets you differently every time is a room you never learn. A game is the opposite:
 * five picks, so the same session twice running rarely sounds the same.
 */
export const PLAYLISTS: Record<MusicScene, readonly TrackId[]> = {
    lobby: ['bossa'],
    playing: ['adventure', 'action', 'chill', 'sunny', 'zen']
};

/** What each scene played last, so the next pick can avoid it. */
const lastPicked: Partial<Record<MusicScene, TrackId>> = {};

/**
 * A track for `scene`, at random, but never the one that scene played last.
 *
 * Remembered per scene rather than globally: a game repeating itself is the thing worth
 * avoiding, and a lobby track has no bearing on which game track is a fresh choice. A
 * one-track scene falls through the filter and simply always answers with its one track.
 */
export function pickTrack(scene: MusicScene): TrackId {
    const list = PLAYLISTS[scene];
    const last = lastPicked[scene];

    const options = last !== undefined && list.length > 1
        ? list.filter(id => id !== last)
        : list;

    const chosen = options[Math.floor(Math.random() * options.length)];
    lastPicked[scene] = chosen;

    return chosen;
}

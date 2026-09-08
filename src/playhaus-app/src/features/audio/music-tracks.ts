// Which loops exist, and which of them belong to which part of the app.

// Where the music is, rather than which track is playing.
export type MusicScene = 'lobby' | 'playing';

export type TrackId = | 'upBeat' | 'funkyJazz' | 'softJazz' | 'lobby' | 'softHouse';

// `require` at module scope is safe on every platform.
export const SOURCES: Record<TrackId, number> = {
    upBeat: require('@/assets/music/beatje.mp3'),
    funkyJazz: require('@/assets/music/funky-lol.mp3'),
    softJazz: require('@/assets/music/jazzy.mp3'),
    lobby: require('@/assets/music/lobby.mp3'),
    softHouse: require('@/assets/music/soft-house.mp3'),
};

// One fixed loop for a room that is waiting, five to pick from for a game being played.
export const PLAYLISTS: Record<MusicScene, readonly TrackId[]> = {
    lobby: ['lobby'],
    playing: ['upBeat', 'funkyJazz', 'softJazz', 'softHouse']
};

/** What each scene played last, so the next pick can avoid it. */
const lastPicked: Partial<Record<MusicScene, TrackId>> = {};

// A track for `scene`, at random, but never the one that scene played last.
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

// Whether `track` should loop forever under its own steam, rather than handing its ending off to a fresh `pickTrack` call.
export function loopsForever(track: TrackId): boolean {
    const scene = (Object.keys(PLAYLISTS) as MusicScene[]).find(s => PLAYLISTS[s].includes(track));

    return scene === undefined || PLAYLISTS[scene].length <= 1;
}

/**
 * Web half of the background music — see `music-player.ts` for the contract and for why
 * these are split at all.
 *
 * Music is native-only, and four separate things in the browser say so:
 *
 * - **Autoplay.** A loop that starts because a page mounted has no user gesture behind it,
 *   so Chrome and Safari refuse it. `expo-audio`'s web player drops the promise from
 *   `HTMLMediaElement.play()` on the floor, so the refusal surfaces as an uncatchable
 *   `NotAllowedError` in the console and the player then reports itself as playing.
 * - **Volume.** Apple does not let a page set the volume of an audio element, so the web
 *   player's `volume` setter is ignored on iOS Safari. A track meant for 20% would play at
 *   full — the one failure mode worse than no music at all.
 * - **Pre-render.** The web build is exported statically, which runs this code in Node,
 *   where the web player's constructor reaches for `new Audio` and `navigator`.
 * - **Nothing to pause it.** On a phone the native module pauses every player when the app
 *   goes to the background; a browser tab has no equivalent here.
 *
 * If it is ever wanted: the way in is to leave it stopped on load and re-check the wanted
 * track after the first press anywhere in the app, which is a real gesture and unlocks
 * playback. Not worth it for a loop nobody asked for.
 */

export type MusicTrack = 'zen' | 'action';

export function playMusic(_track: MusicTrack): void { }

export function stopMusic(): void { }

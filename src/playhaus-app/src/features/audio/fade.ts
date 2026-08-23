/**
 * Volume ramps, and the shape they follow.
 *
 * Music arriving at full volume the instant a page mounts is the thing this exists to stop: a
 * loop that cuts in reads as a bug even when it is the right loop, and a game starting under a
 * lobby is two hard cuts in one commit. Everything here is about the level only — what plays
 * and when is `music-player`'s business.
 *
 * Platform-agnostic, and used by the native player for every ramp and by the web player only
 * where a browser has no Web Audio to schedule the ramp for us.
 */

/** How long every fade takes — in, out, and both sides of a crossfade. */
export const FADE_MS = 1200;

/**
 * How often the level is written during a ramp.
 *
 * 25 a second. A volume ramp is not an animation — nobody can hear the difference between this
 * and 60, and on native every step crosses to the player's own thread.
 */
const STEP_MS = 40;

/** A ramp in flight. Cancelled by whoever started it, when something newer needs the same level. */
export type Fade = { cancel(): void };

/**
 * Equal-power shaping, which is what makes a crossfade hold its level through the middle.
 *
 * Two linear ramps crossing sum to about 3 dB less than either end — an audible sag right at
 * the handover. A sine going up against a cosine coming down sums to a constant instead, so
 * `sin` and `1 - cos` are the two halves of that pair: whichever direction this ramp is going,
 * the one it is crossing with follows the other.
 */
function shape(progress: number, rising: boolean): number {
    return rising
        ? Math.sin(progress * Math.PI / 2)
        : 1 - Math.cos(progress * Math.PI / 2);
}

/**
 * Walk `apply` from `from` to `to` over `ms`, and call `onDone` once it has arrived.
 *
 * The final value is written exactly rather than left to the last step's arithmetic — a fade
 * out that stops at 0.0003 is a player that never quite goes quiet.
 *
 * `onDone` does not run when the fade is cancelled: a cancelled fade is one something else has
 * taken over, and whatever it was going to do at silence is no longer wanted.
 */
export function rampVolume(
    apply: (volume: number) => void,
    from: number,
    to: number,
    ms: number,
    onDone?: () => void
): Fade {
    const rising = to > from;
    const started = Date.now();

    let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
        const progress = Math.min((Date.now() - started) / ms, 1);

        if (progress < 1) {
            apply(from + (to - from) * shape(progress, rising));

            return;
        }

        if (timer !== null) clearInterval(timer);
        timer = null;

        apply(to);
        onDone?.();
    }, STEP_MS);

    // The first step is a whole frame away, and for a fade in that frame is the old level still
    // playing — audible as a click at the head of a track that is supposed to arrive quietly.
    apply(from);

    return {
        cancel() {
            if (timer === null) return;

            clearInterval(timer);
            timer = null;
        }
    };
}

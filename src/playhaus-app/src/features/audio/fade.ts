// Volume ramps, and the shape they follow.

/** How long every fade takes — in, out, and both sides of a crossfade. */
export const FADE_MS = 1200;

// How often the level is written during a ramp. 25 a second.
const STEP_MS = 40;

/** A ramp in flight. Cancelled by whoever started it, when something newer needs the same level. */
export type Fade = { cancel(): void };

// Equal-power shaping, which is what makes a crossfade hold its level through the middle.
function shape(progress: number, rising: boolean): number {
    return rising
        ? Math.sin(progress * Math.PI / 2)
        : 1 - Math.cos(progress * Math.PI / 2);
}

// Walk `apply` from `from` to `to` over `ms`, and call `onDone` once it has arrived.
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

    // The first step is a whole frame away, and for a fade in that frame is the old level still playing.
    apply(from);

    return {
        cancel() {
            if (timer === null) return;

            clearInterval(timer);
            timer = null;
        }
    };
}

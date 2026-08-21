import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from "react-native";

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/**
 * A layout effect where there is a screen to paint, and a plain one where there is not.
 *
 * `output: "static"` prerenders every route in Node, and React warns about layout
 * effects there. Nothing this one does matters during a prerender anyway — there is no
 * navigation to replay.
 */
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * How much of the run the fade gets. The position keeps travelling after the opacity
 * has arrived, so the content is legible for most of its own entrance — a fade that
 * lasts the whole distance reads as haze rather than as movement.
 */
const FADE_FRACTION = 0.6;

interface Props {
    /**
     * Where the content starts, in px, relative to where it belongs. Negative is left
     * of it or above it. Leaving both off means no entrance at all — see `still`.
     */
    offsetX?: number
    offsetY?: number
    durationMs: number
    /** Held back by this much, for staggering two of these into one gesture. */
    delayMs?: number
    /**
     * Replays the entrance whenever this changes, for the one caller that cannot say it
     * with a `key`.
     *
     * The root layout wraps the router's `Slot`, and the router swaps the page in a
     * commit of its own — one *before* `usePathname` catches up. A key taken from the
     * path therefore lands a render late and tears down the page that has already
     * mounted, so every screen ran its opening request twice; in a room that meant the
     * discarded screen's join landing after the live one's, and its tidy-up handing the
     * player's seat straight back. Replaying leaves the page's identity to the router
     * alone.
     */
    replayKey?: string
    /** For layout — this component only adds the transform and the opacity. */
    style?: StyleProp<ViewStyle>
    children: ReactNode
}

/**
 * Slides and fades its content into place, once, when it mounts.
 *
 * Mount-only by default: callers retrigger the entrance by changing the `key`, which is
 * the same thing that makes the content new — a fresh round on a board. Tying the
 * animation to the remount rather than to a flag means the two can never disagree about
 * what is on screen, and there is no "animate back out" state to get stuck in.
 *
 * `replayKey` is the exception, for the one caller whose content is made new by somebody
 * else — see the prop.
 *
 * One primitive for both axes on purpose: a page arriving from the right and a round
 * rising from below should be the same motion pointed differently, not two easings that
 * almost match.
 */
export default function SlideFadeIn({ offsetX, offsetY, durationMs, delayMs, replayKey, style, children }: Props) {
    /**
     * Asked to travel nowhere, so there is nothing to play: this renders at rest and
     * stays there.
     *
     * Worth stating rather than letting a zero-distance slide run anyway, because the
     * fade would still be real. The app is exported as static HTML, and a page that
     * begins at `opacity: 0` is written into that HTML invisible — it would be blank
     * until the bundle had loaded, hydrated and animated, and blank for good if the
     * bundle never arrived. The first page of a session asks for no offset for exactly
     * this reason, so first paint has to be a full stop rather than a quick fade.
     */
    const still = !offsetX && !offsetY;

    // 0 is the starting corner, 1 is resting. One value drives both axes and the fade,
    // so they cannot drift apart. Lazily constructed — a `new Animated.Value` written
    // straight into the call would be rebuilt on every render and thrown away.
    const [progress] = useState(() => new Animated.Value(still ? 1 : 0));

    // Back to the starting corner, before the commit that changed `replayKey` is
    // painted — a plain effect would let the content appear at rest for a frame and
    // then jump back to start the slide. Nothing happens on mount, where the value
    // already starts there, or for the callers that replay with a `key` instead.
    useBeforePaint(() => {
        if (still) return;

        progress.setValue(0);
    }, [replayKey, still, progress]);

    useEffect(() => {
        if (still) return;

        let cancelled = false;
        let run: Animated.CompositeAnimation | undefined;

        // Checked rather than assumed, and awaited before starting: someone who has
        // asked the OS for less movement gets the content already in place, not a
        // shortened version of the same slide.
        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (cancelled) return;

            if (reduced) {
                progress.setValue(1);
                return;
            }

            run = Animated.timing(progress, {
                toValue: 1,
                duration: durationMs,
                delay: delayMs,
                // Decelerating. Content that leaves fast and arrives gently is what
                // reads as snappy; a symmetric ease makes the same distance feel slow.
                easing: Easing.out(Easing.cubic),
                useNativeDriver
            });

            run.start();
        });

        return () => {
            cancelled = true;
            run?.stop();
        };
        // The timings are read once by design — see the note above about this being
        // retriggered rather than following props as they change. `replayKey` is the one
        // thing that reruns it, and for every caller that leaves it off it never
        // changes, so this stays mount-only.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replayKey]);

    // An axis that was not asked for interpolates between zero and zero, which costs
    // nothing and keeps this a plain literal — the transform array is typed readonly,
    // so building it up conditionally is more trouble than the dead axis is worth.
    const travel = (distance: number) => progress.interpolate({
        inputRange: [0, 1],
        outputRange: [distance, 0]
    });

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: progress.interpolate({
                        inputRange: [0, FADE_FRACTION, 1],
                        outputRange: [0, 1, 1]
                    }),
                    transform: [
                        { translateX: travel(offsetX ?? 0) },
                        { translateY: travel(offsetY ?? 0) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    )
}

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from "react-native";

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

// A layout effect where there is a screen to paint, and a plain one where there is not.
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// How much of the run the fade gets.
const FADE_FRACTION = 0.6;

interface Props {
    // Where the content starts, in px, relative to where it belongs.
    offsetX?: number
    offsetY?: number
    durationMs: number
    /** Held back by this much, for staggering two of these into one gesture. */
    delayMs?: number
    // Replays the entrance whenever this changes, for the one caller that cannot say it with a `key`.
    replayKey?: string
    /** For layout — this component only adds the transform and the opacity. */
    style?: StyleProp<ViewStyle>
    children: ReactNode
}

// Slides and fades its content into place, once, when it mounts.
export default function SlideFadeIn({ offsetX, offsetY, durationMs, delayMs, replayKey, style, children }: Props) {
    // Asked to travel nowhere, so there is nothing to play: this renders at rest and stays there.
    const still = !offsetX && !offsetY;

    // 0 is the starting corner, 1 is resting.
    const [progress] = useState(() => new Animated.Value(still ? 1 : 0));

    // Back to the starting corner, before the commit that changed `replayKey` is painted.
    useBeforePaint(() => {
        if (still) return;

        progress.setValue(0);
    }, [replayKey, still, progress]);

    useEffect(() => {
        if (still) return;

        let cancelled = false;
        let run: Animated.CompositeAnimation | undefined;

        // Checked rather than assumed, and awaited before starting.
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
                // Decelerating.
                easing: Easing.out(Easing.cubic),
                useNativeDriver
            });

            run.start();
        });

        return () => {
            cancelled = true;
            run?.stop();
        };
        // The timings are read once by design.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replayKey]);

    // An axis that was not asked for interpolates between zero and zero, which costs nothing and keeps this a plain literal.
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

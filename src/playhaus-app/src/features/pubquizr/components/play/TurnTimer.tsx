import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { haptic } from "@/utils/haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, Platform, View } from "react-native";

interface Props {
    /** How long the turn is. */
    seconds: number
    /** Fired once, when it runs out. */
    onDone: () => void
}

/** The last stretch, where the bar turns and the digits start to matter. */
const HURRY_SECONDS = 10;

// react-native-web has no native animation module, and a transform is the one thing that
// is driver-safe everywhere else. Same reasoning as `NextRoundCountdown`.
const useNativeDriver = Platform.OS !== 'web';

/**
 * Thirty seconds, drawn as they go.
 *
 * Digits *and* a bar, which is one more than either of the app's other countdowns has.
 * They are for two different people: the describer is talking and will not read a number,
 * so the bar is what they catch out of the corner of an eye; the rest of the table is
 * watching the phone and wants to know whether to keep shouting. A round that ends in an
 * argument about whether time was up is the thing this is here to prevent.
 *
 * The clock is kept against a wall-clock deadline rather than by counting ticks down. An
 * interval that misses a beat — and it will, on a phone being waved about — would
 * otherwise make the turn quietly longer than the round says it is.
 *
 * `onDone` fires exactly once. It is held in a ref rather than listed as a dependency so
 * that a parent re-rendering mid-turn cannot restart the thirty seconds.
 */
export default function DescribeTimer({ seconds, onDone }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const [left, setLeft] = useState(seconds);
    const [width, setWidth] = useState(0);
    const [progress] = useState(() => new Animated.Value(0));

    // Kept in a ref, and updated from an effect rather than during render, so a parent
    // re-rendering mid-turn cannot restart the thirty seconds by handing the interval a
    // new callback to depend on.
    const done = useRef(onDone);
    useEffect(() => { done.current = onDone; }, [onDone]);

    useEffect(() => {
        const endsAt = Date.now() + seconds * 1000;
        let finished = false;

        const tick = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
            setLeft(remaining);

            if (remaining <= 0 && !finished) {
                finished = true;
                clearInterval(tick);
                // The phone is on a table in a noisy room and nobody is looking at it.
                // A buzz is the only channel left; there is no alarm sound in the app.
                haptic('land');
                done.current();
            }
        }, 250);

        return () => clearInterval(tick);
    }, [seconds]);

    useEffect(() => {
        if (width <= 0) return;

        progress.setValue(0);
        const run = Animated.timing(progress, {
            toValue: 1,
            duration: seconds * 1000,
            easing: Easing.linear,
            useNativeDriver
        });
        run.start();

        return () => run.stop();
    }, [progress, seconds, width]);

    const hurrying = left <= HURRY_SECONDS;
    const ink = hurrying ? theme.colors.destructive : theme.colors.text;

    return (
        <View style={styles.timer}>
            <AppText
                style={[styles.digits, { color: ink }]}
                // Read out as a whole, and only as it changes: a screen reader announcing
                // every quarter-second tick would be its own kind of noise.
                accessibilityLiveRegion="polite"
            >
                {left}
            </AppText>

            <View style={styles.track} onLayout={measure}>
                <Animated.View
                    style={[
                        styles.fill,
                        { backgroundColor: hurrying ? theme.colors.destructive : theme.colors.focus },
                        {
                            transform: [{
                                translateX: progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -width]
                                })
                            }]
                        }
                    ]}
                />
            </View>
        </View>
    )

    function measure(event: LayoutChangeEvent) {
        const next = event.nativeEvent.layout.width;
        setWidth(current => (current === next ? current : next));
    }
}

const useStyles = createThemedStyles(theme => ({
    timer: {
        flexShrink: 0,
        alignItems: 'center',
        gap: 10
    },

    // Tabular figures, so the number does not jitter sideways as it counts down.
    digits: {
        fontSize: 52,
        fontWeight: 900,
        letterSpacing: -2,
        fontVariant: ['tabular-nums']
    },

    track: {
        width: '100%',
        height: 12,
        overflow: 'hidden',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement
    },

    fill: {
        width: '100%',
        height: '100%'
    }
}))

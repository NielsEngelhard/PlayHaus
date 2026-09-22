import AppText from "@/components/text/AppText";
import { useNativeDriver } from "@/components/ui/usePressPop";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, type LayoutChangeEvent, View } from "react-native";

const DIGITS_SIZE = 44;
const BAR_HEIGHT = 12;
/** The last stretch, where the digits and the bar turn red. */
const HURRY_SECONDS = 10;
// The digits' hurry pulse, one way.
const PULSE_MS = 500;

interface Props {
    left: number
    seconds: number
    /** Beside the bar: "2 / 5". */
    trailing?: string
}

// The turn's clock as a watching phone draws it: the seconds, and a bar that runs out with them.
export default function BoardClock({ left, seconds, trailing }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const [width, setWidth] = useState(0);
    // 0 → 1 across the turn, driven by one smooth run rather than restarted every 250ms tick.
    const [progress] = useState(() => new Animated.Value(seconds > 0 ? 1 - left / seconds : 0));
    const [pulse] = useState(() => new Animated.Value(1));

    const hurry = left <= HURRY_SECONDS;
    const barFill = hurry ? theme.colors.destructive : Brand.lemon;

    useEffect(() => {
        if (width <= 0 || seconds <= 0) return;

        progress.setValue(1 - left / seconds);
        const run = Animated.timing(progress, {
            toValue: 1,
            duration: left * 1000,
            easing: Easing.linear,
            useNativeDriver
        });
        run.start();

        return () => run.stop();
        // Restarted only when a new turn hands this a new `seconds`; per-tick `left` just keeps the digits honest.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress, seconds, width]);

    useEffect(() => {
        if (!hurry) {
            pulse.setValue(1);
            return;
        }

        let cancelled = false;
        let loop: Animated.CompositeAnimation | undefined;

        AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
            if (cancelled || reduced) return;

            loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.05, duration: PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver }),
                    Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver })
                ])
            );
            loop.start();
        });

        return () => {
            cancelled = true;
            loop?.stop();
            pulse.setValue(1);
        };
    }, [hurry, pulse]);

    return (
        <View style={styles.clock}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <AppText style={[styles.digits, hurry && { color: theme.colors.destructive }]}>{left}</AppText>
            </Animated.View>

            <View style={styles.bar} onLayout={measure}>
                <Animated.View
                    style={[
                        styles.fill,
                        { backgroundColor: barFill },
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

            {trailing !== undefined && <AppText style={styles.trailing}>{trailing}</AppText>}
        </View>
    )

    function measure(event: LayoutChangeEvent) {
        const next = event.nativeEvent.layout.width;
        setWidth(current => (current === next ? current : next));
    }
}

const useStyles = createThemedStyles(theme => ({
    clock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },

    // Tabular figures, so the number does not jitter sideways as it counts down.
    digits: {
        minWidth: DIGITS_SIZE,
        fontSize: DIGITS_SIZE,
        fontWeight: 900,
        letterSpacing: -2,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },

    bar: {
        flex: 1,
        height: BAR_HEIGHT,
        overflow: 'hidden',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    fill: {
        width: '100%',
        height: '100%'
    },

    trailing: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    }
}))

import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { haptic } from "@/utils/haptics";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, LayoutChangeEvent, Platform, View } from "react-native";

// The digits' hurry pulse, one way.
const PULSE_MS = 500;

interface Props {
    /** How long the turn is. */
    seconds: number
    /** Fired once, when it runs out. */
    onDone: () => void
}

/** The last stretch, where the bar turns red. */
const HURRY_SECONDS = 10;

// react-native-web has no native animation module, and a transform is the one thing that is driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

// A turn's clock, drawn as it goes.
export default function TurnTimer({ seconds, onDone }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const [left, setLeft] = useState(seconds);
    const [width, setWidth] = useState(0);
    const [progress] = useState(() => new Animated.Value(0));
    const [pulse] = useState(() => new Animated.Value(1));

    // Kept in a ref, and updated from an effect rather than during render.
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

    useEffect(() => {
        if (!hurrying) {
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
    }, [hurrying, pulse]);

    return (
        <View style={styles.timer}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <AppText
                    style={[styles.digits, { color: ink }]}
                    // Read out as a whole, and only as it changes.
                    accessibilityLiveRegion="polite"
                >
                    {left}
                </AppText>
            </Animated.View>

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

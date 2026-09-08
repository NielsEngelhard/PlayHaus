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

// react-native-web has no native animation module, and a transform is the one thing that is driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

// A turn's clock, drawn as it goes.
export default function TurnTimer({ seconds, onDone }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const [left, setLeft] = useState(seconds);
    const [width, setWidth] = useState(0);
    const [progress] = useState(() => new Animated.Value(0));

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

    return (
        <View style={styles.timer}>
            <AppText
                style={[styles.digits, { color: ink }]}
                // Read out as a whole, and only as it changes.
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

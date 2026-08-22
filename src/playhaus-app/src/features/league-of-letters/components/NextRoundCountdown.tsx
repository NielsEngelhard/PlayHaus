import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useT } from "@/features/i18n/LanguageContext";
import { useEffect, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, Platform, StyleProp, View, ViewStyle } from "react-native";

interface Props {
    /** How long the wait is, so the bar drains over exactly it. */
    durationMs: number,
    /** What is being waited for. The last round of all is waiting for the uitslag. */
    label?: string,
    /** For layout only — how the countdown sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/**
 * The height of the large button this stands in for, so the board above keeps the size
 * it had while the keyboard was there instead of growing for one beat and shrinking back.
 */
const HEIGHT = 62;

// Same reasoning as in `GuessGrid`: react-native-web has no native animation module, and
// a transform is the one thing that is driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/**
 * The wait between rounds on a shared board, drawn as it runs down.
 *
 * Stands where "Volgende ronde" stands in solo, because on a shared board there is no
 * such button: five people each waiting for the other four to press on is a game that
 * stops between every round, so the table moves together and the only thing left to say
 * is how long the answer stays up. A bar rather than a number — three and a half seconds
 * counted out in digits reads as a deadline, and this is a breath, not a deadline.
 */
export default function NextRoundCountdown({ durationMs, label, style }: Props) {
    const styles = useStyles();
    const t = useT();

    const text = label ?? t('lol.game.nextRound');

    /** The track's width, which is how far the fill has to travel to leave it. */
    const [width, setWidth] = useState(0);

    function measure(event: LayoutChangeEvent) {
        const next = event.nativeEvent.layout.width;
        setWidth(current => (current === next ? current : next));
    }

    // Lazily constructed, the way every other animation in the app is: a bare
    // `new Animated.Value` in the body is a fresh one built on every render and thrown
    // away, and a ref would be a value read during render.
    const [progress] = useState(() => new Animated.Value(0));

    useEffect(() => {
        if (width <= 0) return;

        progress.setValue(0);
        const run = Animated.timing(progress, {
            toValue: 1,
            duration: durationMs,
            // Linear on purpose: the bar is standing in for a clock, and a clock that
            // eases out spends its last half-second pretending to have longer left.
            easing: Easing.linear,
            useNativeDriver
        });

        run.start();
        return () => run.stop();
    }, [width, durationMs, progress]);

    // Slid out of the track rather than resized: width is not a property the native
    // driver can animate, and a three-and-a-half-second layout animation on the one
    // screen that is already animating tiles is the frame budget spent on nothing.
    const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -width]
    });

    return (
        <View style={[styles.wrap, style]}>
            <AppText style={styles.label}>{text}</AppText>

            <View style={styles.track} onLayout={measure}>
                <Animated.View style={[styles.fill, { transform: [{ translateX }] }]} />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    wrap: {
        height: HEIGHT,
        justifyContent: 'center',
        gap: Spacing.one + 2
    },
    label: {
        textAlign: 'center',
        fontSize: FontSizes.xs,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    track: {
        height: 10,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement,
        // The fill leaves through the left edge, and this is what keeps it from being
        // drawn once it has.
        overflow: 'hidden'
    },
    fill: {
        // Inset rather than sized: the track is measured at whatever width the row
        // leaves it, and the fill is simply all of it.
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 999,
        backgroundColor: theme.colors.primary
    }
}))

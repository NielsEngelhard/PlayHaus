import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    /** The weekday, one letter per tile — "WED", or "WOE" to a Dutch reader. */
    letters: string,
    /** The promise under them. Newlines are honoured, since the design breaks it by hand. */
    caption: string,
    /** For layout only — where the stamp sits on the page. The look lives here. */
    style?: StyleProp<ViewStyle>
}

/** How far off square it sits. Enough to read as stuck on, not enough to read as broken. */
const TILT = '-8deg';

/** How much it swells, and how long one full breath takes. */
const SWELL = 1.06;
const BREATH_MS = 1800;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/**
 * The sticker on the corner of the page: a weekday spelled out in letter tiles, and the
 * standing promise under it.
 *
 * The same three tiles the games are built from, at a quarter of the size and turned a
 * few degrees off true — this is the app's own object rather than a badge borrowed from
 * somewhere else. It breathes rather than blinks, because it is saying something that is
 * true every week and not something that just happened.
 */
export default function WeeklyStamp({ letters, caption, style }: Props) {
    const styles = useStyles();

    // State rather than a ref because it is read while rendering, to build the
    // transform. The lazy initialiser is what stops a render restarting the breath.
    const [swell] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const breathe = Animated.loop(
            Animated.sequence([
                Animated.timing(swell, {
                    toValue: 1,
                    duration: BREATH_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(swell, {
                    toValue: 0,
                    duration: BREATH_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        breathe.start();

        return () => breathe.stop();
    }, [swell]);

    return (
        <Animated.View
            style={[
                styles.stamp,
                style,
                {
                    transform: [
                        { rotate: TILT },
                        {
                            scale: swell.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, SWELL]
                            })
                        }
                    ]
                }
            ]}
        >
            <View style={styles.letters}>
                {/* Spread rather than split, so a letter outside the basic alphabet
                    still arrives as one tile. */}
                {[...letters].map((letter, index) => (
                    <View key={index} style={styles.tile}>
                        <AppText style={styles.letter}>{letter}</AppText>
                    </View>
                ))}
            </View>

            <AppText style={styles.caption}>{caption}</AppText>
        </Animated.View>
    )
}

const useStyles = createThemedStyles(theme => {
    const dark = theme.scheme === 'dark';

    return {
        stamp: {
            paddingVertical: 9,
            paddingHorizontal: 12,
            borderRadius: 14,
            alignItems: 'center',
            backgroundColor: theme.colors.lemon,
            // Light cuts it out of the page with an ink line and drops it a hard
            // shadow. Dark has no line worth drawing at this size, so the sticker
            // lights the canvas under itself instead.
            ...(dark
                ? { boxShadow: '0 14px 26px -12px rgba(255, 229, 56, 0.6)' }
                : {
                    borderWidth: 2,
                    borderColor: theme.colors.border,
                    ...theme.shadows.hard
                })
        },

        letters: {
            flexDirection: 'row',
            gap: 3
        },

        // Ink and paper in both schemes: these sit on the lemon rather than on the
        // page, so they take their colours from it and not from the canvas.
        tile: {
            width: 19,
            height: 23,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: Brand.ink,
            backgroundColor: Brand.textOnAccent
        },

        letter: {
            fontSize: 11.5,
            fontWeight: 900,
            color: Brand.ink
        },

        caption: {
            marginTop: 6,
            fontSize: 10.5,
            lineHeight: 10.5 * 1.2,
            fontWeight: 900,
            textAlign: 'center',
            color: Brand.ink
        }
    }
});

import { usePageTone } from "@/components/layout/PageToneContext";
import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, Spacing } from "@/constants/theme";
import { handoffToneFor, type Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    /** Who has to take the phone. */
    person: Seat
    /** Who is handing it over, or null when nobody has held it yet. */
    from: Seat | null
    // Which fill this one wears, as a 1-based count of hand-offs.
    toneNumber: number
    /** The small uppercase line above the portrait — where in the game this is. */
    step: string
    /** The headline. Usually the name of whoever is taking the phone. */
    title: string
    /** What that person is about to do, in one line. */
    body: string
    /** The rule they need before they start, when the game has one to give. */
    note?: string
    /** The button. Phrasing it as a claim — the person's own name — is the point. */
    action: string
    onReady: () => void
}

/** How far the pair of avatars drifts, and how long one nudge takes. */
const NUDGE = 7;
const NUDGE_MS = 1200;

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

// The screen between two turns: stop, give the phone to somebody else.
export default function HandoffScreen({
    person,
    from,
    toneNumber,
    step,
    title,
    body,
    note,
    action,
    onReady
}: Props) {
    const styles = useStyles();

    const insets = useSafeAreaInsets();

    const tone = handoffToneFor(toneNumber);

    usePageTone(tone.fill);

    const [nudge] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(nudge, {
                    toValue: 1,
                    duration: NUDGE_MS / 2,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(nudge, {
                    toValue: 0,
                    duration: NUDGE_MS / 2,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        animation.start();

        return () => animation.stop();
    }, [nudge]);

    return (
        <View style={[styles.screen, { backgroundColor: tone.fill, paddingTop: insets.top }]}>
            <View style={styles.header} />

            <AppText style={[styles.step, { color: tone.muted }]}>
                {step}
            </AppText>

            <SeatAvatar seat={person} size={132} raised style={styles.portrait} />

            <AppText style={[styles.title, { color: tone.ink }]}>
                {title}
            </AppText>

            <AppText style={[styles.body, { color: tone.muted }]}>
                {body}
            </AppText>

            {/* The rule of the moment, on the one screen with room to say it properly. */}
            {note !== undefined && (
                <AppText style={[styles.rule, { color: tone.ink }]}>
                    {note}
                </AppText>
            )}

            {/* Only when there is somebody to hand over *from*. */}
            {from !== null && (
                <Animated.View
                    style={[
                        styles.pair,
                        {
                            transform: [{
                                translateX: nudge.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, NUDGE]
                                })
                            }]
                        }
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    <SeatAvatar seat={from} size={38} />

                    <Feather name="arrow-right" size={20} color={tone.ink} />

                    {/* The one being handed to is lifted off the page; the one letting go is not. */}
                    <SeatAvatar seat={person} size={38} raised />
                </Animated.View>
            )}

            <Pressable
                onPress={onReady}
                accessibilityRole="button"
                style={styles.button}
            >
                <AppText style={styles.buttonText}>
                    {action}
                </AppText>
            </Pressable>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Spacing.four + 4,
        paddingBottom: 26
    },
    header: {
        height: 58,
        flexShrink: 0
    },

    step: {
        marginTop: 60,
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        textAlign: 'center'
    },

    portrait: {
        marginTop: 26
    },

    title: {
        marginTop: 26,
        flexShrink: 0,
        fontSize: 38,
        fontWeight: 900,
        lineHeight: 38 * 1.02,
        letterSpacing: -1.5,
        textAlign: 'center'
    },

    body: {
        marginTop: 14,
        maxWidth: 270,
        flexShrink: 0,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 15 * 1.5,
        textAlign: 'center'
    },

    rule: {
        marginTop: 12,
        maxWidth: 270,
        flexShrink: 0,
        fontSize: 13.5,
        fontWeight: 800,
        lineHeight: 13.5 * 1.45,
        textAlign: 'center'
    },

    pair: {
        marginTop: 22,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    button: {
        marginTop: 'auto',
        width: '100%',
        height: 64,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.ink,
        boxShadow: '4px 4px 0 0 rgba(15, 13, 18, 0.2)'
    },

    buttonText: {
        fontSize: 17,
        fontWeight: 900,
        textAlign: 'center',
        color: Brand.textOnAccent
    }
}))

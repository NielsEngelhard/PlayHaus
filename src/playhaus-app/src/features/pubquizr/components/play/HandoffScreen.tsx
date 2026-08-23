import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/round-one";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";

interface Props {
    /** Who has to take the phone. */
    quizmaster: Seat
    /** Who is handing it over, or null on the very first question of the round. */
    from: Seat | null
    round: number
    number: number
    total: number
    onReady: () => void
}

/** How far the pair of avatars drifts, and how long one nudge takes. */
const NUDGE = 7;
const NUDGE_MS = 1200;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms are driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/**
 * The screen between two turns: stop, give the phone to somebody else.
 *
 * A whole screen rather than a banner, and lemon rather than the page's own canvas,
 * because it has one job — to be impossible to read past. The next screen has the
 * answers on it, so the moment the phone changes hands is the moment the game can be
 * spoiled, and a notice that could be scrolled past would eventually be scrolled past.
 *
 * The button says the new quizmaster's own name rather than "continue". Pressing it is
 * a claim about who is holding the phone, and phrasing it as one is what makes handing
 * it over first feel like the point rather than a step in the way.
 */
export default function HandoffScreen({
    quizmaster,
    from,
    round,
    number,
    total,
    onReady
}: Props) {
    const t = useT();
    const styles = useStyles();

    // Built once by the lazy initialiser: rebuilding it on a render would drop the
    // nudge back to its start mid-swing.
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
        <View style={styles.screen}>
            <View style={styles.header} />

            <AppText style={styles.step}>
                {t('pubquizr.play.handoff.step', { round, number, total })}
            </AppText>

            <View style={[styles.portrait, { backgroundColor: quizmaster.swatch.color }]}>
                <AppText style={[styles.portraitText, { color: quizmaster.swatch.foreground }]}>
                    {quizmaster.initials}
                </AppText>
            </View>

            <AppText style={styles.title}>
                {t('pubquizr.play.handoff.title', { name: quizmaster.name })}
            </AppText>

            <AppText style={styles.body}>
                {t('pubquizr.play.handoff.body', { name: quizmaster.name })}
            </AppText>

            {/* Only when there is somebody to hand over *from*. On the first question
                of the round nobody has held the phone yet, and an arrow out of an
                empty circle would be saying something that is not true. */}
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
                    <View style={[styles.small, { backgroundColor: from.swatch.color }]}>
                        <AppText style={[styles.smallText, { color: from.swatch.foreground }]}>
                            {from.initials}
                        </AppText>
                    </View>

                    <Feather name="arrow-right" size={20} color={Brand.ink} />

                    <View style={[styles.small, styles.smallTo, { backgroundColor: quizmaster.swatch.color }]}>
                        <AppText style={[styles.smallText, { color: quizmaster.swatch.foreground }]}>
                            {quizmaster.initials}
                        </AppText>
                    </View>
                </Animated.View>
            )}

            <Pressable
                onPress={onReady}
                accessibilityRole="button"
                style={styles.button}
            >
                <AppText style={styles.buttonText}>
                    {t('pubquizr.play.handoff.action', { name: quizmaster.name })}
                </AppText>
            </Pressable>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Lemon in both schemes. This screen is a stop sign, and a stop sign that changed
    // colour with the theme would be a weaker one.
    screen: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingBottom: 26,
        backgroundColor: theme.colors.lemon
    },

    // Stands in for the header the play screen has, so the two frames start their
    // content at the same height and the swap does not jump.
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
        textAlign: 'center',
        color: 'rgba(15, 13, 18, 0.55)'
    },

    portrait: {
        marginTop: 26,
        width: 132,
        height: 132,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        boxShadow: '4px 4px 0 0 rgba(15, 13, 18, 1)'
    },

    portraitText: {
        fontSize: 44,
        fontWeight: 900
    },

    title: {
        marginTop: 26,
        flexShrink: 0,
        fontSize: 38,
        fontWeight: 900,
        lineHeight: 38 * 1.02,
        letterSpacing: -1.5,
        textAlign: 'center',
        color: Brand.ink
    },

    body: {
        marginTop: 14,
        maxWidth: 270,
        flexShrink: 0,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 15 * 1.5,
        textAlign: 'center',
        color: 'rgba(15, 13, 18, 0.7)'
    },

    pair: {
        marginTop: 22,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    small: {
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },

    // The one being handed to is lifted off the page; the one letting go is not.
    smallTo: {
        boxShadow: '2px 2px 0 0 rgba(15, 13, 18, 1)'
    },

    smallText: {
        fontSize: 12,
        fontWeight: 900
    },

    // `marginTop: auto` pins this to the bottom edge, which works because the screen
    // is inside a page that claimed the whole viewport.
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
        borderWidth: theme.borderWidth,
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

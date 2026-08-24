import AppText from "@/components/text/AppText";
import { Brand, HeaderHeight, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { handoffToneFor, type Seat } from "@/features/pubquizr/round-one";
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
 * A whole screen rather than a banner, and a colour of its own rather than the page's
 * canvas, because it has one job — to be impossible to read past. The next screen has
 * the answers on it, so the moment the phone changes hands is the moment the game can
 * be spoiled, and a notice that could be scrolled past would eventually be scrolled
 * past. The fill changes every question (see `handoffToneFor`) so that the tenth
 * hand-off still registers as a new screen rather than as the one you just dismissed.
 *
 * It paints past the page's own gutters and up over the app header. Everything else in
 * the app is a card inside a 24dp inset under a 66dp header, and a stop sign framed by
 * both reads as another card — see the note on `screen` for how it escapes.
 *
 * Covering the header does mean its controls stop being tappable for as long as this is
 * up, which is the intended reading of a screen whose whole point is "stop here". The
 * board behind it still has its own way out.
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

    const tone = handoffToneFor(number);

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
        <View style={[styles.screen, { backgroundColor: tone.fill }]}>
            <View style={styles.header} />

            <AppText style={[styles.step, { color: tone.muted }]}>
                {t('pubquizr.play.handoff.step', { round, number, total })}
            </AppText>

            <View style={[styles.portrait, { backgroundColor: quizmaster.swatch.color }]}>
                <AppText style={[styles.portraitText, { color: quizmaster.swatch.foreground }]}>
                    {quizmaster.initials}
                </AppText>
            </View>

            <AppText style={[styles.title, { color: tone.ink }]}>
                {t('pubquizr.play.handoff.title', { name: quizmaster.name })}
            </AppText>

            <AppText style={[styles.body, { color: tone.muted }]}>
                {t('pubquizr.play.handoff.body', { name: quizmaster.name })}
            </AppText>

            {/* The round's rule, on the one screen with room to say it properly. The
                board says the short version every turn; this is where the whole of it
                fits — and whoever is about to take the phone is exactly who needs to
                know how the next few questions score. */}
            <AppText style={[styles.rule, { color: tone.ink }]}>
                {t('pubquizr.play.handoff.rule')}
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

                    <Feather name="arrow-right" size={20} color={tone.ink} />

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

const useStyles = createThemedStyles(() => ({
    /**
     * Painted past the page's gutters, and up over the header.
     *
     * The 24dp inset and the 24dp bottom pad belong to the one scroller in
     * `app/_layout.tsx`, and the header above is a sibling of the whole page slot —
     * three things every page shares and no page can reach. So this pulls back out of
     * all of them with negative margins and lays its own padding down inside, which is
     * what lets the fill cover the strip while everything below stays where it was.
     *
     * `paddingTop` matching `marginTop` is the whole trick: the background grows into
     * the header's 66dp, the content does not move into it.
     *
     * Sideways the result is edge-to-edge on a phone and edge-to-edge within the app's
     * 600dp column on a wide window, which is the right answer there — a colour running
     * wider than the app itself would look like the page had broken rather than like a
     * deliberate full-bleed.
     *
     * One seam is left, and it is not worth chasing: `SlideFadeIn` fades the page slot
     * in over ~130ms on entrance, so the header shows through this for that long the
     * first time the screen opens. It replays on the pathname only, and every hand-off
     * after the first is a frame swap inside one mounted route, so it happens once on
     * arrival rather than every turn.
     */
    screen: {
        flex: 1,
        alignItems: 'center',
        marginTop: -HeaderHeight,
        marginHorizontal: -Spacing.four,
        marginBottom: -Spacing.four,
        paddingTop: HeaderHeight,
        paddingHorizontal: Spacing.four + 4,
        paddingBottom: 26
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
        textAlign: 'center'
    },

    // The portrait keeps the player's own swatch rather than the screen's tone, so it
    // still says who even when the two happen to be the same colour — the hard ink
    // line round it is what keeps it legible in that case.
    portrait: {
        marginTop: 26,
        width: 132,
        height: 132,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
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

    // Full-strength ink where the line above it is muted: this is the rule of the
    // round rather than a caption about the hand-off, and the two should not read as
    // the same kind of sentence.
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

    small: {
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
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

    // Ink fill in every tone. It is the one control on the screen, and a button that
    // changed colour with the background would stop being obviously the way out.
    // `marginTop: auto` pins it to the bottom edge, which works because the page has
    // claimed the whole viewport.
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
